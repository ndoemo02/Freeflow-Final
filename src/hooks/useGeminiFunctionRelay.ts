/**
 * useGeminiFunctionRelay
 *
 * Client-side adapter: intercepts Gemini Live FunctionCall events and relays
 * them to our WS gateway (GeminiLiveGateway), then returns the FunctionResponse
 * to Gemini.
 *
 * Architecture: client-side relay (Model A from Faza 3A plan)
 *   [Gemini Live SDK]
 *     → FunctionCall event
 *     → relay() sends { type:"tool_call", tool, args, request_id } to our WS
 *     → waits for { type:"tool_result", request_id }
 *     → returns { name, response } for Gemini FunctionResponse
 *
 * Contracts preserved:
 *   - useActionDispatcher untouched
 *   - useConversationStore untouched
 *   - backend ToolRouter interface untouched
 *   - WS message format untouched
 */

import { useCallback, useRef } from 'react';
import { useLiveUiSessionStore } from '../state/liveUiSession';
import { getApiUrl } from '../lib/config';
import { postBridgeTelemetry } from '../lib/interactionBridge';
import { getAccessToken } from '../lib/supabase';
import { getActiveDemoContextPayload } from '../lib/demoContext';
import { awaitTurnTranscriptEvidence } from '../lib/liveTranscriptEvidence';

const RELAY_TIMEOUT_MS = 15000;
const GPS_CACHE_TTL_MS = 2 * 60 * 1000;
const GPS_STALE_FALLBACK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const GPS_PERSIST_KEY = 'ff_last_gps';
let _relayGpsCache: { lat: number; lng: number; ts: number } | null = null;

function readPersistedGps(): { lat: number; lng: number; ts: number } | null {
    try {
        const raw = localStorage.getItem(GPS_PERSIST_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { lat?: unknown; lng?: unknown; ts?: unknown };
        const lat = Number(parsed?.lat);
        const lng = Number(parsed?.lng);
        const ts = Number(parsed?.ts);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(ts)) return null;
        return { lat, lng, ts };
    } catch {
        return null;
    }
}

function persistGps(lat: number, lng: number): void {
    try {
        localStorage.setItem(GPS_PERSIST_KEY, JSON.stringify({ lat, lng, ts: Date.now() }));
    } catch {
        // noop
    }
}

function safeJsonParse(raw: string) {
    try { return JSON.parse(raw); } catch { return null; }
}

function normalizeLoose(value: unknown): string {
    return String(value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function transcriptSuggestsNearbyWithoutExplicitLocation(transcript: string | undefined, location: unknown): boolean {
    const t = normalizeLoose(transcript || '');
    if (!t) return false;
    const hasNearbyCue = /\b(w poblizu|poblizu|blisko|obok|nearby)\b/.test(t);
    if (!hasNearbyCue) return false;

    const loc = normalizeLoose(location || '');
    if (!loc) return true;
    return !t.includes(loc);
}

function postRelayDiag(
    stage: string,
    sessionId: string | undefined,
    turnId: string | undefined,
    startedAt: number | null,
    metadata: Record<string, unknown>,
): void {
    const sid = String(sessionId || '').trim() || 'unknown';
    try {
        postBridgeTelemetry([{
            stage,
            session_id: sid,
            turn_id: String(turnId || ''),
            ms: startedAt ? Math.max(0, Date.now() - startedAt) : 0,
            metadata,
        }]);
    } catch {
        // telemetry must never affect live flow
    }
}

async function getRelayGPSCoords(): Promise<{ lat: number; lng: number } | null> {
    const now = Date.now();
    if (_relayGpsCache && now - _relayGpsCache.ts < GPS_CACHE_TTL_MS) {
        return { lat: _relayGpsCache.lat, lng: _relayGpsCache.lng };
    }
    const persisted = readPersistedGps();
    const persistedAge = persisted ? (now - persisted.ts) : Number.POSITIVE_INFINITY;
    const hasPersistedFresh = persistedAge < GPS_CACHE_TTL_MS;
    const hasPersistedStaleFallback = persistedAge < GPS_STALE_FALLBACK_MAX_AGE_MS;

    if (persisted && hasPersistedFresh) {
        _relayGpsCache = persisted;
        return { lat: persisted.lat, lng: persisted.lng };
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
        if (persisted && hasPersistedStaleFallback) {
            _relayGpsCache = persisted;
            return { lat: persisted.lat, lng: persisted.lng };
        }
        return null;
    }
    return new Promise((resolve) => {
        let settled = false;
        const timeoutMs = 3500;
        const tid = window.setTimeout(() => {
            if (settled) return;
            settled = true;
            if (persisted && hasPersistedStaleFallback) {
                _relayGpsCache = persisted;
                resolve({ lat: persisted.lat, lng: persisted.lng });
                return;
            }
            resolve(null);
        }, timeoutMs);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(tid);
                const lat = Number(pos.coords.latitude);
                const lng = Number(pos.coords.longitude);
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    _relayGpsCache = { lat, lng, ts: Date.now() };
                    persistGps(lat, lng);
                    resolve({ lat, lng });
                    return;
                }
                resolve(null);
            },
            () => {
                if (settled) return;
                settled = true;
                window.clearTimeout(tid);
                if (persisted && hasPersistedStaleFallback) {
                    _relayGpsCache = persisted;
                    resolve({ lat: persisted.lat, lng: persisted.lng });
                    return;
                }
                resolve(null);
            },
            { enableHighAccuracy: false, maximumAge: 120000, timeout: timeoutMs },
        );
    });
}

/** Shape of a Gemini FunctionCall part */
export interface GeminiFunctionCall {
    /** Gemini call id (used as request_id for correlation) */
    id?: string;
    name: string;
    args: Record<string, unknown>;
    /** Per-turn ID for telemetry correlation (InteractionBridge) */
    turnId?: string;
}

/** Shape returned to Gemini as FunctionResponse */
export interface GeminiFunctionResponse {
    name: string;
    response: unknown;
}

export interface UseGeminiFunctionRelayOptions {
    /** Ref to the live WebSocket connection managed by useLiveEvents */
    wsRef: React.MutableRefObject<WebSocket | null>;
    /** Optional provider for latest user transcript */
    getLatestTranscript?: () => string | null;
    /** Optional provider that returns and clears latest transcript */
    takeLatestTranscript?: () => string | null;
    /** Same-turn transcript provider. It must never return text from another turn. */
    getTranscriptForTurn?: (turnId?: string) => string | null;
    /** Session ID — required for HTTP fallback when WS is unavailable (Vercel mode) */
    getSessionId?: () => string | undefined;
    /** Current restaurant ID from store — enriches add_item_to_cart args so backend never loses scope */
    getCurrentRestaurantId?: () => string | undefined;
}

// HTTP fallback: POST /api/voice/live/tool-call (Vercel serverless)
async function relayViaHttp(
    functionCall: GeminiFunctionCall,
    sessionId: string | undefined,
    transcript: string | undefined,
    currentRestaurantId: string | undefined,
): Promise<GeminiFunctionResponse> {
    const effectiveSessionId = String(sessionId ?? '').trim();
    if (!effectiveSessionId) {
        const err = new Error('relay_http_missing_session_id');
        console.error(`[LiveDiag] ❌ relay HTTP ABORT: no sessionId for ${functionCall.name} — cannot call tool-call without session`);
        throw err;
    }

    const url = getApiUrl('/api/voice/live/tool-call');
    const enrichedArgs: Record<string, unknown> = { ...(functionCall.args || {}) };

    // ── GPS enrichment for find_nearby (mirrors WS path relay function) ──
    if (functionCall.name === 'find_nearby') {
        const nearbyGpsOnly = transcriptSuggestsNearbyWithoutExplicitLocation(transcript, enrichedArgs.location);
        if (nearbyGpsOnly && Number.isFinite(Number(enrichedArgs.lat)) && Number.isFinite(Number(enrichedArgs.lng))) {
            delete enrichedArgs.location;
        }

        const latPresent = Number.isFinite(Number(enrichedArgs.lat));
        const lngPresent = Number.isFinite(Number(enrichedArgs.lng));
        if (!latPresent || !lngPresent) {
            const coords = await getRelayGPSCoords();
            if (coords) {
                enrichedArgs.lat = coords.lat;
                enrichedArgs.lng = coords.lng;
            }
        }
    }

    // ── Restaurant scope enrichment for cart tools ──
    // When user cleared the cart manually, Gemini may omit restaurant_id.
    // Inject currentRestaurant from the store so backend never loses scope.
    const isCartTool = functionCall.name === 'add_item_to_cart' || functionCall.name === 'add_items_to_cart';
    if (isCartTool && !enrichedArgs.restaurant_id && !enrichedArgs.restaurantId && currentRestaurantId) {
        enrichedArgs.restaurant_id = currentRestaurantId;
    }

    const body: Record<string, unknown> = {
        session_id: effectiveSessionId,
        demo_context: getActiveDemoContextPayload(),
        tool: functionCall.name,
        args: enrichedArgs,
        request_id: functionCall.id || `httprelay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        turn_id: functionCall.turnId || undefined,
    };
    if (transcript) body.transcript = transcript;

    const requestId = String(body.request_id || '');
    const relayStartedAt = Date.now();
    postRelayDiag('live_relay_http_send', effectiveSessionId, functionCall.turnId, null, {
        tool: functionCall.name,
        request_id: requestId,
        args_keys: Object.keys(enrichedArgs).sort(),
        transcript_present: Boolean(transcript),
        has_gps: Number.isFinite(Number(enrichedArgs.lat)) && Number.isFinite(Number(enrichedArgs.lng)),
    });

    const accessToken = await getAccessToken();
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        let errBody: { error?: string; message?: string; reason?: string } = {};
        try { errBody = await res.json(); } catch { /* noop */ }
        const detail = errBody.error || errBody.message || errBody.reason || `HTTP ${res.status}`;
        console.error(`[LiveDiag] ❌ relay HTTP ${res.status}: ${detail}  (tool=${functionCall.name} sessionId=${effectiveSessionId.slice(0, 8)}...)`);
        postRelayDiag('live_relay_http_error', effectiveSessionId, functionCall.turnId, relayStartedAt, {
            tool: functionCall.name,
            request_id: requestId,
            status: res.status,
            detail: String(detail).slice(0, 80),
        });
        throw new Error(detail);
    }

    const data = await res.json();
    // ToolRouter wraps: { ok, tool, request_id, response: inner, trace }
    // WS Gateway sends msg.response = inner — unwrap here so HTTP & WS paths
    // both receive the same inner response shape (with menu, restaurants, etc.)
    const inner = (data?.response && typeof data.response === 'object' && !Array.isArray(data.response))
        ? data.response
        : data;
    postRelayDiag('live_relay_http_response', effectiveSessionId, functionCall.turnId, relayStartedAt, {
        tool: functionCall.name,
        request_id: requestId,
        ok: data?.ok !== false,
        restaurants_count: Array.isArray((inner as any)?.restaurants) ? (inner as any).restaurants.length : 0,
        menu_count: Array.isArray((inner as any)?.menu || (inner as any)?.menuItems) ? ((inner as any).menu || (inner as any).menuItems).length : 0,
        intent: (inner as any)?.intent || null,
    });
    return { name: functionCall.name, response: inner };
}

export interface UseGeminiFunctionRelayResult {
    /**
     * Relay a single Gemini FunctionCall to ToolRouter.
     * Uses WS when connected, falls back to HTTP POST /api/voice/live/tool-call (Vercel).
     * Resolves with the FunctionResponse payload for Gemini.
     * Rejects on timeout or tool_error.
     */
    relay: (functionCall: GeminiFunctionCall) => Promise<GeminiFunctionResponse>;
    /**
     * Relay multiple FunctionCalls in parallel (Gemini can batch them).
     * Safe because read-only tools and single cart-mutating tools are handled
     * by ICM/FSM on the backend — parallel idempotent reads are fine.
     */
    relayAll: (functionCalls: GeminiFunctionCall[]) => Promise<GeminiFunctionResponse[]>;
}

export function useGeminiFunctionRelay({
    wsRef,
    getLatestTranscript,
    takeLatestTranscript,
    getTranscriptForTurn,
    getSessionId,
    getCurrentRestaurantId,
}: UseGeminiFunctionRelayOptions): UseGeminiFunctionRelayResult {
    const pendingRef = useRef<Map<string, {
        resolve: (value: GeminiFunctionResponse) => void;
        reject: (reason: Error) => void;
        timer: ReturnType<typeof setTimeout>;
        startedAt: number;
        tool: string;
        sessionId: string;
        turnId?: string;
    }>>(new Map());

    // Attach a single shared message listener the first time relay is called.
    // Subsequent calls reuse the same listener (idempotent via the Set check).
    const listenerAttached = useRef(false);

    const ensureListener = useCallback(() => {
        const ws = wsRef.current;
        if (!ws || listenerAttached.current) return;

        const handleMessage = (event: MessageEvent) => {
            const msg = safeJsonParse(typeof event.data === 'string' ? event.data : '');
            if (!msg?.request_id) return;

            const pending = pendingRef.current.get(msg.request_id);
            if (!pending) return;

            if (msg.type === 'tool_result' || msg.type === 'tool_error') {
                clearTimeout(pending.timer);
                pendingRef.current.delete(msg.request_id);

                if (msg.type === 'tool_error') {
                    postRelayDiag('live_relay_ws_error', pending.sessionId, pending.turnId, pending.startedAt, {
                        tool: pending.tool,
                        request_id: String(msg.request_id || ''),
                        detail: String(msg.error || 'tool_error').slice(0, 80),
                    });
                    pending.reject(new Error(msg.error || 'tool_error'));
                } else {
                    postRelayDiag('live_relay_ws_response', pending.sessionId, pending.turnId, pending.startedAt, {
                        tool: pending.tool,
                        request_id: String(msg.request_id || ''),
                        restaurants_count: Array.isArray(msg.response?.restaurants) ? msg.response.restaurants.length : 0,
                        menu_count: Array.isArray(msg.response?.menu || msg.response?.menuItems) ? (msg.response.menu || msg.response.menuItems).length : 0,
                        intent: msg.response?.intent || null,
                    });
                    pending.resolve({
                        name: msg.tool,
                        response: msg.response ?? { ok: msg.ok },
                    });
                }
            }
        };

        ws.addEventListener('message', handleMessage);
        listenerAttached.current = true;

        // Clean up when ws closes
        ws.addEventListener('close', () => {
            listenerAttached.current = false;
            // Reject all pending relays
            for (const [id, pending] of pendingRef.current.entries()) {
                clearTimeout(pending.timer);
                pending.reject(new Error('ws_closed'));
                pendingRef.current.delete(id);
            }
        }, { once: true });
    }, [wsRef]);

    const relay = useCallback(async (functionCall: GeminiFunctionCall): Promise<GeminiFunctionResponse> => {
        const liveUiStore = useLiveUiSessionStore.getState();
        const readTranscript = (turnId?: string): string | null => {
            if (getTranscriptForTurn && turnId) {
                return getTranscriptForTurn(turnId);
            }
            return takeLatestTranscript?.() || getLatestTranscript?.() || null;
        };
        const transcript = await awaitTurnTranscriptEvidence({
            toolName: functionCall.name,
            turnId: functionCall.turnId,
            read: readTranscript,
        });
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            // HTTP fallback — Vercel serverless nie wspiera WebSocket
            const sid = getSessionId?.();
            const currentRestaurantId = getCurrentRestaurantId?.();
            return relayViaHttp(functionCall, sid, transcript || undefined, currentRestaurantId);
        }

        ensureListener();

        const requestId = functionCall.id || `relay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const wsRelayStartedAt = Date.now();
        const wsSessionId = getSessionId?.() || 'unknown';

        return new Promise<GeminiFunctionResponse>((resolve, reject) => {
            const timer = setTimeout(() => {
                pendingRef.current.delete(requestId);
                // ── DIAG: timeout ─────────────────────────────────────
                console.error(`[LiveDiag] ⏱ relay TIMEOUT for ${functionCall.name}  req:${requestId}`);
                // ──────────────────────────────────────────────────────
                postRelayDiag('live_relay_ws_error', wsSessionId, functionCall.turnId, wsRelayStartedAt, {
                    tool: functionCall.name,
                    request_id: requestId,
                    detail: 'relay_timeout',
                });
                reject(new Error('relay_timeout'));
            }, RELAY_TIMEOUT_MS);

            pendingRef.current.set(requestId, {
                resolve,
                reject,
                timer,
                startedAt: wsRelayStartedAt,
                tool: functionCall.name,
                sessionId: wsSessionId,
                turnId: functionCall.turnId,
            });
            const latestTranscript = transcript || undefined;
            liveUiStore.setProcessing('Analizuję...', functionCall.name);
            if (latestTranscript) {
                liveUiStore.setTranscript('user', latestTranscript);
            }
            void (async () => {
                const enrichedArgs: Record<string, unknown> = { ...(functionCall.args || {}) };
                if (functionCall.name === 'find_nearby') {
                    const nearbyGpsOnly = transcriptSuggestsNearbyWithoutExplicitLocation(latestTranscript, enrichedArgs.location);
                    if (nearbyGpsOnly && Number.isFinite(Number(enrichedArgs?.lat)) && Number.isFinite(Number(enrichedArgs?.lng))) {
                        delete enrichedArgs.location;
                    }

                    const latPresent = Number.isFinite(Number(enrichedArgs?.lat));
                    const lngPresent = Number.isFinite(Number(enrichedArgs?.lng));
                    if (!latPresent || !lngPresent) {
                        const coords = await getRelayGPSCoords();
                        if (coords) {
                            enrichedArgs.lat = coords.lat;
                            enrichedArgs.lng = coords.lng;
                        }
                    }
                }

                // Enrich cart tools with restaurant_id from store when model omits it.
                // Prevents lost restaurant context after manual cart clear in UI.
                const isCartTool = functionCall.name === 'add_item_to_cart' || functionCall.name === 'add_items_to_cart';
                if (isCartTool && !enrichedArgs.restaurant_id && !enrichedArgs.restaurantId) {
                    const currentRestaurantId = getCurrentRestaurantId?.();
                    if (currentRestaurantId) {
                        enrichedArgs.restaurant_id = currentRestaurantId;
                        console.log(`[LIVE_WS_RESTAURANT_ENRICH] ${functionCall.name} restaurant_id=${currentRestaurantId}`);
                    }
                }

                if (ws.readyState !== WebSocket.OPEN) {
                    clearTimeout(timer);
                    pendingRef.current.delete(requestId);
                    postRelayDiag('live_relay_ws_error', wsSessionId, functionCall.turnId, wsRelayStartedAt, {
                        tool: functionCall.name,
                        request_id: requestId,
                        detail: 'ws_not_connected',
                    });
                    reject(new Error('ws_not_connected'));
                    return;
                }

                postRelayDiag('live_relay_ws_send', wsSessionId, functionCall.turnId, null, {
                    tool: functionCall.name,
                    request_id: requestId,
                    args_keys: Object.keys(enrichedArgs).sort(),
                    transcript_present: Boolean(latestTranscript),
                    has_gps: Number.isFinite(Number(enrichedArgs.lat)) && Number.isFinite(Number(enrichedArgs.lng)),
                });
                ws.send(JSON.stringify({
                    type: 'tool_call',
                    tool: functionCall.name,
                    args: enrichedArgs,
                    request_id: requestId,
                    turn_id: functionCall.turnId || undefined,
                    transcript_final: latestTranscript,
                }));
            })();
        });
    }, [wsRef, ensureListener, getLatestTranscript, takeLatestTranscript, getTranscriptForTurn, getSessionId, getCurrentRestaurantId]);

    const relayAll = useCallback(
        (functionCalls: GeminiFunctionCall[]) => Promise.all(functionCalls.map(relay)),
        [relay],
    );

    return { relay, relayAll };
}

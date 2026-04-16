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

const RELAY_TIMEOUT_MS = 9000;
const GPS_CACHE_TTL_MS = 5 * 60 * 1000;
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

async function getRelayGPSCoords(): Promise<{ lat: number; lng: number } | null> {
    if (_relayGpsCache && Date.now() - _relayGpsCache.ts < GPS_CACHE_TTL_MS) {
        return { lat: _relayGpsCache.lat, lng: _relayGpsCache.lng };
    }
    const persisted = readPersistedGps();
    if (persisted && Date.now() - persisted.ts < GPS_CACHE_TTL_MS) {
        _relayGpsCache = persisted;
        return { lat: persisted.lat, lng: persisted.lng };
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    return new Promise((resolve) => {
        let settled = false;
        const timeoutMs = 3500;
        const tid = window.setTimeout(() => {
            if (!settled) {
                settled = true;
                resolve(null);
            }
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
}

export interface UseGeminiFunctionRelayResult {
    /**
     * Relay a single Gemini FunctionCall to ToolRouter via WS.
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
}: UseGeminiFunctionRelayOptions): UseGeminiFunctionRelayResult {
    const pendingRef = useRef<Map<string, {
        resolve: (value: GeminiFunctionResponse) => void;
        reject: (reason: Error) => void;
        timer: ReturnType<typeof setTimeout>;
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
                    pending.reject(new Error(msg.error || 'tool_error'));
                } else {
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

    const relay = useCallback((functionCall: GeminiFunctionCall): Promise<GeminiFunctionResponse> => {
        const liveUiStore = useLiveUiSessionStore.getState();
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            // ── DIAG: WS not ready ────────────────────────────────────
            console.error(`[LiveDiag] ❌ relay: WS not connected (readyState=${ws?.readyState ?? 'null'}) for tool=${functionCall.name}`);
            // ──────────────────────────────────────────────────────────
            return Promise.reject(new Error('ws_not_connected'));
        }

        ensureListener();

        const requestId = functionCall.id || `relay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        // ── DIAG: WS send ─────────────────────────────────────────────
        console.log(`[LiveDiag] 🔀 relay WS.send: ${functionCall.name}  req:${requestId}  ws:${ws.readyState}`);
        // ──────────────────────────────────────────────────────────────

        return new Promise<GeminiFunctionResponse>((resolve, reject) => {
            const timer = setTimeout(() => {
                pendingRef.current.delete(requestId);
                // ── DIAG: timeout ─────────────────────────────────────
                console.error(`[LiveDiag] ⏱ relay TIMEOUT for ${functionCall.name}  req:${requestId}`);
                // ──────────────────────────────────────────────────────
                reject(new Error('relay_timeout'));
            }, RELAY_TIMEOUT_MS);

            pendingRef.current.set(requestId, { resolve, reject, timer });
            const latestTranscript = takeLatestTranscript?.() || getLatestTranscript?.() || undefined;
            liveUiStore.setProcessing('Analizuje...', functionCall.name);
            if (latestTranscript) {
                liveUiStore.setTranscript('user', latestTranscript);
            }
            void (async () => {
                const enrichedArgs: Record<string, unknown> = { ...(functionCall.args || {}) };
                if (functionCall.name === 'find_nearby') {
                    const nearbyGpsOnly = transcriptSuggestsNearbyWithoutExplicitLocation(latestTranscript, enrichedArgs.location);
                    if (nearbyGpsOnly && Number.isFinite(Number(enrichedArgs?.lat)) && Number.isFinite(Number(enrichedArgs?.lng))) {
                        delete enrichedArgs.location;
                        console.log('[LIVE_GPS_ONLY] nearby cue detected, dropping model location in favor of GPS');
                    }

                    const latPresent = Number.isFinite(Number(enrichedArgs?.lat));
                    const lngPresent = Number.isFinite(Number(enrichedArgs?.lng));
                    if (!latPresent || !lngPresent) {
                        const coords = await getRelayGPSCoords();
                        if (coords) {
                            enrichedArgs.lat = coords.lat;
                            enrichedArgs.lng = coords.lng;
                            try {
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify({
                                        type: 'session_init',
                                        lat: coords.lat,
                                        lng: coords.lng,
                                    }));
                                    console.log(`[LIVE_GPS_ENRICH] find_nearby lat=${coords.lat} lng=${coords.lng}`);
                                }
                            } catch {
                                // noop
                            }
                        }
                    }
                }

                if (ws.readyState !== WebSocket.OPEN) {
                    clearTimeout(timer);
                    pendingRef.current.delete(requestId);
                    reject(new Error('ws_not_connected'));
                    return;
                }

                ws.send(JSON.stringify({
                    type: 'tool_call',
                    tool: functionCall.name,
                    args: enrichedArgs,
                    request_id: requestId,
                    transcript_final: latestTranscript,
                    user_text: latestTranscript,
                }));
            })();
        });
    }, [wsRef, ensureListener, getLatestTranscript, takeLatestTranscript]);

    const relayAll = useCallback(
        (functionCalls: GeminiFunctionCall[]) => Promise.all(functionCalls.map(relay)),
        [relay],
    );

    return { relay, relayAll };
}

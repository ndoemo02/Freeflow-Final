import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveLiveWsBase } from '../lib/config';
import { useConversationStore } from '../store/useConversationStore';
import { normalizeRestaurants, normalizeMenuItems, normalizeCartItems } from '../lib/normalizeData';
import { liveSessionCache } from './useGeminiLiveSession';
import { useLiveUiSessionStore } from '../state/liveUiSession';
import { activeSessionMap } from '../state/ActiveSessionMap';
import { logBridge } from '../lib/interactionBridge';

// Module-level GPS cache — survives WS reconnects within the same page session
let _gpsCache: { lat: number; lng: number; ts: number } | null = null;
const GPS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const GPS_STALE_FALLBACK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const GPS_PERSIST_KEY = 'ff_last_gps';

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

async function getGPSCoords(): Promise<{ lat: number; lng: number } | null> {
    const now = Date.now();
    // Return cache immediately if fresh — eliminates race condition on reconnect
    if (_gpsCache && now - _gpsCache.ts < GPS_CACHE_TTL_MS) {
        return { lat: _gpsCache.lat, lng: _gpsCache.lng };
    }
    const persisted = readPersistedGps();
    const persistedAge = persisted ? (now - persisted.ts) : Number.POSITIVE_INFINITY;
    const hasPersistedFresh = persistedAge < GPS_CACHE_TTL_MS;
    const hasPersistedStaleFallback = persistedAge < GPS_STALE_FALLBACK_MAX_AGE_MS;

    if (persisted && hasPersistedFresh) {
        _gpsCache = persisted;
        return { lat: persisted.lat, lng: persisted.lng };
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
        if (persisted && hasPersistedStaleFallback) {
            _gpsCache = persisted;
            return { lat: persisted.lat, lng: persisted.lng };
        }
        return null;
    }
    return new Promise((resolve) => {
        let settled = false;
        const timeoutMs = 8000;
        const tid = window.setTimeout(() => {
            if (settled) return;
            settled = true;
            if (persisted && hasPersistedStaleFallback) {
                _gpsCache = persisted;
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
                    _gpsCache = { lat, lng, ts: Date.now() };
                    persistGps(lat, lng);
                    resolve({ lat, lng });
                } else {
                    resolve(null);
                }
            },
            () => {
                if (settled) return;
                settled = true;
                window.clearTimeout(tid);
                if (persisted && hasPersistedStaleFallback) {
                    _gpsCache = persisted;
                    resolve({ lat: persisted.lat, lng: persisted.lng });
                    return;
                }
                resolve(null);
            },
            { enableHighAccuracy: false, maximumAge: 120000, timeout: timeoutMs },
        );
    });
}

type DispatchFn = (
    actions: any[] | undefined,
    meta?: Record<string, any>,
    responseKey?: string,
    events?: any[],
) => void;

type UseLiveEventsOptions = {
    enabled: boolean;
    sessionId: string;
    dispatch: DispatchFn;
};

function buildLiveWsUrl(sessionId: string): { wsUrl: string | null; source: string; base: string | null } {
    const resolved = resolveLiveWsBase();
    if (!resolved.base) {
        return { wsUrl: null, source: resolved.source, base: null };
    }

    try {
        const url = new URL(resolved.base);
        const normalizedPath = url.pathname.replace(/\/+$/, '');
        if (normalizedPath !== '/api/voice/live/ws') {
            const prefix = normalizedPath && normalizedPath !== '/' ? normalizedPath : '';
            url.pathname = `${prefix}/api/voice/live/ws`;
        }
        url.searchParams.set('session_id', sessionId);
        return { wsUrl: url.toString(), source: resolved.source, base: resolved.base };
    } catch {
        return { wsUrl: null, source: `invalid:${resolved.source}`, base: resolved.base };
    }
}

function extractCartItems(cartData: any): any[] {
    if (Array.isArray(cartData)) return cartData;
    if (Array.isArray(cartData?.items)) return cartData.items;
    return [];
}

function summarizeCartItems(cartData: any): Array<{ id: string; name: string; qty: number }> {
    return extractCartItems(cartData).map((item: any, idx: number) => ({
        id: String(item?.id ?? item?.menu_item_id ?? idx),
        name: String(item?.name ?? ''),
        qty: Number(item?.qty ?? item?.quantity ?? 1),
    }));
}

function normalizeLooseText(value: any): string {
    return String(value ?? '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseGalleryCandidates(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((entry) => String(entry || '').trim()).filter(Boolean);
    if (typeof value !== 'string') return [];
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.map((entry) => String(entry || '').trim()).filter(Boolean);
            }
        } catch {
            // ignore and use fallback split
        }
    }
    return trimmed.split(/[;,]/).map((entry) => entry.trim()).filter(Boolean);
}

function hasVisualAsset(item: any): boolean {
    if (!item || typeof item !== 'object') return false;
    const direct = [item.img, item.image_url, item.image, item.photo_url]
        .map((value) => String(value || '').trim())
        .filter(Boolean);
    if (direct.length > 0) return true;
    return parseGalleryCandidates(item.photo_gallery).length > 0;
}

function enrichRestaurantWithList(restaurant: any, list: any[]): any {
    if (!restaurant || !Array.isArray(list) || list.length === 0) return restaurant;

    const restaurantId = String(restaurant?.id ?? '').trim();
    const restaurantName = normalizeLooseText(restaurant?.display_name || restaurant?.name || '');

    const byId = restaurantId
        ? list.find((candidate) => String(candidate?.id ?? '').trim() === restaurantId)
        : null;

    const byName = byId || list.find((candidate) => {
        const candidateName = normalizeLooseText(candidate?.display_name || candidate?.name || '');
        if (!candidateName || !restaurantName) return false;
        return candidateName === restaurantName || candidateName.includes(restaurantName) || restaurantName.includes(candidateName);
    });

    const matched = byName || null;
    if (!matched) return restaurant;

    const merged = { ...matched, ...restaurant };
    if (!hasVisualAsset(merged) && hasVisualAsset(matched)) {
        merged.img = matched.img || matched.image_url || merged.img || null;
        merged.image_url = matched.image_url || merged.img || merged.image_url || null;
        if (!Array.isArray(merged.photo_gallery) || merged.photo_gallery.length === 0) {
            merged.photo_gallery = parseGalleryCandidates(matched.photo_gallery);
        }
    }

    return merged;
}

function findRestaurantIdByReference(restaurants: any[], reference: any): string | null {
    if (!Array.isArray(restaurants) || restaurants.length === 0 || !reference) return null;

    const refId = reference?.id != null ? String(reference.id) : null;
    if (refId) {
        const byId = restaurants.find((restaurant: any) => String(restaurant?.id ?? '') === refId);
        if (byId?.id != null) return String(byId.id);
    }

    const refName = normalizeLooseText(reference?.display_name || reference?.name || '');
    if (!refName) return null;

    const byName = restaurants.find((restaurant: any) => {
        const restaurantName = normalizeLooseText(restaurant?.display_name || restaurant?.name || '');
        return restaurantName && (restaurantName === refName || restaurantName.includes(refName) || refName.includes(restaurantName));
    });

    return byName?.id != null ? String(byName.id) : null;
}

function resolveFocusedRestaurantPreviewId({
    isIdle,
    restaurants,
    response,
    nextCurrentRestaurant,
    previousSelectedRestaurantPreviewId,
}: {
    isIdle: boolean;
    restaurants: any[] | null;
    response: any;
    nextCurrentRestaurant: any;
    previousSelectedRestaurantPreviewId: string | null;
}): string | null {
    if (isIdle) return null;
    if (!Array.isArray(restaurants) || restaurants.length === 0) {
        return previousSelectedRestaurantPreviewId;
    }

    const referencedRestaurantId = findRestaurantIdByReference(restaurants, nextCurrentRestaurant)
        || findRestaurantIdByReference(restaurants, response?.restaurant)
        || findRestaurantIdByReference(restaurants, response?.currentRestaurant)
        || findRestaurantIdByReference(restaurants, response?.context?.currentRestaurant)
        || findRestaurantIdByReference(restaurants, response?.context?.current_restaurant);
    if (referencedRestaurantId) return referencedRestaurantId;

    const replyText = normalizeLooseText(response?.reply || response?.text || response?.tts?.text || '');
    if (replyText) {
        const byReplyMention = restaurants.find((restaurant: any) => {
            const restaurantName = normalizeLooseText(restaurant?.display_name || restaurant?.name || '');
            return restaurantName && replyText.includes(restaurantName);
        });
        if (byReplyMention?.id != null) return String(byReplyMention.id);
    }

    const hasPreviousSelection = !!previousSelectedRestaurantPreviewId
        && restaurants.some((restaurant: any) =>
            String(restaurant?.id || '') === String(previousSelectedRestaurantPreviewId),
        );
    if (hasPreviousSelection) return previousSelectedRestaurantPreviewId;

    return restaurants[0]?.id != null ? String(restaurants[0].id) : null;
}

function extractMentionOrderedRestaurantIds(restaurants: any[], response: any): string[] {
    if (!Array.isArray(restaurants) || restaurants.length === 0) return [];

    const replyText = normalizeLooseText(response?.reply || response?.text || response?.tts?.text || '');
    if (!replyText) return [];

    const ranked = restaurants
        .map((restaurant: any, idx: number) => {
            const restaurantId = restaurant?.id != null ? String(restaurant.id) : null;
            const restaurantName = normalizeLooseText(restaurant?.display_name || restaurant?.name || '');
            if (!restaurantId || !restaurantName || restaurantName.length < 3) return null;
            const mentionIndex = replyText.indexOf(restaurantName);
            return mentionIndex >= 0 ? { restaurantId, mentionIndex, idx } : null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => {
            if (a.mentionIndex !== b.mentionIndex) return a.mentionIndex - b.mentionIndex;
            return a.idx - b.idx;
        });

    return ranked.map((entry: any) => entry.restaurantId);
}

export function useLiveEvents({ enabled, sessionId, dispatch }: UseLiveEventsOptions) {
    const socketRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);

    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptRef = useRef(0);
    const activeSocketSessionIdRef = useRef<string | null>(null);
    const shouldReconnectRef = useRef(false);
    const connectNonceRef = useRef(0);
    const focusSyncTokenRef = useRef(0);
    const focusSyncTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
    const RECONNECT_DELAYS_MS = [1000, 2000, 5000] as const;

    // ROOT CAUSE FIX: dispatch comes from useActionDispatcher whose useCallback deps
    // (syncCart, setIsOpen from CartContext) are new references on every CartProvider
    // render. Putting dispatch in the WS effect deps causes cleanup+reconnect on every
    // cart state change. Store in a ref so the WS lifecycle is never re-triggered by it.
    const dispatchRef = useRef(dispatch);
    useEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);

    const wsUrl = useMemo(() => {
        if (!enabled || !sessionId) return null;
        const resolved = buildLiveWsUrl(sessionId);
        return resolved.wsUrl;
    }, [enabled, sessionId]);

    const clearReconnectTimer = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    }, []);

    const clearFocusSyncTimers = useCallback(() => {
        focusSyncTokenRef.current += 1;
        for (const timer of focusSyncTimersRef.current) {
            clearTimeout(timer);
        }
        focusSyncTimersRef.current = [];
    }, []);

    const focusRestaurantById = useCallback((restaurantId: string | null, reason: string) => {
        if (!restaurantId) return;
        useConversationStore.setState((current) => {
            const hasRestaurant = Array.isArray(current.suggestedRestaurants)
                && current.suggestedRestaurants.some((restaurant: any) => String(restaurant?.id ?? '') === restaurantId);
            if (!hasRestaurant) return {};
            if (String(current.selectedRestaurantPreviewId || '') === restaurantId) return {};
            return { selectedRestaurantPreviewId: restaurantId };
        });
    }, []);

    const scheduleFocusSequence = useCallback((restaurantIds: string[], reason: string) => {
        const dedupedIds = Array.from(new Set((restaurantIds || []).filter(Boolean)));
        if (dedupedIds.length < 2) {
            clearFocusSyncTimers();
            return;
        }

        clearFocusSyncTimers();
        const token = focusSyncTokenRef.current;
        const initialDelayMs = 550;
        const stepDelayMs = 1200;

        dedupedIds.forEach((restaurantId, idx) => {
            const timer = setTimeout(() => {
                if (token !== focusSyncTokenRef.current) return;
                focusRestaurantById(restaurantId, `${reason}:${idx + 1}`);
            }, initialDelayMs + idx * stepDelayMs);
            focusSyncTimersRef.current.push(timer);
        });
    }, [clearFocusSyncTimers, focusRestaurantById]);

    useEffect(() => {
        if (!enabled || !sessionId) return;

        const onAssistantSpeechPart = (rawEvent: Event) => {
            const event = rawEvent as CustomEvent<any>;
            const eventSessionId = String(event?.detail?.sessionId || '').trim();
            if (eventSessionId && eventSessionId !== sessionId) return;

            const speechText = normalizeLooseText(event?.detail?.text || '');
            if (!speechText) return;

            const state = useConversationStore.getState();
            const isDiscoveryList = state.uiMode === 'list';
            if (!isDiscoveryList) return;
            const restaurants = Array.isArray(state.suggestedRestaurants) ? state.suggestedRestaurants : [];
            if (!restaurants.length) return;

            const mentioned = restaurants.find((restaurant: any) => {
                const restaurantName = normalizeLooseText(restaurant?.display_name || restaurant?.name || '');
                return restaurantName && speechText.includes(restaurantName);
            });
            if (!mentioned?.id) return;

            clearFocusSyncTimers();
            focusRestaurantById(String(mentioned.id), 'assistant_part');
        };

        window.addEventListener('freeflow:live-assistant-part', onAssistantSpeechPart as EventListener);
        return () => {
            window.removeEventListener('freeflow:live-assistant-part', onAssistantSpeechPart as EventListener);
        };
    }, [enabled, sessionId, clearFocusSyncTimers, focusRestaurantById]);

    useEffect(() => {

        if (!wsUrl || !sessionId) {
            shouldReconnectRef.current = false;
            clearReconnectTimer();
            clearFocusSyncTimers();
            if (socketRef.current) {
                try { socketRef.current.close(1000, 'disabled_or_no_session'); } catch { /* noop */ }
            }
            socketRef.current = null;
            activeSocketSessionIdRef.current = null;
            reconnectAttemptRef.current = 0;
            setConnected(false);
            return;
        }

        shouldReconnectRef.current = true;
        let disposed = false;
        let sessionInitSent = false;
        const effectSessionId = sessionId;
        let gpsInitRetryTimer: ReturnType<typeof setTimeout> | null = null;
        let gpsInitRetryCount = 0;
        const MAX_GPS_INIT_RETRIES = 6;

        const clearGpsInitRetry = () => {
            if (gpsInitRetryTimer) {
                clearTimeout(gpsInitRetryTimer);
                gpsInitRetryTimer = null;
            }
        };

        const sendSessionInitWithRetry = (socket: WebSocket) => {
            if (disposed || sessionInitSent) return;
            clearGpsInitRetry();

            void getGPSCoords().then((coords) => {
                if (disposed || sessionInitSent || socket.readyState !== WebSocket.OPEN) return;
                if (coords) {
                    sessionInitSent = true;
                    socket.send(JSON.stringify({
                        type: 'session_init',
                        lat: coords.lat,
                        lng: coords.lng,
                    }));
                    return;
                }

                if (gpsInitRetryCount >= MAX_GPS_INIT_RETRIES) {
                    return;
                }

                gpsInitRetryCount += 1;
                gpsInitRetryTimer = setTimeout(() => {
                    sendSessionInitWithRetry(socket);
                }, 1500);
            });
        };

        const scheduleReconnect = () => {
            if (!shouldReconnectRef.current || disposed) return;
            if (reconnectTimerRef.current) return;

            const nextAttempt = reconnectAttemptRef.current + 1;
            if (nextAttempt > RECONNECT_DELAYS_MS.length) {
                shouldReconnectRef.current = false;
                console.warn('[LIVE] RECONNECT HALTED');
                return;
            }

            reconnectAttemptRef.current = nextAttempt;
            const delay = RECONNECT_DELAYS_MS[nextAttempt - 1];
            console.warn(`[LIVE] RECONNECT attempt #${nextAttempt}`);

            reconnectTimerRef.current = setTimeout(() => {
                reconnectTimerRef.current = null;
                if (!disposed) {
                    connectSocket('reconnect');
                }
            }, delay);
        };

        const connectSocket = (reason: 'initial' | 'reconnect') => {
            if (!shouldReconnectRef.current || disposed) return;

            const existing = socketRef.current;
            if (
                existing &&
                activeSocketSessionIdRef.current === effectSessionId &&
                (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
            ) {
                // socket already OPEN or CONNECTING — skip â€” socket already ${existing.readyState === WebSocket.OPEN ? 'OPEN' : 'CONNECTING'}`);
                return;
            }

            // Reset session_init guard on reconnect, aby GPS został wysłany ponownie
            if (reason === 'reconnect') sessionInitSent = false;

            const nonce = ++connectNonceRef.current;
            // connect requested â€” reason=${reason} session=${effectSessionId} nonce=${nonce}`);
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;
            activeSocketSessionIdRef.current = effectSessionId;

            socket.onopen = () => {
                if (disposed || nonce !== connectNonceRef.current) return;
                setConnected(true);
                reconnectAttemptRef.current = 0;
                clearReconnectTimer();
                // GPS init triggered by live_ready handler (poniżej) —
                // unikamy podwójnego wysłania session_init z onopen + live_ready.
                gpsInitRetryCount = 0;
            };

            socket.onclose = (e) => {
                if (nonce !== connectNonceRef.current) return;
                setConnected(false);
                if (socketRef.current === socket) socketRef.current = null;
                // Do NOT reconnect on intentional close or permanent policy errors.
                // 1000 = Normal closure, 4001/4002 = live disabled or missing session id
                if (e.code === 1000 || e.code === 4001 || e.code === 4002) {
                    return;
                }
                if (e.code === 4003) {
                    useLiveUiSessionStore.getState().setPaused(
                        'LIVE zablokowany przez polityke origin. Sprawdz LIVE_ALLOWED_ORIGINS lub LIVE_STRICT_ORIGIN.',
                    );
                    console.warn('[LIVE] RECONNECT HALTED - origin_not_allowed (4003)');
                    return;
                }
                scheduleReconnect();
            };

            socket.onerror = (e) => {
                if (nonce !== connectNonceRef.current) return;
                console.error('[LiveEvents] WS error:', e);
            };

            socket.onmessage = (event) => {
                let parsed: any;
                try {
                    parsed = JSON.parse(event.data);
                } catch {
                    return;
                }

                const liveUiStore = useLiveUiSessionStore.getState();
                if (parsed?.type === 'live_ready') {
                    liveUiStore.setListening('Słucham...');
                    gpsInitRetryCount = 0;
                    // Zawsze wysyłaj GPS przy live_ready — SessionResumption reconnect
                    // nie przechodzi przez connectSocket('reconnect'), więc guard
                    // sessionInitSent nie jest resetowany. Bez tego Gemini gubi GPS.
                    sessionInitSent = false;
                    sendSessionInitWithRetry(socket);
                    return;
                }

                if (parsed?.type === 'tool_error') {
                    const toolName = String(parsed?.tool || parsed?.name || '').trim();
                    const errorText = String(parsed?.error || 'tool_error').trim() || 'tool_error';
                    liveUiStore.setSessionState('results_ready', {
                        statusText: `Błąd narzędzia: ${errorText}`,
                        isLiveActive: true,
                        isPaused: false,
                        lastTool: toolName || liveUiStore.lastTool,
                    });
                    return;
                }

                if (parsed?.type !== 'tool_result' || !parsed?.response) return;

                const wsTurnId = String(parsed?.turn_id || '');
                logBridge('action_result_received', { turn_id: wsTurnId, session_id: effectSessionId, tool: parsed.tool, source: 'ws' });

                const response = parsed.response;
                const reply = response.reply || response.text || '';
                const state = useConversationStore.getState();
                const history = [...state.conversationHistory, { role: 'assistant', content: reply }];
                const liveToolName = String(parsed.tool || parsed.name || '');
                const isLiveCartTool = liveToolName === 'add_item_to_cart' || liveToolName === 'add_items_to_cart' || liveToolName === 'open_checkout';
                liveUiStore.applyToolResult(liveToolName || null, response);
                if (reply) {
                    liveUiStore.setTranscript('assistant', reply);
                }

                const newPhase = response.context?.conversationPhase || response.phase || state.conversationPhase;
                const isIdle = newPhase === 'idle';

                const restaurants = normalizeRestaurants(
                    response.restaurants || response.context?.last_restaurants_list || null,
                );
                const menuItems = normalizeMenuItems(
                    response.menu       // Full menu for UI (set by menuHandler)
                    || response.menuItems  // Shortlist fallback
                    || response.context?.menuItems
                    || response.context?.menu_items
                    || response.context?.last_menu
                    || response.context?.lastMenu
                    || null,
                );

                const nextIntent = response.intent || state.lastIntent || null;
                let nextUiMode = state.uiMode;
                if (nextIntent === 'find_nearby') {
                    nextUiMode = 'list';
                } else if (
                    nextIntent === 'select_restaurant'
                    || nextIntent === 'show_menu'
                    || nextIntent === 'menu_request'
                    || nextIntent === 'show_restaurant_menu'
                    || nextIntent === 'view_menu'
                    || liveToolName === 'show_menu'
                ) {
                    nextUiMode = 'restaurant';
                } else if (nextIntent === 'open_checkout') {
                    nextUiMode = 'checkout';
                }

                const nextCurrentRestaurant =
                    response.context?.currentRestaurant
                    || response.context?.current_restaurant
                    || response.currentRestaurant
                    || response.restaurant
                    || state.currentRestaurant;
                const restaurantCandidateList = (restaurants && restaurants.length > 0)
                    ? restaurants
                    : (Array.isArray(state.suggestedRestaurants) ? state.suggestedRestaurants : []);
                const nextCurrentRestaurantEnriched = enrichRestaurantWithList(nextCurrentRestaurant, restaurantCandidateList);

                const hasMenuItems = Array.isArray(menuItems) && menuItems.length > 0;
                const menuSurfaceIntent = nextIntent === 'show_menu'
                    || nextIntent === 'menu_request'
                    || nextIntent === 'show_restaurant_menu'
                    || nextIntent === 'view_menu';
                const menuSurfaceTool = liveToolName === 'show_menu' || liveToolName === 'select_restaurant';
                if (hasMenuItems && (menuSurfaceIntent || menuSurfaceTool || nextCurrentRestaurantEnriched)) {
                    nextUiMode = 'restaurant';
                }

                dispatchRef.current(
                    response.actions,
                    {
                        ...(response.meta || {}),
                        cart: response.cart || response.meta?.cart,
                        intent: response.intent || response.meta?.intent,
                        tool: liveToolName || response.meta?.tool || null,
                    },
                    response.turn_id || response.timestamp || parsed.request_id,
                    response.events,
                );

                const previousSelectedRestaurantPreviewId = state.selectedRestaurantPreviewId;
                const resolvedSelectedRestaurantPreviewId = resolveFocusedRestaurantPreviewId({
                    isIdle,
                    restaurants,
                    response,
                    nextCurrentRestaurant: nextCurrentRestaurantEnriched,
                    previousSelectedRestaurantPreviewId,
                });
                const currentRestaurantId = nextCurrentRestaurantEnriched?.id != null
                    ? String(nextCurrentRestaurantEnriched.id)
                    : null;
                const hasRestaurants = Array.isArray(restaurants) && restaurants.length > 0;
                const isMenuFocusLocked = nextUiMode === 'restaurant'
                    || newPhase === 'restaurant_selected'
                    || newPhase === 'ordering';
                const currentRestaurantInList = Boolean(
                    currentRestaurantId
                    && hasRestaurants
                    && restaurants.some((restaurant: any) => String(restaurant?.id ?? '') === currentRestaurantId),
                );
                let nextSelectedRestaurantPreviewId = resolvedSelectedRestaurantPreviewId;
                if (isMenuFocusLocked) {
                    if (currentRestaurantId && (!hasRestaurants || currentRestaurantInList)) {
                        nextSelectedRestaurantPreviewId = currentRestaurantId;
                    } else if (previousSelectedRestaurantPreviewId) {
                        nextSelectedRestaurantPreviewId = previousSelectedRestaurantPreviewId;
                    }
                    if (nextSelectedRestaurantPreviewId !== resolvedSelectedRestaurantPreviewId) {
                        // focus lock applied
                    }
                }
                const shouldAnimateFocusSequence = !isIdle
                    && nextUiMode === 'list'
                    && !isMenuFocusLocked
                    && liveToolName === 'find_nearby'
                    && Array.isArray(restaurants)
                    && restaurants.length > 1;
                const mentionedRestaurantIds = shouldAnimateFocusSequence
                    ? extractMentionOrderedRestaurantIds(restaurants || [], response)
                    : [];

                // Fix #5: Backend cart jest "Prawdą Absolutną" — full override, bez fallbacku
                // do state.cart. Po przejściach menu↔checkout state.cart może być niezsynchronizowany.
                // Fix #5.5: normalizeCartItems wymusza identyczną strukturę każdego przedmiotu.
                const backendCartRaw = response.meta?.cart || response.cart;
                const backendCart = normalizeCartItems(backendCartRaw) || backendCartRaw;
                const backendCartHash = response.meta?.cartHash || response.cartHash || '';
                const cartForStore = backendCart || state.cart;

                const nextStoreState = {
                    isThinking: false,
                    error: null,
                    lastResponse: reply,
                    lastFullResponse: response,
                    conversationHistory: history,
                    uiMode: nextUiMode,
                    conversationPhase: newPhase,
                    currentRestaurant: nextCurrentRestaurantEnriched,
                    pendingOrder: response.context?.pendingOrder || null,
                    cart: cartForStore,
                    expectedContext: isIdle ? null : (response.context?.expectedContext || state.expectedContext),
                    lastIntent: response.intent || state.lastIntent,
                    lastSource: response.meta?.source || 'live_tool',
                    suggestedRestaurants: (restaurants && restaurants.length > 0) ? restaurants : (isIdle ? null : state.suggestedRestaurants),
                    selectedRestaurantPreviewId: nextSelectedRestaurantPreviewId,
                    menuItems: (menuItems && menuItems.length > 0) ? menuItems : (isIdle ? null : state.menuItems),
                };
                const uiUpdateStart = Date.now();
                useConversationStore.setState((prev) => ({
                    ...nextStoreState,
                    cartSyncKey: backendCart ? prev.cartSyncKey + 1 : prev.cartSyncKey,
                }));
                logBridge('ui_update_applied', { turn_id: wsTurnId, duration_ms: Date.now() - uiUpdateStart });

                // Fix #6.4: When backend closes conversation (ORDER_CONFIRMED),
                // adopt the newSessionId so next voice input starts fresh.
                const responseNewSessionId = (response as any)?.newSessionId;
                const responseConversationClosed = !!(response as any)?.conversationClosed;
                if (responseNewSessionId && responseConversationClosed) {
                  const storeAfter = useConversationStore.getState();
                  if (storeAfter.sessionId !== responseNewSessionId) {
                    useConversationStore.setState({ sessionId: responseNewSessionId });
                    localStorage.setItem('amber-session-id', responseNewSessionId);
                  }
                }

                // Mirror do ActiveSessionMap — Level 2 Memory
                if (backendCart) {
                    activeSessionMap.updateFromResponse(
                        String(effectSessionId || state.sessionId || ''),
                        response,
                        nextUiMode,
                        newPhase,
                    );
                    if (backendCartHash) {
                        const hashOk = activeSessionMap.verifyCartHash(String(effectSessionId || state.sessionId || ''), backendCartHash);
                        if (!hashOk) {
                            console.warn(`[LIVE_CART_HASH] ❌ WS MISMATCH — frontend=${activeSessionMap.getCartHash(String(effectSessionId || state.sessionId || ''))} backend=${backendCartHash} — FORCE OVERRIDE applied`);
                        }
                    }
                }

                if (shouldAnimateFocusSequence) {
                    const fallbackSequence = (restaurants || [])
                        .map((restaurant: any) => (restaurant?.id != null ? String(restaurant.id) : null))
                        .filter((value: string | null): value is string => Boolean(value));
                    const sequence = mentionedRestaurantIds.length > 1 ? mentionedRestaurantIds : fallbackSequence;
                    const sequenceWithAnchor = (nextSelectedRestaurantPreviewId
                        ? [nextSelectedRestaurantPreviewId, ...sequence]
                        : sequence)
                        .filter((value: string | null): value is string => Boolean(value));
                    scheduleFocusSequence(sequenceWithAnchor, 'tool_result_find_nearby');
                } else {
                    clearFocusSyncTimers();
                }

                // Fix #4: persist state to live session cache for reconnect resilience
                liveSessionCache.set(effectSessionId, {
                    cart: nextStoreState.cart,
                    currentRestaurant: nextStoreState.currentRestaurant,
                    uiMode: nextStoreState.uiMode,
                    conversationPhase: nextStoreState.conversationPhase,
                    suggestedRestaurants: nextStoreState.suggestedRestaurants,
                    menuItems: nextStoreState.menuItems,
                });
            };
        };

        connectSocket('initial');

        return () => {
            disposed = true;
            shouldReconnectRef.current = false;
            clearReconnectTimer();
            clearFocusSyncTimers();
            clearGpsInitRetry();
            const socket = socketRef.current;
            if (socket && activeSocketSessionIdRef.current === effectSessionId) {
                try { socket.close(1000, 'effect_cleanup'); } catch { /* noop */ }
            }
            if (socketRef.current === socket) socketRef.current = null;
            if (activeSocketSessionIdRef.current === effectSessionId) {
                activeSocketSessionIdRef.current = null;
            }
            setConnected(false);
        };
    // dispatch intentionally excluded â€” stored in dispatchRef to prevent WS teardown
    // on every CartProvider re-render (unstable function refs from CartContext).
    }, [wsUrl, sessionId, clearReconnectTimer, clearFocusSyncTimers, scheduleFocusSequence]);

    return { liveConnected: connected, socketRef };
}

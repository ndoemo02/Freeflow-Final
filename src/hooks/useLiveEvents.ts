import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApiUrl } from '../lib/config';
import { useConversationStore } from '../store/useConversationStore';
import { normalizeRestaurants, normalizeMenuItems } from '../lib/normalizeData';
import { liveSessionCache } from './useGeminiLiveSession';

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

function toWsUrl(path: string) {
    const httpUrl = getApiUrl(path);
    if (httpUrl.startsWith('http://')) return `ws://${httpUrl.slice('http://'.length)}`;
    if (httpUrl.startsWith('https://')) return `wss://${httpUrl.slice('https://'.length)}`;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}${httpUrl.startsWith('/') ? '' : '/'}${httpUrl}`;
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

export function useLiveEvents({ enabled, sessionId, dispatch }: UseLiveEventsOptions) {
    const socketRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);

    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptRef = useRef(0);
    const activeSocketSessionIdRef = useRef<string | null>(null);
    const shouldReconnectRef = useRef(false);
    const connectNonceRef = useRef(0);
    const RECONNECT_DELAYS_MS = [1000, 2000, 5000] as const;

    // ROOT CAUSE FIX: dispatch comes from useActionDispatcher whose useCallback deps
    // (syncCart, setIsOpen from CartContext) are new references on every CartProvider
    // render. Putting dispatch in the WS effect deps causes cleanup+reconnect on every
    // cart state change. Store in a ref so the WS lifecycle is never re-triggered by it.
    const dispatchRef = useRef(dispatch);
    useEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);

    const wsUrl = useMemo(() => {
        if (!enabled || !sessionId) return null;
        const base = toWsUrl('/api/voice/live/ws');
        const url = new URL(base);
        url.searchParams.set('session_id', sessionId);
        return url.toString();
    }, [enabled, sessionId]);

    const clearReconnectTimer = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        console.log(`[LIVE_EFFECT] useLiveEvents effect fired — wsUrl=${wsUrl ? 'set' : 'null'} sessionId=${sessionId || 'none'}`);

        if (!wsUrl || !sessionId) {
            shouldReconnectRef.current = false;
            clearReconnectTimer();
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
        const effectSessionId = sessionId;

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
                console.log(`[LIVE_INIT_CALLSITE] useLiveEvents connect skipped — socket already ${existing.readyState === WebSocket.OPEN ? 'OPEN' : 'CONNECTING'}`);
                return;
            }

            const nonce = ++connectNonceRef.current;
            console.log(`[LIVE_INIT_CALLSITE] useLiveEvents connect requested — reason=${reason} session=${effectSessionId} nonce=${nonce}`);
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;
            activeSocketSessionIdRef.current = effectSessionId;

            socket.onopen = () => {
                if (disposed || nonce !== connectNonceRef.current) return;
                setConnected(true);
                reconnectAttemptRef.current = 0;
                clearReconnectTimer();
                console.log('LIVE EVENTS WS OPEN - backend tool relay ready');
            };

            socket.onclose = (e) => {
                if (nonce !== connectNonceRef.current) return;
                setConnected(false);
                if (socketRef.current === socket) socketRef.current = null;
                console.log(`[LIVE] STOP sessionId=${effectSessionId} code=${e.code} reason=${e.reason || '(none)'}`);
                // Do NOT reconnect on normal/intentional close codes
                // 1000 = Normal closure, 1001 = Going Away (tab/server shutdown)
                if (e.code === 1000 || e.code === 1001) {
                    console.log(`[LIVE] RECONNECT HALTED — intentional close (${e.code})`);
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

                if (parsed?.type !== 'tool_result' || !parsed?.response) return;

                const response = parsed.response;
                const reply = response.reply || response.text || '';
                const state = useConversationStore.getState();
                const history = [...state.conversationHistory, { role: 'assistant', content: reply }];
                const liveToolName = String(parsed.tool || parsed.name || '');
                const isLiveCartTool = liveToolName === 'add_item_to_cart' || liveToolName === 'open_checkout';

                const newPhase = response.context?.conversationPhase || response.phase || state.conversationPhase;
                const isIdle = newPhase === 'idle';

                const restaurants = normalizeRestaurants(
                    response.restaurants || response.context?.last_restaurants_list || null,
                );
                const menuItems = normalizeMenuItems(
                    response.menuItems || response.menu || response.context?.last_menu || null,
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
                    || response.currentRestaurant
                    || state.currentRestaurant;

                const liveMenuRenderVisible = nextUiMode === 'restaurant' && !!(menuItems && menuItems.length);
                if (liveToolName === 'show_menu' || nextIntent === 'show_menu' || nextIntent === 'menu_request') {
                    console.log('[LIVE_MENU] tool=show_menu');
                    console.log(`[LIVE_MENU] menuItemsCount=${menuItems?.length ?? 0}`);
                    console.log(`[LIVE_MENU] currentRestaurant=${nextCurrentRestaurant?.name || 'null'}`);
                    console.log(`[LIVE_MENU] uiMode=${nextUiMode}`);
                    console.log(`[LIVE_MENU] renderVisible=${liveMenuRenderVisible}`);
                }
                if (isLiveCartTool) {
                    console.log(`[LIVE_CART] tool=${liveToolName}`);
                    console.log(`[LIVE_CART] backendCartItems=${JSON.stringify(summarizeCartItems(response.cart || response.meta?.cart))}`);
                }

                dispatchRef.current(
                    response.actions,
                    {
                        ...(response.meta || {}),
                        cart: response.cart || response.meta?.cart,
                        intent: response.intent || response.meta?.intent,
                    },
                    response.turn_id || response.timestamp || parsed.request_id,
                    response.events,
                );

                const nextStoreState = {
                    isThinking: false,
                    error: null,
                    lastResponse: reply,
                    lastFullResponse: response,
                    conversationHistory: history,
                    uiMode: nextUiMode,
                    conversationPhase: newPhase,
                    currentRestaurant: nextCurrentRestaurant,
                    pendingOrder: response.context?.pendingOrder || null,
                    cart: response.meta?.cart || response.cart || state.cart,
                    expectedContext: isIdle ? null : (response.context?.expectedContext || state.expectedContext),
                    lastIntent: response.intent || state.lastIntent,
                    lastSource: response.meta?.source || 'live_tool',
                    suggestedRestaurants: restaurants || (isIdle ? null : state.suggestedRestaurants),
                    selectedRestaurantPreviewId: restaurants?.[0]?.id || (isIdle ? null : state.selectedRestaurantPreviewId),
                    menuItems: menuItems || (isIdle ? null : state.menuItems),
                };
                if (isLiveCartTool) {
                    console.log(`[LIVE_CART] storeCartItems=${JSON.stringify(summarizeCartItems(nextStoreState.cart))}`);
                    console.log(`[LIVE_CART] pendingOrder=${JSON.stringify(nextStoreState.pendingOrder || null)}`);
                    console.log(`[LIVE_CART] checkoutVisible=${String(nextUiMode === 'checkout')}`);
                }
                useConversationStore.setState(nextStoreState);

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
    // dispatch intentionally excluded — stored in dispatchRef to prevent WS teardown
    // on every CartProvider re-render (unstable function refs from CartContext).
    }, [wsUrl, sessionId, clearReconnectTimer]);

    const sendToolCall = useCallback((tool: string, args: Record<string, any> = {}) => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return false;
        }

        socket.send(JSON.stringify({
            type: 'tool_call',
            request_id: `live_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            tool,
            args,
        }));
        return true;
    }, []);

    return { liveConnected: connected, sendToolCall, socketRef };
}

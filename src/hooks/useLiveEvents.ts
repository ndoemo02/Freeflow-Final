import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApiUrl } from '../lib/config';
import { useConversationStore } from '../store/useConversationStore';
import { normalizeRestaurants, normalizeMenuItems } from '../lib/normalizeData';

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

export function useLiveEvents({ enabled, sessionId, dispatch }: UseLiveEventsOptions) {
    const socketRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);

    const wsUrl = useMemo(() => {
        if (!enabled || !sessionId) return null;
        const base = toWsUrl('/api/voice/live/ws');
        const url = new URL(base);
        url.searchParams.set('session_id', sessionId);
        return url.toString();
    }, [enabled, sessionId]);

    useEffect(() => {
        if (!wsUrl) return;

        console.log('LIVE EVENTS WS CONNECTING —', wsUrl);
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            setConnected(true);
            console.log('LIVE EVENTS WS OPEN — backend tool relay ready');
        };

        socket.onclose = (e) => {
            setConnected(false);
            if (socketRef.current === socket) socketRef.current = null;
            console.log('[LiveEvents] disconnected — code:', e.code, 'reason:', e.reason || '(none)');
        };

        socket.onerror = (e) => {
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

            const newPhase = response.context?.conversationPhase || response.phase || state.conversationPhase;
            const isIdle = newPhase === 'idle';

            const restaurants = normalizeRestaurants(
                response.restaurants || response.context?.last_restaurants_list || null,
            );
            const menuItems = normalizeMenuItems(
                response.menuItems || response.menu || response.context?.last_menu || null,
            );

            dispatch(
                response.actions,
                {
                    ...(response.meta || {}),
                    cart: response.cart || response.meta?.cart,
                },
                response.turn_id || response.timestamp || parsed.request_id,
                response.events,
            );

            useConversationStore.setState({
                isThinking: false,
                error: null,
                lastResponse: reply,
                lastFullResponse: response,
                conversationHistory: history,
                conversationPhase: newPhase,
                currentRestaurant: response.context?.currentRestaurant || state.currentRestaurant,
                pendingOrder: response.context?.pendingOrder || null,
                cart: response.meta?.cart || response.cart || state.cart,
                expectedContext: isIdle ? null : (response.context?.expectedContext || state.expectedContext),
                lastIntent: response.intent || state.lastIntent,
                lastSource: response.meta?.source || 'live_tool',
                // Map domain data so phase-gated UI components (SuggestedRestaurantsCarousel,
                // MenuIsland) update correctly — these read exclusively from the store, never
                // from lastFullResponse directly.
                suggestedRestaurants: restaurants || (isIdle ? null : state.suggestedRestaurants),
                selectedRestaurantPreviewId: restaurants?.[0]?.id || (isIdle ? null : state.selectedRestaurantPreviewId),
                menuItems: menuItems || (isIdle ? null : state.menuItems),
            });
        };

        return () => {
            socket.close();
            if (socketRef.current === socket) socketRef.current = null;
        };
    }, [wsUrl, dispatch]);

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

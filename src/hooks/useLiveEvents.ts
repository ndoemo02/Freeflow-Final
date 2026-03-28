import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApiUrl } from '../lib/config';
import { useConversationStore } from '../store/useConversationStore';

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

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            setConnected(true);
            console.log('[LiveEvents] connected');
        };

        socket.onclose = () => {
            setConnected(false);
            if (socketRef.current === socket) socketRef.current = null;
            console.log('[LiveEvents] disconnected');
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
                conversationPhase: response.context?.conversationPhase || response.phase || state.conversationPhase,
                currentRestaurant: response.context?.currentRestaurant || state.currentRestaurant,
                pendingOrder: response.context?.pendingOrder || null,
                cart: response.meta?.cart || response.cart || state.cart,
                expectedContext: response.context?.expectedContext || state.expectedContext,
                lastIntent: response.intent || state.lastIntent,
                lastSource: response.meta?.source || 'live_tool',
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

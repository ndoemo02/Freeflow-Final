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

const RELAY_TIMEOUT_MS = 9000;

function safeJsonParse(raw: string) {
    try { return JSON.parse(raw); } catch { return null; }
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
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            return Promise.reject(new Error('ws_not_connected'));
        }

        ensureListener();

        const requestId = functionCall.id || `relay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        return new Promise<GeminiFunctionResponse>((resolve, reject) => {
            const timer = setTimeout(() => {
                pendingRef.current.delete(requestId);
                reject(new Error('relay_timeout'));
            }, RELAY_TIMEOUT_MS);

            pendingRef.current.set(requestId, { resolve, reject, timer });

            ws.send(JSON.stringify({
                type: 'tool_call',
                tool: functionCall.name,
                args: functionCall.args || {},
                request_id: requestId,
            }));
        });
    }, [wsRef, ensureListener]);

    const relayAll = useCallback(
        (functionCalls: GeminiFunctionCall[]) => Promise.all(functionCalls.map(relay)),
        [relay],
    );

    return { relay, relayAll };
}

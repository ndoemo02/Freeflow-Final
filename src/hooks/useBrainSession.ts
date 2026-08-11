/**
 * useBrainSession - Manages session and communication with /api/brain/v2
 * 
 * Responsibilities:
 * - Session ID management (create/restore from localStorage)
 * - Conversation history management
 * - Sends text messages to the Brain V2 pipeline endpoint
 * - Returns brain response (text, audio, restaurants, menu, etc.)
 * 
 * IMPORTANT: Uses /api/brain/v2 (FSM pipeline) NOT /api/ai/agent (raw LLM)
 * This ensures proper intent routing through ICM and handlers.
 * 
 * This hook has ZERO domain knowledge - it doesn't inspect intent names
 * or make UI decisions based on response content.
 */

import { useState, useCallback, useRef } from 'react';
import { getApiUrl } from '../lib/config';
import { getAccessToken } from '../lib/supabase';
import { logger } from '../lib/logger';
import { ttsManager } from '../tts/ttsManager';
import { generateSessionId, isCanonicalSessionId } from '../lib/sessionIdContract';

export interface BrainMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    tool_calls?: any[];
}

export interface BrainV2Response {
    ok: boolean;
    session_id: string;
    text?: string;
    reply?: string;
    tts_text?: string;
    tts?: {
        text?: string;
        voice?: string;
    };
    audioContent?: string | null;
    intent?: string;
    should_reply?: boolean;
    actions?: any[];
    restaurants?: any[];
    menuItems?: any[];
    menu?: any[];
    currentRestaurant?: any;
    businessStats?: any;
    orders?: any[];
    meta?: {
        latency_total_ms?: number;
        source?: string;
        conversationClosed?: boolean;
        [key: string]: any;
    };
    context?: any;
    error?: string;

    // ═══════════════════════════════════════════════════════════════════════════
    // SESSION LIFECYCLE (Conversation Isolation)
    // When conversationClosed=true, frontend MUST switch to newSessionId
    // ═══════════════════════════════════════════════════════════════════════════
    conversationClosed?: boolean;
    newSessionId?: string;
    closedReason?: 'CART_ITEM_ADDED' | 'ORDER_CONFIRMED';
}

export interface BrainSessionState {
    sessionId: string;
    isThinking: boolean;
    lastResponse: string;
    error: string | null;
}

export interface UseBrainSessionReturn {
    sessionId: string;
    isThinking: boolean;
    lastResponse: string;
    lastFullResponse: BrainV2Response | null;
    error: string | null;
    conversationHistory: BrainMessage[];
    sendMessage: (text: string) => Promise<BrainV2Response | null>;
    clearHistory: () => void;
    startNewConversation: () => void; // NEW: Manual conversation reset
}

/**
 * Call Brain V2 Pipeline
 * POST /api/brain/v2
 * 
 * This goes through the FSM pipeline:
 * - NLU intent detection
 * - ICM gate validation
 * - Domain handlers
 * - State management
 */
async function callBrainV2(
    sessionId: string,
    text: string,
    options: { includeTTS?: boolean } = {}
): Promise<BrainV2Response> {
    const url = getApiUrl('api/brain/v2');

    const getBrowserCoords = async (): Promise<{ lat: number; lng: number } | null> => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

        return new Promise((resolve) => {
            const timeoutMs = 1200;
            let settled = false;
            const timeoutId = window.setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve(null);
            }, timeoutMs);

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    if (settled) return;
                    settled = true;
                    window.clearTimeout(timeoutId);
                    const lat = Number(pos.coords.latitude);
                    const lng = Number(pos.coords.longitude);
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                        resolve(null);
                        return;
                    }
                    resolve({ lat, lng });
                },
                () => {
                    if (settled) return;
                    settled = true;
                    window.clearTimeout(timeoutId);
                    resolve(null);
                },
                { enableHighAccuracy: false, maximumAge: 120000, timeout: timeoutMs }
            );
        });
    };

    const coords = await getBrowserCoords();

    // 🛒 Pobierz stan koszyka z localStorage, aby wysłać go do backendu
    let cartItems = [];
    let cartRestaurant = null;
    try {
        const cartStr = localStorage.getItem('freeflow_cart');
        const restStr = localStorage.getItem('freeflow_cart_restaurant');
        if (cartStr) cartItems = JSON.parse(cartStr);
        if (restStr) cartRestaurant = JSON.parse(restStr);
    } catch (e) {
        console.warn('Failed to parse cart for backend sync', e);
    }

    const accessToken = await getAccessToken();
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
            session_id: sessionId,
            input: text,
            text: text, // Legacy fallback
            includeTTS: options.includeTTS || false,
            meta: {
                channel: 'web',
                state: {
                    cart: {
                        items: cartItems,
                        restaurantId: cartRestaurant?.id || null,
                        restaurantName: cartRestaurant?.name || null
                    }
                }
            },
            ...(coords ? { lat: coords.lat, lng: coords.lng } : {})
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `Brain error: ${response.statusText}`);
    }

    return data as BrainV2Response;
}

export function useBrainSession(): UseBrainSessionReturn {
    // ═══════════════════════════════════════════════════════════════════════════
    // SESSION LIFECYCLE: One conversation = one session_id
    // When a conversation closes, we switch to newSessionId from backend
    // ═══════════════════════════════════════════════════════════════════════════

    // Session ID - persisted in localStorage, can be updated on lifecycle events
    const [sessionId, setSessionId] = useState(() => {
        const stored = localStorage.getItem("amber-session-id");
        if (isCanonicalSessionId(stored)) return stored;
        const newId = generateSessionId();
        localStorage.setItem("amber-session-id", newId);
        return newId;
    });

    // Conversation history (for UI display)
    const [conversationHistory, setConversationHistory] = useState<BrainMessage[]>([]);

    // UI State
    const [isThinking, setIsThinking] = useState(false);
    const [lastResponse, setLastResponse] = useState("");
    const [lastFullResponse, setLastFullResponse] = useState<BrainV2Response | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Dedupe ref to prevent double sends
    const lastMessageRef = useRef("");

    // Cooldown ref to prevent duplicate input after conversationClosed
    const closedCooldownRef = useRef<number>(0);

    /**
     * Handle session lifecycle boundary.
     * Called when backend closes a conversation.
     * Switches to new session ID for next input.
     */
    const handleConversationClosed = useCallback((response: BrainV2Response) => {
        if (response.conversationClosed && response.newSessionId) {
            const nextSessionId = isCanonicalSessionId(response.newSessionId)
                ? response.newSessionId
                : generateSessionId();
            logger.info(
                `🔒 [SessionLifecycle] Conversation closed: ${response.closedReason}`,
                `| Switching to ${nextSessionId}`
            );

            // STOP TTS ON SESSION CLOSE (User Request #4)
            ttsManager.stop();

            // CRITICAL: Update session ID immediately
            setSessionId(nextSessionId);
            localStorage.setItem("amber-session-id", nextSessionId);

            // Set cooldown to block duplicate input for 1500ms
            closedCooldownRef.current = Date.now();

            // Reset UI-only state (NOT cart, NOT backend)
            setConversationHistory([]);
            lastMessageRef.current = "";

            // Keep lastFullResponse for UI to process actions/cart
        }
    }, []);

    /**
     * Send a message to Brain V2 pipeline.
     * Returns the raw response for the caller to handle as needed.
     */
    const sendMessage = useCallback(async (text: string): Promise<BrainV2Response | null> => {
        const trimmed = text.trim();

        // Cooldown guard: ignore input within 1500ms of conversationClosed
        if (Date.now() - closedCooldownRef.current < 1500) {
            console.log('[useBrainSession] ignored duplicate after conversationClosed');
            return null;
        }

        // Dedupe check
        if (!trimmed || trimmed === lastMessageRef.current) {
            return null;
        }
        lastMessageRef.current = trimmed;


        setIsThinking(true);
        setError(null);
        setLastResponse("");
        setLastFullResponse(null);

        logger.info("🗣️ [useBrainSession] User said:", trimmed);

        try {
            const response = await callBrainV2(sessionId, trimmed, { includeTTS: false });

            const amberReply = response.reply || response.text || "";
            logger.info("🤖 [useBrainSession] Brain replied:", amberReply);
            logger.info(`📊 [useBrainSession] Intent: ${response.intent} | Source: ${response.meta?.source}`);

            setLastResponse(amberReply);
            setLastFullResponse(response);

            // Update conversation history for UI
            setConversationHistory(prev => [
                ...prev,
                { role: 'user', content: trimmed },
                { role: 'assistant', content: amberReply }
            ]);

            // ═══════════════════════════════════════════════════════════════════
            // CONVERSATION BOUNDARY CHECK
            // ═══════════════════════════════════════════════════════════════════
            if (response.conversationClosed) {
                handleConversationClosed(response);
            }

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            if (errorMessage === 'invalid_session_id' || errorMessage === 'missing_session_id') {
                const recoveredSessionId = generateSessionId();
                setSessionId(recoveredSessionId);
                localStorage.setItem('amber-session-id', recoveredSessionId);
            }
            logger.error("❌ [useBrainSession] Brain Error:", errorMessage);
            setError("Przepraszam, mam problem z połączeniem.");
            setLastResponse("");
            return null;
        } finally {
            setIsThinking(false);
        }
    }, [sessionId, handleConversationClosed]);

    /**
     * Clear conversation history (e.g., starts a new conversation)
     */
    const clearHistory = useCallback(() => {
        setConversationHistory([]);
        lastMessageRef.current = "";
        setLastFullResponse(null);
    }, []);

    /**
     * Force start a new conversation (manual reset)
     */
    const startNewConversation = useCallback(() => {
        const newId = generateSessionId();
        logger.info(`🔄 [SessionLifecycle] Manual new conversation: ${newId}`);

        // STOP TTS ON NEW CONVERSATION
        ttsManager.stop();

        setSessionId(newId);
        localStorage.setItem("amber-session-id", newId);
        clearHistory();
    }, [clearHistory]);

    return {
        sessionId,
        isThinking,
        lastResponse,
        lastFullResponse,
        error,
        conversationHistory,
        sendMessage,
        clearHistory,
        startNewConversation // NEW: Manual reset option
    };
}

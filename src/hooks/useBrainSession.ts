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
import { logger } from '../lib/logger';

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

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            input: text,
            text: text, // Legacy fallback
            includeTTS: options.includeTTS || false,
            meta: { channel: 'web' }
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
    
    // Generate session ID helper
    const generateSessionId = () => {
        const ts = Date.now();
        const rand = Math.random().toString(36).substring(2, 8);
        return `sess_${ts}_${rand}`;
    };

    // Session ID - persisted in localStorage, can be updated on lifecycle events
    const [sessionId, setSessionId] = useState(() => {
        const stored = localStorage.getItem("amber-session-id");
        if (stored) return stored;
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

    /**
     * Handle session lifecycle boundary.
     * Called when backend closes a conversation.
     * Switches to new session ID for next input.
     */
    const handleConversationClosed = useCallback((response: BrainV2Response) => {
        if (response.conversationClosed && response.newSessionId) {
            logger.info(
                `🔒 [SessionLifecycle] Conversation closed: ${response.closedReason}`,
                `| Switching to ${response.newSessionId}`
            );
            
            // CRITICAL: Update session ID immediately
            setSessionId(response.newSessionId);
            localStorage.setItem("amber-session-id", response.newSessionId);
            
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
            logger.info("📊 [useBrainSession] Intent:", response.intent, "| Source:", response.meta?.source);

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

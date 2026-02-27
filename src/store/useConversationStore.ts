import { create } from 'zustand';
import { getApiUrl } from '../lib/config';

interface ConversationState {
    sessionId: string;
    isThinking: boolean;
    error: string | null;
    lastResponse: string;

    // Backend session state mapped directly
    conversationPhase: 'idle' | 'restaurant_selected' | 'ordering' | 'checkout' | 'unknown' | string;
    currentRestaurant: any | null;
    pendingOrder: any | null;
    cart: any | null;
    expectedContext: string | null;
    conversationClosed: boolean;

    // History & Dev
    conversationHistory: { role: string; content: string }[];
    lastContext: any | null;
    lastFullResponse: any | null;

    suggestedRestaurants: any[] | null;
    selectedRestaurantPreviewId: string | null;
    menuItems: any[] | null;

    // Misc Context
    lastIntent: string | null;
    lastSource: string | null;

    // Actions
    setSessionId: (id: string) => void;
    sendMessage: (text: string) => Promise<void>;
    resetSession: () => void;
    setSelectedRestaurantPreviewId: (id: string | null) => void;
    handleOrderSuccess: () => void;
}

const generateSessionId = () => `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

export const useConversationStore = create<ConversationState>((set, get) => ({
    sessionId: localStorage.getItem('amber-session-id') || generateSessionId(),
    isThinking: false,
    error: null,
    lastResponse: '',

    conversationPhase: 'idle',
    currentRestaurant: null,
    pendingOrder: null,
    cart: null,
    expectedContext: null,
    conversationClosed: false,

    conversationHistory: [],
    lastContext: null,
    lastFullResponse: null,

    suggestedRestaurants: null,
    selectedRestaurantPreviewId: null,
    menuItems: null,

    lastIntent: null,
    lastSource: null,

    setSelectedRestaurantPreviewId: (id) => set({ selectedRestaurantPreviewId: id }),

    setSessionId: (id) => {
        localStorage.setItem('amber-session-id', id);
        set({ sessionId: id });
    },

    handleOrderSuccess: () => {
        console.log('[POST_SUBMIT_RESET] Resetting all UI state after order success');
        set({
            cart: null,
            pendingOrder: null,
            expectedContext: null,
            conversationPhase: 'idle',
            currentRestaurant: null,
            lastFullResponse: null,
            // Full UI reset
            suggestedRestaurants: null,
            selectedRestaurantPreviewId: null,
            menuItems: null,
            lastIntent: null,
        });
    },

    resetSession: () => {
        const newId = generateSessionId();
        localStorage.setItem('amber-session-id', newId);
        set({
            sessionId: newId,
            conversationPhase: 'idle',
            currentRestaurant: null,
            pendingOrder: null,
            cart: null,
            expectedContext: null,
            conversationClosed: false,
            conversationHistory: [],
            lastContext: null,
            lastResponse: '',
            error: null,
            suggestedRestaurants: null,
            selectedRestaurantPreviewId: null,
            lastIntent: null,
            lastSource: null
        });
    },

    sendMessage: async (text: string) => {
        const { sessionId, conversationHistory } = get();
        const trimmed = text.trim();
        if (!trimmed) return;

        set({
            isThinking: true,
            error: null,
            conversationHistory: [...conversationHistory, { role: 'user', content: trimmed }]
        });

        try {
            const url = getApiUrl('api/brain/v2');

            // Get Coords
            const getBrowserCoords = async (): Promise<{ lat: number; lng: number } | null> => {
                if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
                return new Promise((resolve) => {
                    const timeoutMs = 1200;
                    let settled = false;
                    const timeoutId = window.setTimeout(() => { if (!settled) { settled = true; resolve(null); } }, timeoutMs);
                    navigator.geolocation.getCurrentPosition(
                        (pos) => { if (!settled) { settled = true; window.clearTimeout(timeoutId); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); } },
                        () => { if (!settled) { settled = true; window.clearTimeout(timeoutId); resolve(null); } },
                        { enableHighAccuracy: false, maximumAge: 120000, timeout: timeoutMs }
                    );
                });
            };
            const coords = await getBrowserCoords();

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    input: trimmed,
                    text: trimmed,
                    includeTTS: false,
                    meta: { channel: 'web' },
                    ...(coords ? { lat: coords.lat, lng: coords.lng } : {})
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Brain error');

            const amberReply = data.reply || data.text || '';
            const ctx = data.context || {};

            const newHistory = [...get().conversationHistory, { role: 'assistant', content: amberReply }];

            const newPhase = ctx.conversationPhase || 'idle';
            const isIdle = newPhase === 'idle';
            console.debug('[FSM_PHASE]', newPhase);

            // Check for order_success event or order_complete intent from backend
            const isOrderSuccess = data.intent === 'order_success'
                || data.intent === 'order_complete'
                || data.intent === 'confirm_order'
                || data.intent === 'order_confirmed'
                || data.actions?.some((a: any) =>
                    a.type === 'order_success' || a.type === 'CONFIRM_ORDER' || a.type === 'order_confirmed'
                );

            if (isOrderSuccess) {
                console.log('[POST_SUBMIT_RESET]', get());

                set({
                    isThinking: false,
                    lastResponse: amberReply,
                    conversationHistory: newHistory,
                    lastContext: ctx,
                    lastFullResponse: data,
                    conversationPhase: 'idle',
                    currentRestaurant: null,
                    pendingOrder: null,
                    cart: null,
                    expectedContext: null,
                    conversationClosed: data.conversationClosed || false,
                    suggestedRestaurants: null,
                    selectedRestaurantPreviewId: null,
                    menuItems: null,
                    lastIntent: data.intent || null,
                    lastSource: data.meta?.source || null,
                });
                return;
            }

            set({
                isThinking: false,
                lastResponse: amberReply,
                conversationHistory: newHistory,
                lastContext: ctx,
                lastFullResponse: data,

                // Map Backend FSM
                conversationPhase: newPhase,

                // Retain currentRestaurant UNLESS entering idle
                currentRestaurant: isIdle ? null : (ctx.currentRestaurant || get().currentRestaurant),

                // Retain pending order and cart. Cart persists across sessions until order success.
                pendingOrder: isIdle ? null : (ctx.pendingOrder || get().pendingOrder),
                cart: data.meta?.cart || ctx.cart || get().cart,

                expectedContext: ctx.expectedContext || null,
                conversationClosed: data.conversationClosed || false,

                // Map UI Only State from response
                suggestedRestaurants: isIdle ? (data.restaurants?.length ? data.restaurants : null) : get().suggestedRestaurants,
                selectedRestaurantPreviewId: isIdle ? (data.restaurants?.length ? data.restaurants[0].id : null) : get().selectedRestaurantPreviewId,

                // Retain menuItems if omitted by backend during clarify_order
                menuItems: isIdle ? null : (data.menuItems || get().menuItems),

                lastIntent: data.intent || null,
                lastSource: data.meta?.source || null,
            });

            if (data.conversationClosed && data.newSessionId) {
                // Automatically cycle session when conversation is closed
                setTimeout(() => {
                    get().setSessionId(data.newSessionId);
                    set({
                        conversationHistory: [],
                        conversationClosed: false,
                        expectedContext: null,
                        pendingOrder: null,
                        // Keeping cart up to date across sessions
                        // cart: null -> do not clear cart, it crosses session boundaries!
                    });
                }, 3000); // Small delay to let UI show the final message
            }

        } catch (err) {
            set({
                isThinking: false,
                error: err instanceof Error ? err.message : 'Unknown error'
            });
        }
    }
}));

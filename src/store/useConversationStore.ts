import { create } from 'zustand';
import { getApiUrl } from '../lib/config';
import { repairMojibakeText } from '../lib/textSanitizer';
import { normalizeMenuItems, normalizeRestaurants } from '../lib/normalizeData';

interface ConversationState {
    sessionId: string;
    isThinking: boolean;
    error: string | null;
    lastResponse: string;
    uiMode: 'list' | 'restaurant' | 'checkout';
    conversationPhase: 'idle' | 'restaurant_selected' | 'ordering' | 'checkout' | 'unknown' | string;
    currentRestaurant: any | null;
    pendingOrder: any | null;
    cart: any | null;
    expectedContext: string | null;
    conversationClosed: boolean;
    closedReason: string | null;
    orderFinalized: boolean;
    conversationHistory: { role: string; content: string }[];
    lastContext: any | null;
    lastFullResponse: any | null;
    suggestedRestaurants: any[] | null;
    selectedRestaurantPreviewId: string | null;
    menuItems: any[] | null;
    lastIntent: string | null;
    lastSource: string | null;
    setSessionId: (id: string) => void;
    sendMessage: (text: string) => Promise<void>;
    resetSession: () => void;
    closeMenuContext: () => void;
    clearHomeContext: () => void;
    setSelectedRestaurantPreviewId: (id: string | null) => void;
    handleOrderSuccess: () => void;
}

const generateSessionId = () => `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;


export const useConversationStore = create<ConversationState>((set, get) => ({
    sessionId: (() => {
        // Always generate a fresh session on page load to prevent stale FSM state restore.
        // Session continuity within a tab is maintained by the store; cross-tab/reload resume
        // is intentionally disabled to avoid ghost ordering states (BUG NEW-3).
        const newId = generateSessionId();
        localStorage.setItem('amber-session-id', newId);
        return newId;
    })(),
    isThinking: false,
    error: null,
    lastResponse: '',
    uiMode: 'list',
    conversationPhase: 'idle',
    currentRestaurant: null,
    pendingOrder: null,
    cart: null,
    expectedContext: null,
    conversationClosed: false,
    closedReason: null,
    orderFinalized: false,
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
            uiMode: 'list',
            conversationPhase: 'idle',
            currentRestaurant: null,
            lastFullResponse: null,
            conversationClosed: false,
            closedReason: null,
            orderFinalized: false,
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
            uiMode: 'list',
            conversationPhase: 'idle',
            currentRestaurant: null,
            pendingOrder: null,
            cart: null,
            expectedContext: null,
            conversationClosed: false,
            closedReason: null,
            orderFinalized: false,
            conversationHistory: [],
            lastContext: null,
            lastResponse: '',
            error: null,
            suggestedRestaurants: null,
            selectedRestaurantPreviewId: null,
            menuItems: null,
            lastIntent: null,
            lastSource: null
        });
    },

    closeMenuContext: () => {
        set((state) => ({
            ...state,
            uiMode: 'list',
            conversationPhase: 'idle',
            currentRestaurant: null,
            menuItems: null,
            expectedContext: null,
            selectedRestaurantPreviewId: null,
            lastFullResponse: null,
            lastResponse: '',
        }));
    },

    clearHomeContext: () => {
        set((state) => ({
            ...state,
            uiMode: 'list',
            conversationPhase: 'idle',
            currentRestaurant: null,
            pendingOrder: null,
            expectedContext: null,
            conversationClosed: false,
            closedReason: null,
            orderFinalized: false,
            lastContext: null,
            lastFullResponse: null,
            lastResponse: '',
            suggestedRestaurants: null,
            selectedRestaurantPreviewId: null,
            menuItems: null,
            lastIntent: null,
            lastSource: null,
        }));
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

            const fetchController = new AbortController();
            const fetchTimeoutId = window.setTimeout(() => fetchController.abort(), 20000);

            let response: Response;
            try {
                response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: sessionId,
                        input: trimmed,
                        text: trimmed,
                        includeTTS: false,
                        meta: { channel: 'web' },
                        ...(coords ? { lat: coords.lat, lng: coords.lng } : {})
                    }),
                    signal: fetchController.signal
                });
            } finally {
                window.clearTimeout(fetchTimeoutId);
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Brain error');

            const rawReply = repairMojibakeText(data.reply || data.text || '');
            // Show fallback only when there is no reply AND no visible UI content (restaurants/menu).
            // A phase-only change with no visible content should still show a fallback (T06/T08).
            const hasVisibleContent = !!(data.restaurants?.length || data.menuItems?.length || data.menu);
            const amberReply = rawReply || (hasVisibleContent ? '' : 'Przepraszam, coś poszło nie tak. Spróbuj jeszcze raz.');
            const hasContext = !!data.context;
            const ctx = data.context || {};
            const restaurantsFromResponse = normalizeRestaurants(data.restaurants || ctx.last_restaurants_list || null);
            const menuFromResponse = normalizeMenuItems(data.menu || data.menuItems || ctx.last_menu || null);
            const newHistory = [...get().conversationHistory, { role: 'assistant', content: amberReply }];

            let newPhase = ctx.conversationPhase;
            if (!hasContext) {
                console.warn('⚠️ [useConversationStore] Backend response missing `context`. Retaining current FSM phase to prevent UI reset.');
                newPhase = get().conversationPhase;
            } else if (!newPhase) {
                // Context exists but backend didn't include conversationPhase — retain current
                // to avoid spurious reset to idle (T04: ordering→idle desynchro).
                newPhase = get().conversationPhase || 'idle';
                console.debug('[FSM_PHASE] context present but no phase — retained:', newPhase);
            }
            // When find_nearby returns fresh restaurants, treat as discovery/idle regardless
            // of whatever phase the backend carried over. This covers the case where the user
            // was in restaurant_selected and says "show me restaurants again" — the backend may
            // keep phase=restaurant_selected in its FSM, but the UI should return to list mode.
            const isFindNearby = data.intent === 'find_nearby' && !!restaurantsFromResponse?.length;
            if (isFindNearby) newPhase = 'idle';

            const currentUiMode = get().uiMode;
            const nextIntent = data.intent || null;
            let nextUiMode: ConversationState['uiMode'] = currentUiMode;
            if (nextIntent === 'find_nearby') {
                nextUiMode = 'list';
            } else if (nextIntent === 'select_restaurant' || nextIntent === 'show_menu' || nextIntent === 'menu_request') {
                nextUiMode = 'restaurant';
            } else if (nextIntent === 'open_checkout') {
                nextUiMode = 'checkout';
            }

            const isIdle = newPhase === 'idle';
            console.debug('[FSM_PHASE]', newPhase, hasContext ? '' : '(retained)');
            console.debug('[UI_STATE] listVisible:', isIdle && !!restaurantsFromResponse?.length, 'resultsCount:', restaurantsFromResponse?.length ?? 0, 'focusedRestaurant:', isFindNearby ? null : get().selectedRestaurantPreviewId, 'mode:', newPhase);
            console.debug(`[UI_MODE] mode=${nextUiMode}`);
            console.debug(`[UI_MODE] resultsCount=${restaurantsFromResponse?.length ?? 0}`);
            console.debug(`[UI_MODE] currentRestaurant=${ctx.currentRestaurant?.name || data.currentRestaurant?.name || get().currentRestaurant?.name || 'null'}`);

            const isOrderSuccess = data.intent === 'order_success'
                || data.intent === 'order_complete'
                || data.intent === 'order_confirmed'
                || (data.conversationClosed === true && data.closedReason === 'ORDER_CONFIRMED')
                || data.actions?.some((a: any) => a.type === 'order_success' || a.type === 'order_confirmed');

            if (isOrderSuccess) {
                set({
                    isThinking: false,
                    lastResponse: amberReply,
                    conversationHistory: newHistory,
                    lastContext: ctx,
                    lastFullResponse: data,
                    uiMode: 'list',
                    conversationPhase: 'idle',
                    currentRestaurant: null,
                    pendingOrder: null,
                    cart: null,
                    expectedContext: null,
                    conversationClosed: data.conversationClosed || false,
                    closedReason: data.closedReason || data.meta?.closedReason || null,
                    orderFinalized: true,
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
                uiMode: nextUiMode,
                conversationPhase: newPhase,
                currentRestaurant: (isIdle && hasContext) ? null : (isFindNearby ? null : (ctx.currentRestaurant || data.currentRestaurant || get().currentRestaurant)),
                pendingOrder: (isIdle && hasContext) ? null : (ctx.pendingOrder || get().pendingOrder),
                cart: data.meta?.cart || ctx.cart || get().cart,
                // When phase resets to idle (or find_nearby forces discovery), clear expectedContext to prevent UI desynchro (P4)
                expectedContext: (isIdle || isFindNearby) ? null : (hasContext ? (ctx.expectedContext || null) : get().expectedContext),
                conversationClosed: data.conversationClosed || false,
                closedReason: data.closedReason || data.meta?.closedReason || null,
                orderFinalized: false,
                suggestedRestaurants: (restaurantsFromResponse && restaurantsFromResponse.length > 0) ? restaurantsFromResponse : (isIdle ? null : get().suggestedRestaurants),
                selectedRestaurantPreviewId: restaurantsFromResponse?.[0]?.id || (isIdle ? null : get().selectedRestaurantPreviewId),
                menuItems: menuFromResponse || (isIdle ? null : get().menuItems),
                lastIntent: data.intent || null,
                lastSource: data.meta?.source || null,
            });

            if (data.conversationClosed && data.newSessionId) {
                setTimeout(() => {
                    get().setSessionId(data.newSessionId);
                    set({
                        conversationHistory: [],
                        conversationClosed: false,
                        closedReason: null,
                        expectedContext: null,
                        pendingOrder: null,
                    });
                }, 3000);
            }

        } catch (err) {
            const isTimeout = err instanceof Error && err.name === 'AbortError';
            set({
                isThinking: false,
                lastResponse: isTimeout ? 'Przepraszam, odpowiedź trwa zbyt długo. Spróbuj jeszcze raz.' : '',
                error: isTimeout ? null : (err instanceof Error ? err.message : 'Unknown error')
            });
        }
    }
}));

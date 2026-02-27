/**
 * usePostOrderReset.ts
 * ═══════════════════════════════════════════════════════════════════════════
 * RESET UI PO POTWIERDZENIU ZAMÓWIENIA
 *
 * Nasłuchuje na zmianę conversationPhase → 'idle' po wcześniejszym stanie
 * 'checkout' lub 'ordering'. Gdy wykryje tę tranzycję:
 *   1. Czyści presentationItems + mode w useUI (wyspy restauracji/menu)
 *   2. Zamyka koszyk (setIsOpen(false))
 *   3. Czyści koszyk (clearCart)
 *   4. Resetuje ConversationStore (suggestedRestaurants, currentRestaurant, itp.)
 *
 * ZASADY:
 * - Nie modyfikuje backendu
 * - Nie zmienia FSM
 * - Nie rusza testów
 * - Wyłącznie synchronizacja UI ze stanem
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from 'react';
import { useConversationStore } from '../store/useConversationStore';
import { useUI } from '../state/ui';
import { useCart } from '../state/CartContext';

export function usePostOrderReset() {
    const conversationPhase = useConversationStore(s => s.conversationPhase);
    const lastIntent = useConversationStore(s => s.lastIntent);
    const handleOrderSuccess = useConversationStore(s => s.handleOrderSuccess);
    const clearPresentation = useUI(s => s.clearPresentation);

    const cart = useCart() as any;
    const clearCart = cart?.clearCart;
    const setIsOpen = cart?.setIsOpen;

    // Track previous phase to detect transition (checkout/ordering → idle)
    const prevPhaseRef = useRef<string>(conversationPhase);
    const resetDoneForSessionRef = useRef<string | null>(null);

    useEffect(() => {
        const prev = prevPhaseRef.current;
        const curr = conversationPhase;
        prevPhaseRef.current = curr;

        // Intents that trigger reset
        const CONFIRM_INTENTS = [
            'confirm_order', 'order_confirmed', 'order_success', 'order_complete'
        ];

        // Phases that precede a "done order" state
        const ORDER_PHASES = ['checkout', 'ordering', 'confirming_order'];

        const isTransitionToIdle = curr === 'idle' && ORDER_PHASES.includes(prev);
        const isConfirmIntent = lastIntent && CONFIRM_INTENTS.includes(lastIntent);

        const shouldReset = isTransitionToIdle || isConfirmIntent;

        if (!shouldReset) return;

        // Deduplicate: don't fire twice for same conversationPhase transition
        const resetKey = `${prev}->${curr}-${lastIntent}`;
        if (resetDoneForSessionRef.current === resetKey) return;
        resetDoneForSessionRef.current = resetKey;

        console.log('[usePostOrderReset] 🔄 Order confirmed detected. Resetting UI...', {
            prevPhase: prev,
            currPhase: curr,
            lastIntent,
        });

        // 1. Clear ConversationStore (suggestedRestaurants, currentRestaurant, etc.)
        handleOrderSuccess();

        // 2. Clear presentation islands (ContextualIsland / SuggestedRestaurantsCarousel)
        clearPresentation();

        // 3. Close cart drawer
        if (setIsOpen) {
            setIsOpen(false);
            console.log('[usePostOrderReset] ✅ Cart drawer closed');
        }

        // 4. Clear cart items (slight delay to let UI animate close first)
        setTimeout(() => {
            if (clearCart) {
                clearCart();
                console.log('[usePostOrderReset] ✅ Cart cleared');
            }
        }, 800);

    }, [conversationPhase, lastIntent, handleOrderSuccess, clearPresentation, clearCart, setIsOpen]);
}

import { useEffect, useRef } from 'react';
import { useConversationStore } from '../store/useConversationStore';
import { useUI } from '../state/ui';
import { useCart } from '../state/CartContext';

export function usePostOrderReset() {
    const conversationPhase = useConversationStore(s => s.conversationPhase);
    const orderFinalized = useConversationStore(s => s.orderFinalized);
    const closedReason = useConversationStore(s => s.closedReason);
    const handleOrderSuccess = useConversationStore(s => s.handleOrderSuccess);
    const clearPresentation = useUI(s => s.clearPresentation);

    const cart = useCart() as any;
    const resetCartLocal = cart?.resetCartLocal;
    const setIsOpen = cart?.setIsOpen;

    const prevPhaseRef = useRef<string>(conversationPhase);
    const resetDoneForKeyRef = useRef<string | null>(null);

    useEffect(() => {
        const prev = prevPhaseRef.current;
        const curr = conversationPhase;
        prevPhaseRef.current = curr;

        const ORDER_PHASES = ['checkout', 'ordering', 'confirming_order'];
        const transitionedFromOrderFlow = curr === 'idle' && ORDER_PHASES.includes(prev);
        const isBackendFinalized = orderFinalized || closedReason === 'ORDER_CONFIRMED';

        if (!isBackendFinalized || !transitionedFromOrderFlow) {
            return;
        }

        const resetKey = `${prev}->${curr}-${closedReason}`;
        if (resetDoneForKeyRef.current === resetKey) return;
        resetDoneForKeyRef.current = resetKey;

        console.log('[usePostOrderReset] Resetting finalized order UI', {
            prevPhase: prev,
            currPhase: curr,
            closedReason,
        });

        handleOrderSuccess();
        clearPresentation();

        if (setIsOpen) {
            setIsOpen(false);
            console.log('[usePostOrderReset] Cart drawer closed');
        }

        setTimeout(() => {
            if (resetCartLocal) {
                resetCartLocal({ clearRestaurant: true, closeDrawer: true, silent: true });
                console.log('[usePostOrderReset] Cart reset locally');
            }
        }, 300);

    }, [conversationPhase, orderFinalized, closedReason, handleOrderSuccess, clearPresentation, resetCartLocal, setIsOpen]);
}

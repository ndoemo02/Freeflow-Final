import { useStore } from 'zustand';
import { useConversationStore } from '../store/useConversationStore';

export function useConversationUIState() {
    const phase = useConversationStore(state => state.conversationPhase);
    const currentRestaurant = useConversationStore(state => state.currentRestaurant);
    const pendingOrder = useConversationStore(state => state.pendingOrder);
    const cart = useConversationStore(state => state.cart);
    const expectedContext = useConversationStore(state => state.expectedContext);
    const conversationClosed = useConversationStore(state => state.conversationClosed);

    return {
        isIdle: phase === 'idle',
        isRestaurantSelected: currentRestaurant !== null,
        isOrdering: phase === 'ordering' || !!pendingOrder,
        isConfirmingOrder: expectedContext === 'confirm_order',
        isChoosingRestaurant: expectedContext === 'select_restaurant',
        isDisambiguatingMenu: expectedContext === 'clarify_order',
        isClarifyingOrder: expectedContext === 'clarify_order',

        // Checks flags
        hasCurrentRestaurant: currentRestaurant !== null,
        hasPendingOrder: pendingOrder && Object.keys(pendingOrder).length > 0,
        hasCartItems: cart?.items && cart.items.length > 0,
        isClosed: conversationClosed,

        // Explicit entity shortcuts
        restaurantName: currentRestaurant?.name || null,
        cartItemsCount: cart?.items?.length || 0,
        pendingOrderTotal: pendingOrder?.total || null
    };
}

import { BrainV2Response } from '../hooks/useBrainSession';
import { UIHints } from '../types/uiHints';
import { useConversationStore } from '../store/useConversationStore';

export function deriveUIHints(response: BrainV2Response): UIHints {
    if (!response) {
        return { panel: 'none' };
    }

    // Explicit restaurants list mapping goes first if it exists
    if (response.restaurants && response.restaurants.length > 0) {
        return { panel: 'restaurants' };
    }

    // Business / Stats / KDS
    if (response.businessStats || response.orders) {
        return { panel: 'business' };
    }

    const intent = response.intent || '';
    if (intent.includes('kds') || intent === 'show_kds' || intent === 'kitchen_display') {
        return { panel: 'kds' };
    }
    if (intent.includes('business') || intent === 'show_stats' || intent === 'admin_panel') {
        return { panel: 'business' };
    }

    // Menu logic: derive strictly from presence of currentRestaurant
    const state = useConversationStore.getState();
    const hasRestaurant = !!response.currentRestaurant || (response.context && !!response.context.currentRestaurant) || !!state.currentRestaurant;
    const phase = response.context?.conversationPhase || state.conversationPhase || 'unknown';

    // Prevent menu unmount on clarify
    if (hasRestaurant && phase !== 'idle') {
        const restaurantId = response.currentRestaurant?.id || response.context?.currentRestaurant?.id || state.currentRestaurant?.id;
        return { panel: 'menu', context: { restaurantId } };
    }

    return { panel: 'none' };
}

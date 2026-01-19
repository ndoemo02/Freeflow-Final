import { BrainV2Response } from '../hooks/useBrainSession';
import { UIHints } from '../types/uiHints';

export function deriveUIHints(response: BrainV2Response): UIHints {
    if (!response) {
        return { panel: 'none' };
    }

    // 1. Check for explicit restaurants logic
    if (response.restaurants && response.restaurants.length > 0) {
        return { panel: 'restaurants' };
    }

    // 2. Check for explicit menu logic
    if (response.menuItems && response.menuItems.length > 0) {
        return { panel: 'menu', context: { restaurantId: response.currentRestaurant?.id } };
    }

    // 3. Check for business/stats data
    if (response.businessStats || response.orders) {
        return { panel: 'business' };
    }

    // 4. Fallback: Intent-based hints (Safe Adapter Pattern)
    const intent = response.intent || '';

    if (intent.includes('kds') || intent === 'show_kds' || intent === 'kitchen_display') {
        return { panel: 'kds' };
    }

    if (intent.includes('business') || intent === 'show_stats' || intent === 'admin_panel') {
        return { panel: 'business' };
    }

    return { panel: 'none' };
}

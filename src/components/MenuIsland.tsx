/**
 * MenuIsland.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 * PRAWA STREFA LAYOUTU — Menu restauracji
 *
 * Renderowana jest tylko gdy conversationPhase === 'restaurant_selected'
 * lub conversationPhase === 'ordering'.
 *
 * ZASADY:
 * - Pozycja: fixed, prawa strona (right-4), środek ekranu (top-1/2)
 * - Nie przykrywa całego ekranu
 * - Nie resetuje slidera po lewej stronie
 * - Nie blokuje drag lewej wyspy
 * - Logika menu bez zmian (dane z useConversationStore)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { useConversationStore } from '../store/useConversationStore';
import ContextualIsland from './ContextualIsland';

const MENU_PHASES = ['restaurant_selected', 'ordering'];

export default function MenuIsland() {
    const conversationPhase = useConversationStore(s => s.conversationPhase);
    const menuItems = useConversationStore(s => s.menuItems);
    const currentRestaurant = useConversationStore(s => s.currentRestaurant);

    // We need a local highlightedId for MenuIsland so it can track its own carousel
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    const isVisible = MENU_PHASES.includes(conversationPhase);

    if (!isVisible || !menuItems || menuItems.length === 0) return null;

    // Set initial highlighted id if null
    if (highlightedId === null && menuItems.length > 0) {
        setHighlightedId(menuItems[0].menuItemId || menuItems[0].id || String(Math.random()));
    }

    return (
        <ContextualIsland
            items={menuItems}
            type="menu"
            position="right"
            highlightedId={highlightedId}
            setHighlightedId={setHighlightedId}
            onSelect={(item) => {
                window.dispatchEvent(new CustomEvent('freeflow:orderItem', {
                    detail: { item, restaurant: currentRestaurant }
                }));
            }}
        />
    );
}

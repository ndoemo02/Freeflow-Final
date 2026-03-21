import React, { useEffect, useMemo, useState } from 'react';
import { useConversationStore } from '../store/useConversationStore';
import ContextualIsland from './ContextualIsland';

const MENU_PHASES = ['restaurant_selected', 'ordering'];

function normalizeText(value: string = '') {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function pickRecommendedMenuId(items: any[], response: any) {
    if (!items?.length) return null;
    const replyText = normalizeText(response?.reply || response?.text || response?.tts?.text || '');
    const explicitDish = normalizeText(response?.context?.pendingOrder?.items?.[0]?.name || response?.meta?.dish || '');

    for (const item of items) {
        const itemName = normalizeText(item.name || item.base_name || '');
        if (!itemName) continue;
        if (explicitDish && explicitDish.includes(itemName)) return item.id || item.menuItemId || item.menu_item_id;
        if (replyText.includes(itemName)) return item.id || item.menuItemId || item.menu_item_id;
    }

    return items[0]?.id || items[0]?.menuItemId || items[0]?.menu_item_id || null;
}

export default function MenuIsland() {
    const conversationPhase = useConversationStore(s => s.conversationPhase);
    const menuItems = useConversationStore(s => s.menuItems);
    const currentRestaurant = useConversationStore(s => s.currentRestaurant);
    const lastFullResponse = useConversationStore(s => s.lastFullResponse);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    const isVisible = MENU_PHASES.includes(conversationPhase);
    const recommendedId = useMemo(() => pickRecommendedMenuId(menuItems || [], lastFullResponse), [menuItems, lastFullResponse]);

    useEffect(() => {
        const onCartUpdated = (event: Event) => {
            const detail = (event as CustomEvent)?.detail || {};
            const lastAddedRaw = String(detail?.lastAdded || '').trim();
            if (!lastAddedRaw || !Array.isArray(menuItems) || menuItems.length === 0) {
                return;
            }

            const normalizedLastAdded = normalizeText(lastAddedRaw);
            const matched = menuItems.find((item) => {
                const candidate = normalizeText(item?.name || item?.base_name || '');
                if (!candidate) return false;
                return candidate === normalizedLastAdded
                    || candidate.includes(normalizedLastAdded)
                    || normalizedLastAdded.includes(candidate);
            });

            if (!matched) return;

            const nextId = matched.id || matched.menuItemId || matched.menu_item_id || null;
            if (nextId) {
                setHighlightedId(nextId);
            }
        };

        window.addEventListener('freeflow:cartUpdated', onCartUpdated as EventListener);
        return () => {
            window.removeEventListener('freeflow:cartUpdated', onCartUpdated as EventListener);
        };
    }, [menuItems]);

    useEffect(() => {
        if (!menuItems?.length) {
            setHighlightedId(null);
            return;
        }

        const hasCurrentSelection = highlightedId
            ? menuItems.some((item) => (item.id || item.menuItemId || item.menu_item_id) === highlightedId)
            : false;

        if (hasCurrentSelection) return;

        if (recommendedId && menuItems.some((item) => (item.id || item.menuItemId || item.menu_item_id) === recommendedId)) {
            setHighlightedId(recommendedId);
            return;
        }

        setHighlightedId(menuItems[0].id || menuItems[0].menuItemId || menuItems[0].menu_item_id || null);
    }, [menuItems, recommendedId, highlightedId]);

    if (!isVisible || !menuItems || menuItems.length === 0) return null;

    return (
        <ContextualIsland
            items={menuItems}
            type="menu"
            position="right"
            highlightedId={highlightedId}
            setHighlightedId={setHighlightedId}
            recommendedId={recommendedId}
            title={currentRestaurant?.name ? `Menu: ${currentRestaurant.name}` : 'Menu restauracji'}
            subtitle={currentRestaurant?.city || currentRestaurant?.address || 'Pozycje aktualnie widoczne dla tej restauracji'}
            onSelect={(item) => {
                window.dispatchEvent(new CustomEvent('freeflow:orderItem', {
                    detail: { item, restaurant: currentRestaurant }
                }));
            }}
        />
    );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConversationStore } from '../store/useConversationStore';
import ContextualIsland from './ContextualIsland';

const MENU_PHASES = ['restaurant_selected', 'ordering'];

function normalizeId(value: unknown): string {
    return String(value ?? '');
}

function normalizeText(value: string = '') {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function findDishInTranscript(transcript: string, items: any[]): string | null {
    if (!transcript || !items?.length) return null;
    const normalizedTranscript = normalizeText(transcript);
    if (normalizedTranscript.length < 4) return null;

    let bestMatch: { id: string; nameLen: number } | null = null;

    for (const item of items) {
        const itemName = normalizeText(item.name || item.base_name || '');
        if (!itemName || itemName.length < 3) continue;
        if (normalizedTranscript.includes(itemName)) {
            if (!bestMatch || itemName.length > bestMatch.nameLen) {
                const id = String(item.id || item.menuItemId || item.menu_item_id || '');
                if (id) {
                    bestMatch = { id, nameLen: itemName.length };
                }
            }
        }
    }

    return bestMatch?.id ?? null;
}

function pickRecommendedMenuId(items: any[], response: any) {
    if (!items?.length) return null;

    // Priority 1: explicit focusedMenuItemId from backend meta (Menu Deep Dive)
    const focusedId = response?.meta?.focusedMenuItemId;
    if (focusedId) {
        const id = normalizeId(focusedId);
        if (items.some((item) => normalizeId(item.id || item.menuItemId || item.menu_item_id) === id)) {
            return id;
        }
    }

    // Priority 2: text-based matching from reply
    const replyText = normalizeText(response?.reply || response?.text || response?.tts?.text || '');
    const explicitDish = normalizeText(response?.context?.pendingOrder?.items?.[0]?.name || response?.meta?.dish || '');

    for (const item of items) {
        const itemName = normalizeText(item.name || item.base_name || '');
        if (!itemName) continue;
        if (explicitDish && explicitDish.includes(itemName)) return normalizeId(item.id || item.menuItemId || item.menu_item_id);
        if (replyText.includes(itemName)) return normalizeId(item.id || item.menuItemId || item.menu_item_id);
    }

    return normalizeId(items[0]?.id || items[0]?.menuItemId || items[0]?.menu_item_id || null);
}

export default function MenuIsland() {
    const conversationPhase = useConversationStore(s => s.conversationPhase);
    const uiMode = useConversationStore(s => s.uiMode);
    const menuItems = useConversationStore(s => s.menuItems);
    const currentRestaurant = useConversationStore(s => s.currentRestaurant);
    const suggestedRestaurants = useConversationStore(s => s.suggestedRestaurants);
    const lastFullResponse = useConversationStore(s => s.lastFullResponse);

    // Enrich currentRestaurant with full data (photo_gallery etc.) from suggestedRestaurants
    const enrichedRestaurant = useMemo(() => {
        if (!currentRestaurant) return null;
        const currentId = normalizeId(currentRestaurant?.id);
        const currentName = normalizeText(currentRestaurant?.name || '');
        const full = Array.isArray(suggestedRestaurants)
            ? suggestedRestaurants.find((r: any) => {
                const candidateId = normalizeId(r?.id);
                if (candidateId && currentId && candidateId === currentId) return true;
                const candidateName = normalizeText(r?.display_name || r?.name || '');
                return !!(candidateName && currentName && candidateName === currentName);
            })
            : null;
        return full || currentRestaurant;
    }, [currentRestaurant, suggestedRestaurants]);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const menuBackStatePushedRef = useRef(false);

    const isVisible = uiMode === 'restaurant' || MENU_PHASES.includes(conversationPhase);
    const recommendedId = useMemo(() => pickRecommendedMenuId(menuItems || [], lastFullResponse), [menuItems, lastFullResponse]);
    const closeMenuContext = useCallback(() => {
        useConversationStore.getState().closeMenuContext();
    }, []);

    useEffect(() => {
        const renderVisible = isVisible && !!menuItems?.length;
        console.log(`[LIVE_MENU] renderVisible=${renderVisible}`);
    }, [isVisible, menuItems?.length]);

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

            const nextId = normalizeId(matched.id || matched.menuItemId || matched.menu_item_id || null);
            if (nextId) {
                setHighlightedId(nextId);
            }
        };

        window.addEventListener('freeflow:cartUpdated', onCartUpdated as EventListener);
        return () => {
            window.removeEventListener('freeflow:cartUpdated', onCartUpdated as EventListener);
        };
    }, [menuItems]);

    // Live speech-to-dish synchronization:
    // When Amber discusses a dish by name, highlight it in the menu view.
    useEffect(() => {
        if (!isVisible) return;

        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        let pendingMatchId: string | null = null;

        const onAssistantSpeechPart = (rawEvent: Event) => {
            const event = rawEvent as CustomEvent<any>;
            const eventSessionId = String(event?.detail?.sessionId || '').trim();
            const currentSessionId = useConversationStore.getState().sessionId;
            if (eventSessionId && currentSessionId && eventSessionId !== currentSessionId) return;

            const speechText = String(event?.detail?.text || '').trim();
            if (!speechText) return;

            const currentItems = useConversationStore.getState().menuItems;
            if (!Array.isArray(currentItems) || currentItems.length === 0) return;

            const matchedId = findDishInTranscript(speechText, currentItems);
            if (!matchedId) return;

            // Debounce: wait 600ms after last speech part before committing highlight.
            // This prevents flickering while Amber is mid-sentence.
            pendingMatchId = matchedId;
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (pendingMatchId) {
                    setHighlightedId(pendingMatchId);
                    pendingMatchId = null;
                }
                debounceTimer = null;
            }, 600);
        };

        window.addEventListener('freeflow:live-assistant-part', onAssistantSpeechPart as EventListener);
        return () => {
            window.removeEventListener('freeflow:live-assistant-part', onAssistantSpeechPart as EventListener);
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    }, [isVisible]);

    useEffect(() => {
        if (!menuItems?.length) {
            setHighlightedId(null);
            return;
        }

        // Menu Deep Dive: backend explicitly identified a focused item — always honor it
        const backendFocusedId = lastFullResponse?.meta?.focusedMenuItemId;
        if (backendFocusedId) {
            const id = normalizeId(backendFocusedId);
            const exists = menuItems.some((item) => normalizeId(item.id || item.menuItemId || item.menu_item_id) === id);
            if (exists && normalizeId(highlightedId) !== id) {
                setHighlightedId(id);
            }
            return;
        }

        const hasCurrentSelection = highlightedId
            ? menuItems.some((item) => normalizeId(item.id || item.menuItemId || item.menu_item_id) === normalizeId(highlightedId))
            : false;

        if (hasCurrentSelection) return;

        if (recommendedId && menuItems.some((item) => normalizeId(item.id || item.menuItemId || item.menu_item_id) === normalizeId(recommendedId))) {
            setHighlightedId(normalizeId(recommendedId));
            return;
        }

        setHighlightedId(normalizeId(menuItems[0].id || menuItems[0].menuItemId || menuItems[0].menu_item_id || null));
    }, [menuItems, recommendedId, highlightedId, lastFullResponse]);

    useEffect(() => {
        if (!isVisible) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            closeMenuContext();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isVisible, closeMenuContext]);

    useEffect(() => {
        if (!isVisible) return;

        const currentState = (window.history.state && typeof window.history.state === 'object')
            ? window.history.state
            : {};

        if (!currentState.ffMenuOpen) {
            window.history.pushState({ ...currentState, ffMenuOpen: true }, '');
            menuBackStatePushedRef.current = true;
        } else {
            menuBackStatePushedRef.current = false;
        }

        const onPopState = () => {
            closeMenuContext();
        };

        window.addEventListener('popstate', onPopState);

        return () => {
            window.removeEventListener('popstate', onPopState);

            if (menuBackStatePushedRef.current) {
                const liveState = (window.history.state && typeof window.history.state === 'object')
                    ? window.history.state
                    : {};
                if (liveState.ffMenuOpen) {
                    const { ffMenuOpen: _ffMenuOpen, ...restState } = liveState as Record<string, unknown>;
                    window.history.replaceState(restState, '');
                }
            }

            menuBackStatePushedRef.current = false;
        };
    }, [isVisible, closeMenuContext]);

    if (!isVisible || !menuItems || menuItems.length === 0) return null;

    return (
        <ContextualIsland
            items={menuItems}
            type="menu"
            position="right"
            highlightedId={highlightedId}
            setHighlightedId={setHighlightedId}
            recommendedId={recommendedId}
            title={enrichedRestaurant?.name ? `Menu: ${enrichedRestaurant.name}` : 'Menu restauracji'}
            subtitle={enrichedRestaurant?.city || enrichedRestaurant?.address || 'Pozycje aktualnie widoczne dla tej restauracji'}
            restaurantDistance={enrichedRestaurant?.distance ?? null}
            restaurant={enrichedRestaurant}
            onClose={closeMenuContext}
            onSelect={(item) => {
                window.dispatchEvent(new CustomEvent('freeflow:orderItem', {
                    detail: { item, restaurant: currentRestaurant }
                }));
            }}
        />
    );
}

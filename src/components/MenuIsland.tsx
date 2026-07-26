import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConversationStore } from '../store/useConversationStore';
import ContextualIsland from './ContextualIsland';
import { findLastMentionedMenuItemId, isCartConfirmationText } from '../lib/assistantFocusMatcher';
import { getMenuItemStableId, getMenuItemUiId, resolveStructuredFocusedMenuItemId } from '../lib/menuFocusContract';
import { resolveMenuPresentationMode } from '../lib/menuPresentationContract';

const MENU_PHASES = ['restaurant_selected', 'ordering'];

function normalizeId(value: unknown): string {
    return String(value ?? '');
}

function normalizeText(value: string = '') {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function pickRecommendedMenuId(items: any[], response: any) {
    if (!items?.length) return null;

    // Priority 1: explicit focusedMenuItemId from backend meta (Menu Deep Dive)
    const focusedId = resolveStructuredFocusedMenuItemId(response, items);
    if (focusedId) return focusedId;

    // Priority 2: explicit dish metadata from backend
    const explicitDish = normalizeText(response?.context?.pendingOrder?.items?.[0]?.name || response?.meta?.dish || '');

    for (const item of items) {
        const itemName = normalizeText(item.name || item.base_name || '');
        if (!itemName) continue;
        if (explicitDish && explicitDish.includes(itemName)) return normalizeId(getMenuItemStableId(item));
    }

    return normalizeId(getMenuItemStableId(items[0]));
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
        const responseRestaurant = lastFullResponse?.context?.currentRestaurant
            || lastFullResponse?.currentRestaurant
            || null;
        const activeRestaurant = responseRestaurant || currentRestaurant;
        if (!activeRestaurant) return null;
        const currentId = normalizeId(activeRestaurant?.id);
        const currentName = normalizeText(activeRestaurant?.name || '');
        const full = Array.isArray(suggestedRestaurants)
            ? (
                (currentName
                    ? suggestedRestaurants.find((r: any) => (
                        normalizeText(r?.display_name || r?.name || '') === currentName
                    ))
                    : null)
                || (currentId
                    ? suggestedRestaurants.find((r: any) => normalizeId(r?.id) === currentId)
                    : null)
            )
            : null;
        return full || activeRestaurant;
    }, [currentRestaurant, lastFullResponse, suggestedRestaurants]);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [autoRevealRequest, setAutoRevealRequest] = useState<{ id: string; seq: number } | null>(null);
    const [fullMenuRequested, setFullMenuRequested] = useState(false);
    const lastAssistantMenuFocusAtRef = useRef(0);
    const highlightedIdRef = useRef<string | null>(null);
    const menuBackStatePushedRef = useRef(false);
    const autoRevealSeqRef = useRef(0);
    const consumedStructuredFocusResponseRef = useRef<any>(null);

    const isVisible = uiMode === 'restaurant' || MENU_PHASES.includes(conversationPhase);
    const recommendedId = useMemo(() => pickRecommendedMenuId(menuItems || [], lastFullResponse), [menuItems, lastFullResponse]);
    const responsePresentationMode = useMemo(
        () => resolveMenuPresentationMode(lastFullResponse),
        [lastFullResponse],
    );
    const presentationMode = fullMenuRequested ? 'full' : responsePresentationMode;
    const restaurantIdentity = normalizeId(enrichedRestaurant?.id || enrichedRestaurant?.name);
    const closeMenuContext = useCallback(() => {
        useConversationStore.getState().closeMenuContext();
    }, []);

    useEffect(() => {
        const renderVisible = isVisible && !!menuItems?.length;
        console.log(`[LIVE_MENU] renderVisible=${renderVisible}`);
    }, [isVisible, menuItems?.length]);

    useEffect(() => {
        highlightedIdRef.current = highlightedId;
    }, [highlightedId]);

    useEffect(() => {
        setFullMenuRequested(false);
    }, [restaurantIdentity]);

    useEffect(() => {
        const onCartUpdated = (event: Event) => {
            const detail = (event as CustomEvent)?.detail || {};
            const lastAddedRaw = String(detail?.lastAdded || '').trim();
            if (!lastAddedRaw || !Array.isArray(menuItems) || menuItems.length === 0) {
                return;
            }
            if (Date.now() - lastAssistantMenuFocusAtRef.current < 5000) {
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

            const nextId = normalizeId(getMenuItemStableId(matched));
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

        let focusTimer: ReturnType<typeof setTimeout> | null = null;
        let pendingMatchId: string | null = null;

        const onAssistantSpeechPart = (rawEvent: Event) => {
            const event = rawEvent as CustomEvent<any>;
            const eventSessionId = String(event?.detail?.sessionId || '').trim();
            const currentSessionId = useConversationStore.getState().sessionId;
            if (eventSessionId && currentSessionId && eventSessionId !== currentSessionId) return;

            const currentPart = String(event?.detail?.text || '').trim();
            const cumulativeTranscript = String(event?.detail?.transcript || '').trim();
            const speechText = cumulativeTranscript || currentPart;
            if (!speechText && !currentPart) return;

            const currentItems = useConversationStore.getState().menuItems;
            if (!Array.isArray(currentItems) || currentItems.length === 0) return;

            if (isCartConfirmationText(speechText)) return;

            const matchedId = findLastMentionedMenuItemId(currentPart, currentItems)
                || findLastMentionedMenuItemId(speechText, currentItems);
            if (!matchedId) return;
            if (normalizeId(highlightedIdRef.current) === normalizeId(matchedId)) return;

            // A complete TTS sentence can commit immediately. Streaming Live parts
            // get a short stability window so token fragments do not flash the card.
            pendingMatchId = matchedId;
            if (focusTimer) clearTimeout(focusTimer);
            const delay = rawEvent.type === 'freeflow:assistant-focus-text' ? 0 : 180;
            focusTimer = setTimeout(() => {
                if (pendingMatchId) {
                    lastAssistantMenuFocusAtRef.current = Date.now();
                    highlightedIdRef.current = pendingMatchId;
                    setHighlightedId(pendingMatchId);
                    pendingMatchId = null;
                }
                focusTimer = null;
            }, delay);
        };

        window.addEventListener('freeflow:assistant-focus-text', onAssistantSpeechPart as EventListener);
        window.addEventListener('freeflow:live-assistant-part', onAssistantSpeechPart as EventListener);
        return () => {
            window.removeEventListener('freeflow:assistant-focus-text', onAssistantSpeechPart as EventListener);
            window.removeEventListener('freeflow:live-assistant-part', onAssistantSpeechPart as EventListener);
            if (focusTimer) clearTimeout(focusTimer);
        };
    }, [isVisible]);

    useEffect(() => {
        if (!menuItems?.length) {
            setHighlightedId(null);
            setAutoRevealRequest(null);
            consumedStructuredFocusResponseRef.current = null;
            return;
        }

        // Menu Deep Dive: backend explicitly identified a focused item — always honor it
        const backendFocusedId = resolveStructuredFocusedMenuItemId(lastFullResponse, menuItems);
        const isNewStructuredFocusResponse = !!lastFullResponse
            && consumedStructuredFocusResponseRef.current !== lastFullResponse;
        if (backendFocusedId && isNewStructuredFocusResponse) {
            consumedStructuredFocusResponseRef.current = lastFullResponse;
            if (normalizeId(highlightedId) !== backendFocusedId) {
                setHighlightedId(backendFocusedId);
                setAutoRevealRequest({ id: backendFocusedId, seq: ++autoRevealSeqRef.current });
            }
            return;
        }

        const hasCurrentSelection = highlightedId
            ? menuItems.some((item, index) => {
                const selectedId = normalizeId(highlightedId);
                return normalizeId(getMenuItemStableId(item)) === selectedId
                    || getMenuItemUiId(item, index) === selectedId;
            })
            : false;

        if (hasCurrentSelection) return;

        if (recommendedId && menuItems.some((item) => normalizeId(getMenuItemStableId(item)) === normalizeId(recommendedId))) {
            setHighlightedId(normalizeId(recommendedId));
            return;
        }

        setHighlightedId(normalizeId(getMenuItemStableId(menuItems[0])));
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
            autoRevealRequest={autoRevealRequest}
            presentationMode={presentationMode}
            onRequestFullMenu={() => setFullMenuRequested(true)}
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

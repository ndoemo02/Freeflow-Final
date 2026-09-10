import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/config', () => ({
    getApiUrl: () => '/api/brain/v2',
}));

import { useConversationStore } from './useConversationStore';
import { applyToolResultToStore } from '../hooks/useGeminiLiveSession';

const VIEN = { id: 'vien-id', name: 'Vien-Thien', city: 'Piekary Śląskie' };
const REZYDENCJA = { id: 'rezy-id', name: 'Rezydencja Luxury Hotel', city: 'Piekary Śląskie' };
const MENU = [{ id: 'dish-1', restaurant_id: REZYDENCJA.id, name: 'Danie hotelowe', price_pln: 42 }];
const PENDING_ORDER = { items: [{ id: 'dish-1', quantity: 1 }], restaurant_id: REZYDENCJA.id };
const EMPTY_CART = { items: [], total: 0 };

function brainResponse(body: Record<string, unknown>) {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('useConversationStore restaurant selection', () => {
    beforeEach(() => {
        localStorage.clear();
        useConversationStore.setState({
            sessionId: 'sess_test_session',
            isThinking: false,
            error: null,
            uiMode: 'list',
            conversationPhase: 'idle',
            currentRestaurant: null,
            pendingOrder: null,
            cart: EMPTY_CART,
            cartSyncKey: 0,
            expectedContext: null,
            lastResponse: '',
            conversationHistory: [],
            lastContext: null,
            lastFullResponse: null,
            suggestedRestaurants: [VIEN, REZYDENCJA],
            selectedRestaurantPreviewId: VIEN.id,
            menuItems: null,
            lastIntent: null,
            lastSource: null,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('sends an exact UI action and reconciles a stale response header from menu restaurant_id', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(brainResponse({
            ok: true,
            intent: 'select_restaurant',
            reply: 'Otwieram menu.',
            context: {
                conversationPhase: 'ordering',
                currentRestaurant: VIEN,
                last_restaurants_list: [VIEN, REZYDENCJA],
                last_menu: [
                    { id: 'dish-1', restaurant_id: REZYDENCJA.id, name: 'Danie hotelowe', price_pln: 42 },
                ],
            },
        }));

        await useConversationStore.getState().selectRestaurantFromUi(REZYDENCJA);

        const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
        expect(request.meta.ui_action).toEqual({
            type: 'select_restaurant',
            restaurant_id: REZYDENCJA.id,
            restaurant_name: REZYDENCJA.name,
        });
        expect(request.demo_context).toEqual({
            scenario_id: 'piekary-local',
            preferred_locale: 'pl',
            source: 'default',
        });
        expect(useConversationStore.getState().currentRestaurant?.id).toBe(REZYDENCJA.id);
        expect(useConversationStore.getState().selectedRestaurantPreviewId).toBe(REZYDENCJA.id);
        expect(useConversationStore.getState().menuItems?.[0]?.restaurant_id).toBe(REZYDENCJA.id);
    });

    it('rejects a mixed-restaurant menu without replacing the previous view', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(brainResponse({
            ok: true,
            intent: 'select_restaurant',
            reply: 'Otwieram menu.',
            context: {
                conversationPhase: 'ordering',
                currentRestaurant: REZYDENCJA,
                last_restaurants_list: [VIEN, REZYDENCJA],
                last_menu: [
                    { id: 'dish-1', restaurant_id: REZYDENCJA.id, name: 'Danie hotelowe' },
                    { id: 'dish-2', restaurant_id: VIEN.id, name: 'Danie wietnamskie' },
                ],
            },
        }));

        await useConversationStore.getState().selectRestaurantFromUi(REZYDENCJA);

        expect(useConversationStore.getState().currentRestaurant).toBeNull();
        expect(useConversationStore.getState().menuItems).toBeNull();
        expect(useConversationStore.getState().error).toMatch(/wielu restauracji/i);
        expect(useConversationStore.getState().selectedRestaurantPreviewId).toBe(VIEN.id);
    });

    it('continues with the active session id returned by the backend', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(brainResponse({
            ok: true,
            session_id: 'sess_replacement_1',
            intent: 'find_nearby',
            reply: 'Znalazłam miejsca w pobliżu.',
            restaurants: [VIEN, REZYDENCJA],
            context: {
                conversationPhase: 'idle',
                last_restaurants_list: [VIEN, REZYDENCJA],
            },
        }));

        await useConversationStore.getState().sendMessage('Pokaż restauracje w pobliżu');

        expect(useConversationStore.getState().sessionId).toBe('sess_replacement_1');
        expect(localStorage.getItem('amber-session-id')).toBe('sess_replacement_1');
    });

    it('typed transport preserves menu confirmation state despite idle/open_checkout backend fields', async () => {
        useConversationStore.setState({
            uiMode: 'restaurant',
            conversationPhase: 'ordering',
            currentRestaurant: REZYDENCJA,
            selectedRestaurantPreviewId: REZYDENCJA.id,
            menuItems: MENU,
            cart: EMPTY_CART,
        });
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(brainResponse({
            ok: true,
            intent: 'open_checkout',
            reply: 'Dodać Danie hotelowe do koszyka?',
            cart: { items: [{ id: 'dish-1', quantity: 1 }], total: 42 },
            actions: [
                { type: 'SYNC_CART', payload: { items: [{ id: 'dish-1', quantity: 1 }] } },
                { type: 'SHOW_CART' },
            ],
            context: {
                conversationPhase: 'idle',
                expectedContext: 'confirm_add_to_cart',
                pendingOrder: PENDING_ORDER,
            },
        }));

        await useConversationStore.getState().sendMessage('Dodaj danie hotelowe');

        expect(useConversationStore.getState()).toMatchObject({
            uiMode: 'restaurant',
            conversationPhase: 'ordering',
            currentRestaurant: REZYDENCJA,
            selectedRestaurantPreviewId: REZYDENCJA.id,
            menuItems: MENU,
            pendingOrder: PENDING_ORDER,
            expectedContext: 'confirm_add_to_cart',
            cart: EMPTY_CART,
        });
        expect(useConversationStore.getState().lastFullResponse).toMatchObject({
            cart: EMPTY_CART,
            actions: [],
        });
    });

    it('voice HTTP fallback preserves the same pre-confirmation boundary', () => {
        useConversationStore.setState({
            uiMode: 'restaurant',
            conversationPhase: 'ordering',
            currentRestaurant: REZYDENCJA,
            selectedRestaurantPreviewId: REZYDENCJA.id,
            menuItems: MENU,
            cart: EMPTY_CART,
        });

        applyToolResultToStore('add_item_to_cart', {
            intent: 'open_checkout',
            cart: { items: [{ id: 'dish-1', quantity: 1 }], total: 42 },
            context: {
                conversationPhase: 'idle',
                expectedContext: 'confirm_add_to_cart',
                pendingOrder: PENDING_ORDER,
            },
        });

        expect(useConversationStore.getState()).toMatchObject({
            uiMode: 'restaurant',
            conversationPhase: 'ordering',
            currentRestaurant: REZYDENCJA,
            selectedRestaurantPreviewId: REZYDENCJA.id,
            menuItems: MENU,
            pendingOrder: PENDING_ORDER,
            expectedContext: 'confirm_add_to_cart',
            cart: EMPTY_CART,
        });
    });

    it('typed and voice-equivalent tak accept the same confirmed cart state', async () => {
        const confirmedCart = { items: [{ id: 'dish-1', name: 'Danie hotelowe', quantity: 1, price_pln: 42 }], total: 42 };
        const confirmedResponse = {
            ok: true,
            intent: 'confirm_add_to_cart',
            reply: 'Dodano do koszyka.',
            cart: confirmedCart,
            context: {
                conversationPhase: 'ordering',
                currentRestaurant: REZYDENCJA,
                last_menu: MENU,
                pendingOrder: null,
                expectedContext: null,
            },
        };
        const confirmationState = {
            uiMode: 'restaurant' as const,
            conversationPhase: 'ordering',
            currentRestaurant: REZYDENCJA,
            selectedRestaurantPreviewId: REZYDENCJA.id,
            menuItems: MENU,
            pendingOrder: PENDING_ORDER,
            expectedContext: 'confirm_add_to_cart',
            cart: EMPTY_CART,
        };
        const projectState = () => {
            const state = useConversationStore.getState();
            return {
                uiMode: state.uiMode,
                conversationPhase: state.conversationPhase,
                currentRestaurant: state.currentRestaurant,
                menuItems: state.menuItems,
                pendingOrder: state.pendingOrder,
                expectedContext: state.expectedContext,
                cart: state.cart,
            };
        };

        useConversationStore.setState(confirmationState);
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(brainResponse(confirmedResponse));
        await useConversationStore.getState().sendMessage('tak');
        const typedState = projectState();

        useConversationStore.setState(confirmationState);
        applyToolResultToStore('confirm_add_to_cart', confirmedResponse);
        const voiceState = projectState();

        expect(voiceState).toEqual(typedState);
        expect(typedState).toMatchObject({
            pendingOrder: null,
            expectedContext: null,
            cart: expect.objectContaining({ total: 42 }),
        });
    });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/config', () => ({
    getApiUrl: () => '/api/brain/v2',
}));

import { useConversationStore } from './useConversationStore';

const VIEN = { id: 'vien-id', name: 'Vien-Thien', city: 'Piekary Śląskie' };
const REZYDENCJA = { id: 'rezy-id', name: 'Rezydencja Luxury Hotel', city: 'Piekary Śląskie' };

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
            sessionId: 'test-session',
            isThinking: false,
            error: null,
            uiMode: 'list',
            conversationPhase: 'idle',
            currentRestaurant: null,
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
            session_id: 'replacement-session',
            intent: 'find_nearby',
            reply: 'Znalazłam miejsca w pobliżu.',
            restaurants: [VIEN, REZYDENCJA],
            context: {
                conversationPhase: 'idle',
                last_restaurants_list: [VIEN, REZYDENCJA],
            },
        }));

        await useConversationStore.getState().sendMessage('Pokaż restauracje w pobliżu');

        expect(useConversationStore.getState().sessionId).toBe('replacement-session');
        expect(localStorage.getItem('amber-session-id')).toBe('replacement-session');
    });
});

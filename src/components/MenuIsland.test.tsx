import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockedStore = vi.hoisted(() => ({
    value: {} as any,
}));

vi.mock('../store/useConversationStore', () => {
    const useConversationStore = (selector: (state: any) => unknown) => selector(mockedStore.value);
    useConversationStore.getState = () => mockedStore.value;
    return { useConversationStore };
});

vi.mock('./ContextualIsland', () => ({
    default: ({
        highlightedId,
        setHighlightedId,
        title,
        presentationMode,
        onRequestFullMenu,
    }: any) => (
        <div>
            <span data-testid="highlighted-id">{highlightedId || 'none'}</span>
            <span data-testid="restaurant-title">{title}</span>
            <span data-testid="presentation-mode">{presentationMode}</span>
            <button type="button" onClick={() => setHighlightedId('1__dish-b')}>Focus dish B</button>
            <button type="button" onClick={onRequestFullMenu}>Full menu</button>
        </div>
    ),
}));

import MenuIsland from './MenuIsland';

const MENU = [
    { id: 'dish-a', restaurant_id: 'restaurant-1', name: 'Dish A' },
    { id: 'dish-b', restaurant_id: 'restaurant-1', name: 'Dish B' },
];

function responseWithFocus(id: string) {
    return { meta: { focusedMenuItemId: id } };
}

describe('MenuIsland structured focus precedence', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('consumes backend focus once, preserves a manual click, and accepts a new response focus', async () => {
        const firstResponse = responseWithFocus('dish-a');
        mockedStore.value = {
            conversationPhase: 'ordering',
            uiMode: 'restaurant',
            menuItems: MENU,
            currentRestaurant: { id: 'restaurant-1', name: 'Restaurant' },
            suggestedRestaurants: [],
            lastFullResponse: firstResponse,
            sessionId: 'test-session',
            closeMenuContext: vi.fn(),
        };

        const { rerender } = render(<MenuIsland />);
        await waitFor(() => expect(screen.getByTestId('highlighted-id')).toHaveTextContent('dish-a'));

        fireEvent.click(screen.getByRole('button', { name: /focus dish b/i }));
        expect(screen.getByTestId('highlighted-id')).toHaveTextContent('1__dish-b');

        rerender(<MenuIsland />);
        await waitFor(() => expect(screen.getByTestId('highlighted-id')).toHaveTextContent('1__dish-b'));

        mockedStore.value = {
            ...mockedStore.value,
            lastFullResponse: responseWithFocus('dish-a'),
        };
        rerender(<MenuIsland />);
        await waitFor(() => expect(screen.getByTestId('highlighted-id')).toHaveTextContent('dish-a'));
    });

    it('uses the restaurant from the menu response instead of a stale store header', () => {
        mockedStore.value = {
            conversationPhase: 'restaurant_selected',
            uiMode: 'restaurant',
            menuItems: MENU,
            currentRestaurant: { id: 'restaurant-old', name: 'Vien-Thien' },
            suggestedRestaurants: [
                { id: 'restaurant-new', name: 'Vien-Thien', city: 'Piekary Śląskie' },
                { id: 'restaurant-new', name: 'Rezydencja Luxury Hotel', city: 'Piekary Śląskie' },
            ],
            lastFullResponse: {
                context: {
                    currentRestaurant: { id: 'restaurant-new', name: 'Rezydencja Luxury Hotel' },
                },
            },
            sessionId: 'test-session',
            closeMenuContext: vi.fn(),
        };

        render(<MenuIsland />);

        expect(screen.getByTestId('restaurant-title')).toHaveTextContent('Menu: Rezydencja Luxury Hotel');
    });

    it('opens focused search results in discovery and lets the user expand the full menu', () => {
        mockedStore.value = {
            conversationPhase: 'ordering',
            uiMode: 'restaurant',
            menuItems: MENU,
            currentRestaurant: { id: 'restaurant-1', name: 'Restaurant' },
            suggestedRestaurants: [],
            lastFullResponse: {
                intent: 'search_menu_items',
                meta: {
                    menuPresentationMode: 'discovery',
                    focusedMenuItemId: 'dish-a',
                },
            },
            sessionId: 'test-session',
            closeMenuContext: vi.fn(),
        };

        render(<MenuIsland />);

        expect(screen.getByTestId('presentation-mode')).toHaveTextContent('discovery');
        fireEvent.click(screen.getByRole('button', { name: /full menu/i }));
        expect(screen.getByTestId('presentation-mode')).toHaveTextContent('full');
    });

    it('tracks the dish named in a streaming Live response after a short stability window', async () => {
        vi.useFakeTimers();
        mockedStore.value = {
            conversationPhase: 'ordering',
            uiMode: 'restaurant',
            menuItems: MENU,
            currentRestaurant: { id: 'restaurant-1', name: 'Restaurant' },
            suggestedRestaurants: [],
            lastFullResponse: responseWithFocus('dish-a'),
            sessionId: 'test-session',
            closeMenuContext: vi.fn(),
        };

        render(<MenuIsland />);
        await act(async () => {
            await Promise.resolve();
        });

        act(() => {
            window.dispatchEvent(new CustomEvent('freeflow:live-assistant-part', {
                detail: {
                    sessionId: 'test-session',
                    text: 'Dish B',
                    transcript: 'Polecam Dish B',
                },
            }));
            vi.advanceTimersByTime(179);
        });
        expect(screen.getByTestId('highlighted-id')).toHaveTextContent('dish-a');

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(screen.getByTestId('highlighted-id')).toHaveTextContent('dish-b');
    });
});

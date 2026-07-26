import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import MenuFlowView from './MenuFlowView';

vi.mock('framer-motion', () => {
    const makeMotion = (Tag: keyof JSX.IntrinsicElements) =>
        React.forwardRef<HTMLElement, any>(({ children, animate, initial, transition, ...props }, ref) =>
            React.createElement(Tag, { ...props, ref }, children)
        );

    return {
        motion: {
            div: makeMotion('div'),
            button: makeMotion('button'),
        },
    };
});

vi.mock('./sheet/BottomSheetContainer', () => ({
    useBottomSheetContext: () => ({ boundary: { atTop: true } }),
}));

vi.mock('./sheet/SheetScrollable', () => ({
    default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('../hooks/useIslandGestures', () => ({
    useIslandGestures: () => ({
        handleSwipeStart: vi.fn(),
        handleSwipeEnd: vi.fn(),
    }),
}));

vi.mock('./RestaurantAvatar', () => ({
    default: () => <div data-testid="restaurant-avatar" />,
}));

vi.mock('../state/ui', () => ({
    useUI: () => vi.fn(),
}));

vi.mock('../state/CartContext', () => ({
    useCart: () => ({ itemCount: 0, setIsOpen: vi.fn(), restaurant: null }),
}));

vi.mock('../store/useConversationStore', () => ({
    useConversationStore: () => null,
}));

vi.mock('../hooks/useIslandFullList', () => ({
    useIslandFullList: vi.fn(),
}));

describe('MenuFlowView', () => {
    beforeAll(() => {
        Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
            configurable: true,
            value: vi.fn(),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('syncs parent highlightedId when a menu row is clicked', () => {
        const setHighlightedId = vi.fn();

        render(
            <MenuFlowView
                normalizedItems={[
                    { _uiId: 'item-a', id: 'item-a', name: 'First Dish', category: 'Main', section_order: 1 },
                    { _uiId: 'item-b', id: 'item-b', name: 'Second Dish', category: 'Main', section_order: 1 },
                ]}
                highlightedId="item-a"
                setHighlightedId={setHighlightedId}
                recommendedId={null}
                autoRevealRequest={null}
                headerTitle="Menu"
                resultSummary={null}
                currentIndex={0}
                onSelect={vi.fn()}
                goTo={vi.fn()}
                snap="fullscreen"
                setSnap={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /second dish/i }));

        expect(setHighlightedId).toHaveBeenCalledWith('item-b');
    });

    it('keeps the clicked item focused while its programmatic scroll settles', () => {
        vi.useFakeTimers();
        const { container } = render(
            <MenuFlowView
                normalizedItems={[
                    { _uiId: 'item-a', id: 'item-a', name: 'First Dish', category: 'Main', section_order: 1 },
                    { _uiId: 'item-b', id: 'item-b', name: 'Second Dish', category: 'Main', section_order: 1 },
                ]}
                highlightedId="item-a"
                setHighlightedId={vi.fn()}
                recommendedId={null}
                autoRevealRequest={null}
                headerTitle="Menu"
                resultSummary={null}
                currentIndex={0}
                onSelect={vi.fn()}
                goTo={vi.fn()}
                snap="fullscreen"
                setSnap={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /second dish/i }));
        const scrollContainer = container.querySelector('.list-scroll');
        expect(scrollContainer).not.toBeNull();
        fireEvent.scroll(scrollContainer!);
        act(() => vi.advanceTimersByTime(200));

        expect(container.querySelector('.mf-card__name')).toHaveTextContent('Second Dish');
    });

    it('groups size variants and adds the selected concrete menu item', () => {
        const onSelect = vi.fn();

        render(
            <MenuFlowView
                normalizedItems={[
                    {
                        _uiId: 'rollo-m',
                        id: 'rollo-m',
                        name: 'Rollo kurczak M',
                        base_name: 'Rollo kurczak',
                        item_family: 'rollo_kurczak',
                        variant_type: 'size',
                        size_or_variant: 'M',
                        price_pln: 20,
                        category: 'Rollo',
                        section_order: 1,
                    },
                    {
                        _uiId: 'rollo-l',
                        id: 'rollo-l',
                        name: 'Rollo kurczak L',
                        base_name: 'Rollo kurczak',
                        item_family: 'rollo_kurczak',
                        variant_type: 'size',
                        size_or_variant: 'L',
                        price_pln: 25,
                        category: 'Rollo',
                        section_order: 1,
                    },
                ]}
                highlightedId="rollo-m"
                setHighlightedId={vi.fn()}
                recommendedId={null}
                autoRevealRequest={null}
                headerTitle="Menu"
                resultSummary={null}
                currentIndex={0}
                onSelect={onSelect}
                goTo={vi.fn()}
                snap="fullscreen"
                setSnap={vi.fn()}
            />,
        );

        expect(screen.queryByText('Rollo kurczak M')).not.toBeInTheDocument();
        expect(screen.queryByText('Rollo kurczak L')).not.toBeInTheDocument();
        expect(screen.getAllByText('Rollo kurczak')).toHaveLength(2);

        fireEvent.click(screen.getByRole('button', { name: /rozmiar L, 25\.00 zł/i }));
        fireEvent.click(screen.getByRole('button', { name: /dodaj/i }));

        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'rollo-l' }));
    });

    it('keeps discovery focused on one dish and exposes an explicit full-menu action', () => {
        const onRequestFullMenu = vi.fn();

        render(
            <MenuFlowView
                normalizedItems={[
                    { _uiId: 'item-a', id: 'item-a', name: 'First Dish', category: 'Main', section_order: 1 },
                    { _uiId: 'item-b', id: 'item-b', name: 'Second Dish', category: 'Dessert', section_order: 2 },
                ]}
                highlightedId="item-a"
                setHighlightedId={vi.fn()}
                recommendedId="item-a"
                autoRevealRequest={null}
                presentationMode="discovery"
                onRequestFullMenu={onRequestFullMenu}
                headerTitle="Menu"
                resultSummary={null}
                currentIndex={0}
                onSelect={vi.fn()}
                goTo={vi.fn()}
                snap="expanded"
                setSnap={vi.fn()}
            />,
        );

        expect(screen.getByText('First Dish')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /second dish/i })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /zobacz pełne menu/i }));
        expect(onRequestFullMenu).toHaveBeenCalledTimes(1);
    });
});

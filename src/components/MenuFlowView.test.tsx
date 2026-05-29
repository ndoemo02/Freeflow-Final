import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
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
});

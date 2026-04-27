import React, { useCallback, useMemo } from 'react';
import RestaurantSheetContent from './RestaurantSheetContent';
import MenuFlowView from './MenuFlowView';
import BottomSheetContainer from './sheet/BottomSheetContainer';
import { SheetSnap } from './sheet/sheetTypes';

interface ContextualIslandProps {
    items: any[];
    type: 'restaurant' | 'menu';
    position: 'left' | 'right';
    onSelect: (item: any) => void;
    highlightedId: string | null;
    setHighlightedId: (id: string | null) => void;
    onClose?: () => void;
    recommendedId?: string | null;
    title?: string;
    subtitle?: string | null;
    restaurantDistance?: number | null;
    restaurant?: any;
}

const getItemId = (item: any, index = 0) =>
    `${index}__${String(item?.id || item?.menuItemId || item?.menu_item_id || item?.name || 'item')}`;

function getResultsLabel(count: number) {
    if (count === 1) return '1 miejsce';
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
        return `${count} miejsca`;
    }
    return `${count} miejsc`;
}

function getLocationLabel(items: any[]) {
    const city = items.find((item) => item?.city)?.city;
    const address = items.find((item) => item?.address)?.address;
    return city || address || null;
}


export default function ContextualIsland({
    items,
    type,
    position,
    onSelect,
    highlightedId,
    setHighlightedId,
    onClose,
    recommendedId,
    title,
    subtitle,
    restaurantDistance,
    restaurant: restaurantProp,
}: ContextualIslandProps) {
    const normalizedItems = useMemo(() => items.map((item, index) => ({ ...item, _uiId: getItemId(item, index) })), [items]);

    if (!normalizedItems.length) return null;

    const activeIndex = normalizedItems.findIndex((item) => item._uiId === highlightedId);
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;
    const headerTitle = title || (type === 'restaurant' ? 'Restauracje' : 'Menu restauracji');

    const restaurant = useMemo(() => {
        if (type !== 'menu') return null;
        return restaurantProp || normalizedItems[0]?.restaurant || null;
    }, [restaurantProp, normalizedItems, type]);

    const resultSummary = useMemo(() => {
        if (type !== 'restaurant') return subtitle || null;
        const countLabel = getResultsLabel(normalizedItems.length);
        const locationLabel = getLocationLabel(normalizedItems);
        return locationLabel ? `${countLabel} / ${locationLabel}` : countLabel;
    }, [normalizedItems, subtitle, type]);

    const goTo = useCallback((targetIndex: number) => {
        const clamped = Math.max(0, Math.min(normalizedItems.length - 1, targetIndex));
        setHighlightedId(normalizedItems[clamped]?._uiId || null);
    }, [normalizedItems, setHighlightedId]);

    const sheetProps = {
        initialSnap: (type === 'menu' ? 'expanded' : 'peek') as SheetSnap,
        lockScrollOn: 'open' as const,
        position,
        className: 'z-10',
        placementClassName: 'bottom-0',
        snapClassNames: {
            closed: 'contextual-island-sheet--closed',
            peek: 'contextual-island-sheet--peek',
            expanded: 'contextual-island-sheet--expanded',
        },
    };

    if (type === 'restaurant') {
        return (
            <BottomSheetContainer {...sheetProps}>
                {({ snap, setSnap }) => (
                    <RestaurantSheetContent
                        items={normalizedItems}
                        highlightedId={highlightedId}
                        setHighlightedId={setHighlightedId}
                        recommendedId={recommendedId}
                        onSelect={onSelect}
                        snap={snap}
                        setSnap={setSnap}
                    />
                )}
            </BottomSheetContainer>
        );
    }

    return (
        <>
            {onClose && (
                <div
                    className="fixed inset-0 z-[9]"
                    aria-hidden="true"
                    onClick={onClose}
                />
            )}
            <BottomSheetContainer {...sheetProps}>
                {({ snap, setSnap }) => (
                    <MenuFlowView
                        normalizedItems={normalizedItems}
                        highlightedId={highlightedId}
                        setHighlightedId={setHighlightedId}
                        recommendedId={recommendedId}
                        headerTitle={headerTitle}
                        resultSummary={resultSummary}
                        currentIndex={currentIndex}
                        onSelect={onSelect}
                        goTo={goTo}
                        snap={snap}
                        setSnap={setSnap}
                        restaurantDistance={restaurantDistance}
                        restaurant={restaurant}
                    />
                )}
            </BottomSheetContainer>
        </>
    );
}

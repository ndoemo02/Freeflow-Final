import React, { useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import RestaurantSheetContent from './RestaurantSheetContent';
import BottomSheetContainer, { useBottomSheetContext } from './sheet/BottomSheetContainer';
import SheetScrollable from './sheet/SheetScrollable';
import { getSheetViewportSnapPositions } from './sheet/sheetPhysics';
import { SheetSnap } from './sheet/sheetTypes';
import { useIslandStateMachine } from '../hooks/useIslandStateMachine';
import { useIslandGestures } from '../hooks/useIslandGestures';
import { IslandStackView } from './IslandStackView';

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
}

const formatPrice = (item: any) => {
    const value = Number(item?.price_pln ?? item?.price ?? 0);
    return Number.isFinite(value) && value > 0 ? `${value.toFixed(2)} zl` : null;
};

const getItemId = (item: any, index = 0) => item?.id || item?.menuItemId || item?.menu_item_id || `${index}-${item?.name || 'item'}`;
const getCuisine = (item: any) => item?.cuisine_type || item?.category || item?.section || 'Wybor dnia';
const getMetaLine = (item: any, type: 'restaurant' | 'menu') => {
    if (type === 'restaurant') {
        return item?.city || item?.address || item?.delivery_time || 'Dostepna teraz';
    }
    return item?.description || item?.ingredients || item?.allergens || 'Kliknij, aby dodac do zamowienia';
};

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

function resolveStackAnchorTop(snap: SheetSnap, stackHeight: number) {
    if (typeof window === 'undefined') return 112;
    const viewportHeight = window.innerHeight;
    const { peekPosition, closedPosition } = getSheetViewportSnapPositions(viewportHeight);
    const sheetHeight = snap === 'closed' ? viewportHeight * 0.3 : viewportHeight * 0.6;
    const sheetTop = viewportHeight - sheetHeight;
    if (snap === 'peek') {
        const desiredCenter = viewportHeight * 0.715;
        return Math.max(56, desiredCenter - sheetTop - stackHeight / 2);
    }
    const desiredCenter = snap === 'closed' ? closedPosition : peekPosition;
    return Math.max(20, desiredCenter - sheetTop - stackHeight / 2);
}

const STACK_OFFSETS = [-1, 0, 1] as const;

interface MenuSheetContentProps {
    normalizedItems: any[];
    highlightedId: string | null;
    setHighlightedId: (id: string | null) => void;
    recommendedId?: string | null;
    headerTitle: string;
    resultSummary: string | null;
    currentIndex: number;
    onSelect: (item: any) => void;
    goTo: (targetIndex: number) => void;
    snap: SheetSnap;
    setSnap: (next: SheetSnap) => void;
}

function MenuSheetContent({
    normalizedItems,
    highlightedId,
    setHighlightedId,
    recommendedId,
    headerTitle,
    resultSummary,
    currentIndex,
    onSelect,
    goTo,
    snap,
    setSnap,
}: MenuSheetContentProps) {
    const { boundary } = useBottomSheetContext();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const { isExpanded, isTeaser, ctaLabel, handleCtaPress } = useIslandStateMachine({ snap, setSnap });

    const gestures = useIslandGestures({
        snap,
        setSnap,
        currentIndex,
        goTo,
        isExpanded,
        atTop: boundary.atTop,
    });

    const stackItems = useMemo(
        () => STACK_OFFSETS
            .map((offset) => ({ offset, item: normalizedItems[currentIndex + offset] }))
            .filter((entry) => Boolean(entry.item)),
        [currentIndex, normalizedItems],
    );

    const stackHeight = isTeaser ? 210 : 240;
    const stackAnchorTop = useMemo(() => resolveStackAnchorTop(snap, stackHeight), [snap, stackHeight]);
    const stackSafeBottom = 'calc(env(safe-area-inset-bottom) + 84px)';
    // LIST mode: reserve only VoiceDock + safe area
    const expandedSafeBottom = 'calc(env(safe-area-inset-bottom) + 96px)';

    return (
        <div
            className="relative flex h-full min-h-0 flex-col overflow-visible text-white"
            onPointerDown={gestures.handlePointerDown}
            onPointerUp={gestures.handlePointerUp}
            onPointerCancel={gestures.handlePointerCancel}
        >
            {!isExpanded ? (
                <IslandStackView
                    stackItems={stackItems}
                    stackHeight={stackHeight}
                    stackAnchorTop={stackAnchorTop}
                    stackSafeBottom={stackSafeBottom}
                    ctaLabel={ctaLabel}
                    recommendedId={recommendedId}
                    hasFocused={!!highlightedId}
                    onSwipeStart={gestures.handleSwipeStart}
                    onSwipeEnd={gestures.handleSwipeEnd}
                    onWheel={gestures.handlePeekWheel}
                    onItemClick={(item) => {
                        setHighlightedId(item._uiId);
                        onSelect(item);
                    }}
                    onCtaPress={handleCtaPress}
                />
            ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="px-3 pt-2 pb-1.5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/78">{headerTitle}</div>
                                {resultSummary && <div className="mt-1 text-[12px] text-white/56">{resultSummary}</div>}
                            </div>
                            <button
                                type="button"
                                onClick={handleCtaPress}
                                className="shrink-0 text-[11px] font-medium text-white/75 backdrop-blur-md transition-all hover:text-white active:scale-95"
                                style={{
                                    borderRadius: 'var(--radius-pill)',
                                    padding: '5px 12px',
                                    background: 'rgba(0,0,0,0.45)',
                                    border: '1px solid rgba(255,255,255,0.10)',
                                }}
                            >
                                {ctaLabel}
                            </button>
                        </div>
                    </div>

                    <SheetScrollable
                        className="list-scroll tiny-scroll min-h-0 flex-1 space-y-2 px-3"
                        style={{ paddingBottom: expandedSafeBottom }}
                        onTouchStart={gestures.handleSwipeStart}
                        onTouchEnd={gestures.handleSwipeEnd}
                    >
                        <div ref={scrollContainerRef} className="space-y-2">
                            {normalizedItems.map((item, index) => {
                                const isActive = item._uiId === highlightedId;
                                const price = formatPrice(item);

                                return (
                                    <motion.button
                                        type="button"
                                        key={item._uiId}
                                        data-id={item._uiId}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.18, delay: Math.min(index * 0.015, 0.1) }}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setHighlightedId(item._uiId);
                                            onSelect(item);
                                        }}
                                        className="w-full text-left"
                                    >
                                        <div
                                            className="relative overflow-hidden px-3 py-2.5"
                                            style={{
                                                borderRadius: 'var(--radius-md)',
                                                minHeight: '96px',
                                                background: isActive
                                                    ? 'linear-gradient(155deg, rgba(6,182,212,0.20) 0%, rgba(6,182,212,0.05) 45%, rgba(5,8,16,0.96) 100%)'
                                                    : item._uiId === recommendedId
                                                        ? 'linear-gradient(155deg, rgba(249,115,22,0.12) 0%, rgba(5,8,16,0.88) 100%)'
                                                        : 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(5,8,16,0.84) 100%)',
                                                border: isActive
                                                    ? '1px solid rgba(6,182,212,0.45)'
                                                    : item._uiId === recommendedId
                                                        ? '1px solid rgba(249,115,22,0.18)'
                                                        : '1px solid rgba(255,255,255,0.05)',
                                                boxShadow: isActive
                                                    ? '0 0 0 1px rgba(6,182,212,0.20) inset, 0 10px 20px rgba(0,0,0,0.26)'
                                                    : '0 6px 14px rgba(0,0,0,0.16)',
                                                // no backdropFilter in expanded list — avoids per-item compositing layers
                                            }}
                                        >
                                            {isActive && (
                                                <div
                                                    className="absolute inset-x-6 top-0 h-px"
                                                    style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.90), transparent)' }}
                                                />
                                            )}
                                            {!isActive && item._uiId === recommendedId && (
                                                <div
                                                    className="absolute inset-x-6 top-0 h-px"
                                                    style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.58), transparent)' }}
                                                />
                                            )}

                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-[10px] uppercase tracking-[0.16em] ${isActive ? 'text-cyan-100' : 'text-white/44'}`}
                                                            style={{
                                                                borderRadius: 'var(--radius-pill)',
                                                                padding: '2px 8px',
                                                                background: isActive ? 'rgba(6,182,212,0.16)' : 'rgba(255,255,255,0.06)',
                                                            }}
                                                        >
                                                            {getCuisine(item)}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 text-[14px] font-semibold text-white">{item?.name || 'Pozycja menu'}</div>
                                                    <div className={`mt-1.5 line-clamp-2 text-[12px] leading-5 ${isActive ? 'text-white/94' : 'text-white/70'}`}>{getMetaLine(item, 'menu')}</div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5">
                                                    {price && <div className={`text-[14px] font-semibold ${isActive ? 'text-cyan-100' : 'text-amber-200'}`}>{price}</div>}
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${isActive ? 'bg-cyan-400/18 text-cyan-100' : 'bg-white/7 text-white/58'}`}>
                                                        {isActive ? 'Wybrane' : 'Wybierz'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </SheetScrollable>
                </div>
            )}
        </div>
    );
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
}: ContextualIslandProps) {
    const normalizedItems = useMemo(() => items.map((item, index) => ({ ...item, _uiId: getItemId(item, index) })), [items]);

    if (!normalizedItems.length) return null;

    const activeIndex = normalizedItems.findIndex((item) => item._uiId === highlightedId);
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;
    const headerTitle = title || (type === 'restaurant' ? 'Restauracje' : 'Menu restauracji');

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
        initialSnap: 'peek' as SheetSnap,
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
        <BottomSheetContainer {...sheetProps}>
            {({ snap, setSnap }) => (
                <MenuSheetContent
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
                />
            )}
        </BottomSheetContainer>
    );
}

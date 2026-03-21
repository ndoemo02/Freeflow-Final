import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import RestaurantSheetContent from './RestaurantSheetContent';
import BottomSheetContainer, { useBottomSheetContext } from './sheet/BottomSheetContainer';
import SheetScrollable from './sheet/SheetScrollable';
import { getSheetViewportSnapPositions } from './sheet/sheetPhysics';
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
}

const MENU_CARD_HEIGHT = 96;

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

function getDepthStyle(offset: number) {
    const abs = Math.abs(offset);

    if (abs === 0) {
        return { scale: 1, opacity: 1, y: 0, z: 30, blur: 0, brightness: 1 };
    }

    if (abs === 1) {
        return { scale: 0.92, opacity: 0.55, y: offset * 90, z: 20, blur: 6, brightness: 0.75 };
    }

    return { scale: 0.84, opacity: 0.25, y: offset * 150, z: 10, blur: 12, brightness: 0.68 };
}

function resolveStackAnchorTop(snap: SheetSnap, stackHeight: number) {
    if (typeof window === 'undefined') {
        return 112;
    }

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

function FloatingMenuFocusCard({
    item,
    stackOffset,
    isRecommended,
    onClick,
}: {
    item: any;
    stackOffset: number;
    isRecommended: boolean;
    onClick: () => void;
}) {
    const depthStyle = getDepthStyle(stackOffset);
    const isFocused = stackOffset === 0;
    const price = formatPrice(item);

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full origin-center text-left"
            style={{
                gridArea: '1 / 1',
                alignSelf: 'center',
                height: `${MENU_CARD_HEIGHT}px`,
                transform: `translate3d(0, ${depthStyle.y}px, 0) scale(${depthStyle.scale})`,
                opacity: depthStyle.opacity,
                filter: `blur(${depthStyle.blur}px) brightness(${depthStyle.brightness})`,
                zIndex: depthStyle.z,
                transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease, filter 220ms ease',
                willChange: 'transform',
            }}
            aria-label={item?.name || 'Pozycja menu'}
        >
            <div
                className="relative h-full overflow-hidden rounded-[20px] px-3.5 py-2.5"
                style={{
                    background: isFocused
                        ? 'linear-gradient(140deg, rgba(34,211,238,0.24) 0%, rgba(8,12,20,0.97) 100%)'
                        : isRecommended
                            ? 'linear-gradient(140deg, rgba(255,184,77,0.16) 0%, rgba(8,16,28,0.92) 100%)'
                            : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(8,13,24,0.74))',
                    border: isFocused ? '1px solid rgba(34,211,238,0.58)' : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: isFocused
                        ? '0 0 0 1px rgba(34,211,238,0.3) inset, 0 12px 24px rgba(0,0,0,0.3)'
                        : '0 8px 16px rgba(0,0,0,0.18)',
                    backdropFilter: 'blur(12px) saturate(1.08)',
                    WebkitBackdropFilter: 'blur(12px) saturate(1.08)',
                }}
            >
                {(isFocused || isRecommended) ? (
                    <div className="absolute inset-x-5 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${isFocused ? 'rgba(34,211,238,0.9)' : 'rgba(255,184,77,0.56)'}, transparent)` }} />
                ) : null}

                {isFocused ? (
                    null
                ) : null}

                <div className="flex h-full items-center gap-3">
                    <div className="min-w-0 flex-1">
                        {isFocused ? (
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-cyan-400/16 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                                    {getCuisine(item)}
                                </span>
                                {price ? <span className="text-[12px] font-semibold text-cyan-100">{price}</span> : null}
                            </div>
                        ) : null}

                        <div className={`mt-2 truncate text-[15px] font-semibold ${isFocused ? 'text-white' : 'text-white/60'}`}>{item?.name || 'Pozycja menu'}</div>
                        {isFocused ? (
                            <div className="mt-1 line-clamp-2 text-[12px] text-white/94">{getMetaLine(item, 'menu')}</div>
                        ) : null}
                    </div>

                    {isFocused ? (
                        <span className="rounded-full bg-cyan-400/18 px-2 py-0.5 text-[10px] text-cyan-100">
                            Wybrane
                        </span>
                    ) : null}
                </div>
            </div>
        </button>
    );
}

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
    const stackRef = useRef<HTMLDivElement>(null);
    const swipeStartYRef = useRef<number | null>(null);
    const swipeStartAtRef = useRef(0);
    const lastWheelAtRef = useRef(0);
    const pointerStartYRef = useRef<number | null>(null);
    const pointerStartAtRef = useRef(0);
    const isExpanded = snap === 'expanded';
    const isTeaser = snap === 'closed';
    const stackOffsets = [-1, 0, 1];

    const stackItems = useMemo(
        () => stackOffsets
            .map((offset) => ({ offset, item: normalizedItems[currentIndex + offset] }))
            .filter((entry) => Boolean(entry.item)),
        [currentIndex, normalizedItems, stackOffsets],
    );

    useEffect(() => {
        if (!isExpanded || !highlightedId || !scrollContainerRef.current) {
            return;
        }

        const container = scrollContainerRef.current;
        const activeElement = container.querySelector(`[data-id="${highlightedId}"]`);
        if (activeElement) {
            const target = activeElement as HTMLElement;
            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const isVisible =
                targetRect.top >= containerRect.top + 8 &&
                targetRect.bottom <= containerRect.bottom - 8;

            if (!isVisible) {
                target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [highlightedId, isExpanded]);

    const handleCtaPress = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (snap === 'closed') {
            setSnap('peek');
            return;
        }
        if (snap === 'peek') {
            setSnap('expanded');
            return;
        }
        setSnap('peek');
    }, [setSnap, snap]);

    const handleSwipeStart = useCallback((event: React.TouchEvent<HTMLElement>) => {
        swipeStartYRef.current = event.touches[0]?.clientY ?? null;
        swipeStartAtRef.current = performance.now();
    }, []);

    const handlePeekWheel = useCallback((event: React.WheelEvent<HTMLElement>) => {
        if (isExpanded || Math.abs(event.deltaY) < 8) {
            return;
        }

        const now = performance.now();
        if (now - lastWheelAtRef.current < 90) {
            event.preventDefault();
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        lastWheelAtRef.current = now;
        const direction = event.deltaY > 0 ? 1 : -1;
        const steps = Math.min(3, Math.max(1, Math.round(Math.abs(event.deltaY) / 120)));
        goTo(currentIndex + direction * steps);
    }, [currentIndex, goTo, isExpanded]);

    const applyGesture = useCallback((
        deltaY: number,
        velocityY: number,
        event?: { preventDefault?: () => void; stopPropagation?: () => void },
    ) => {
        const isStrongSwipe = Math.abs(deltaY) >= 96 || Math.abs(velocityY) >= 900;
        if (!isStrongSwipe) {
            if (snap !== 'expanded' && Math.abs(deltaY) >= 28) {
                event?.preventDefault?.();
                event?.stopPropagation?.();
                goTo(currentIndex + (deltaY < 0 ? 1 : -1));
            }
            return;
        }

        if (deltaY < 0 && snap !== 'expanded') {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            setSnap('expanded');
            return;
        }

        if (deltaY > 0 && snap === 'expanded' && boundary.atTop) {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            setSnap('peek');
        }
    }, [boundary.atTop, currentIndex, goTo, setSnap, snap]);

    const handleSwipeEnd = useCallback((event: React.TouchEvent<HTMLElement>) => {
        if (swipeStartYRef.current == null) {
            return;
        }

        const endY = event.changedTouches[0]?.clientY;
        if (typeof endY !== 'number') {
            swipeStartYRef.current = null;
            return;
        }

        const deltaY = endY - swipeStartYRef.current;
        const elapsed = Math.max(performance.now() - swipeStartAtRef.current, 16);
        const velocityY = (deltaY / elapsed) * 1000;
        swipeStartYRef.current = null;
        applyGesture(deltaY, velocityY, event);
    }, [applyGesture]);

    const handlePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'mouse') {
            return;
        }

        pointerStartYRef.current = event.clientY;
        pointerStartAtRef.current = performance.now();
    }, []);

    const handlePointerUp = useCallback((event: React.PointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'mouse' || pointerStartYRef.current == null) {
            return;
        }

        const deltaY = event.clientY - pointerStartYRef.current;
        const elapsed = Math.max(performance.now() - pointerStartAtRef.current, 16);
        const velocityY = (deltaY / elapsed) * 1000;
        pointerStartYRef.current = null;
        applyGesture(deltaY, velocityY, event);
    }, [applyGesture]);

    const handlePointerCancel = useCallback(() => {
        pointerStartYRef.current = null;
    }, []);

    useEffect(() => {
        const root = document.querySelector('.freeflow');
        if (!root) return;

        root.classList.toggle('island-full-list', isExpanded);

        return () => {
            root.classList.remove('island-full-list');
        };
    }, [isExpanded]);

    const stackHeight = isTeaser ? 210 : 240;
    const stackAnchorTop = useMemo(() => resolveStackAnchorTop(snap, stackHeight), [snap, stackHeight]);
    const stackSafeBottom = 'calc(env(safe-area-inset-bottom) + 84px)';
    const expandedSafeBottom = 'calc(env(safe-area-inset-bottom) + 84px)';
    const ctaLabel = snap === 'closed' ? 'Wyspa' : snap === 'peek' ? 'Pelna lista' : 'Wyspa';

    return (
        <div
            className="relative flex h-full min-h-0 flex-col overflow-visible text-white"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
        >
            {!isExpanded ? (
                <div
                    className="relative z-10 flex min-h-0 flex-1 flex-col px-3"
                    style={{ paddingBottom: stackSafeBottom }}
                    onTouchStart={handleSwipeStart}
                    onTouchEnd={handleSwipeEnd}
                    onWheel={handlePeekWheel}
                >
                    <div
                        ref={stackRef}
                        className="absolute inset-x-3 z-[55] island-stack"
                        style={{
                            top: `${Math.round(stackAnchorTop)}px`,
                            willChange: 'transform',
                            contain: 'layout paint',
                        }}
                    >
                        <div
                            className="relative overflow-visible"
                            style={{
                                height: `${stackHeight}px`,
                                perspective: '960px',
                                transformStyle: 'preserve-3d',
                                willChange: 'transform',
                                contain: 'layout paint',
                            }}
                        >
                            <div
                                className="absolute -inset-x-2 -inset-y-3 z-[99] pointer-events-none"
                                style={{
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 20%, rgba(0,0,0,0) 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,1) 100%)',
                                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 20%, rgba(0,0,0,0) 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,1) 100%)',
                                }}
                            />

                            <div
                                className="relative h-full w-full z-[95]"
                                style={{
                                    display: 'grid',
                                    alignItems: 'center',
                                }}
                            >
                                {stackItems.map(({ item, offset }) => (
                                    <FloatingMenuFocusCard
                                        key={`${item._uiId}-${offset}`}
                                        item={item}
                                        stackOffset={offset}
                                        isRecommended={item._uiId === recommendedId}
                                        onClick={() => {
                                            setHighlightedId(item._uiId);
                                            onSelect(item);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="pointer-events-auto mt-auto flex justify-end pb-[calc(env(safe-area-inset-bottom)+96px)] pr-1">
                        <button
                            type="button"
                            onClick={handleCtaPress}
                            className="rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-medium text-white/78 backdrop-blur-md transition hover:bg-black/55 hover:text-white"
                        >
                            {ctaLabel}
                        </button>
                    </div>
                </div>
            ) : (
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="px-3 pt-2 pb-1.5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/78">{headerTitle}</div>
                                    {resultSummary ? <div className="mt-1 text-[12px] text-white/56">{resultSummary}</div> : null}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCtaPress}
                                    className="rounded-full bg-black/35 px-3 py-1.5 text-[11px] font-medium text-white/78 backdrop-blur-md transition hover:bg-black/45 hover:text-white"
                                >
                                    {ctaLabel}
                                </button>
                            </div>
                        </div>

                        <SheetScrollable
                            className="list-scroll tiny-scroll min-h-0 flex-1 space-y-2 px-3"
                            style={{ paddingBottom: expandedSafeBottom }}
                            onTouchStart={handleSwipeStart}
                            onTouchEnd={handleSwipeEnd}
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
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(index * 0.02, 0.14) }}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setHighlightedId(item._uiId);
                                                onSelect(item);
                                            }}
                                            className="w-full text-left"
                                        >
                                            <div
                                                className="relative overflow-hidden rounded-[20px] px-3 py-2.5"
                                                style={{
                                                    minHeight: '102px',
                                                    background: isActive
                                                        ? 'linear-gradient(140deg, rgba(34,211,238,0.22) 0%, rgba(8,12,20,0.95) 100%)'
                                                        : item._uiId === recommendedId
                                                            ? 'linear-gradient(140deg, rgba(255,184,77,0.16) 0%, rgba(8,16,28,0.9) 100%)'
                                                            : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(8,13,24,0.72))',
                                                    border: isActive ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(255,255,255,0.05)',
                                                    boxShadow: isActive
                                                        ? '0 0 0 1px rgba(34,211,238,0.28) inset, 0 10px 22px rgba(0,0,0,0.28)'
                                                        : '0 8px 16px rgba(0,0,0,0.16)',
                                                    backdropFilter: 'blur(12px) saturate(1.08)',
                                                    WebkitBackdropFilter: 'blur(12px) saturate(1.08)',
                                                }}
                                            >
                                                {(isActive || item._uiId === recommendedId) ? (
                                                    <div className="absolute inset-x-5 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${isActive ? 'rgba(34,211,238,0.88)' : 'rgba(255,184,77,0.56)'}, transparent)` }} />
                                                ) : null}

                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${isActive ? 'bg-cyan-400/16 text-cyan-100' : 'bg-white/8 text-white/44'}`}>
                                                                {getCuisine(item)}
                                                            </span>
                                                        </div>

                                                        <div className="mt-2 text-[14px] font-semibold text-white">{item?.name || 'Pozycja menu'}</div>
                                                        <div className={`mt-1.5 line-clamp-2 text-[12px] leading-5 ${isActive ? 'text-white/94' : 'text-white/70'}`}>{getMetaLine(item, 'menu')}</div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-1.5">
                                                        {price ? <div className={`text-[14px] font-semibold ${isActive ? 'text-cyan-100' : 'text-amber-200'}`}>{price}</div> : null}
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
                    </motion.div>
                </AnimatePresence>
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

    if (!normalizedItems.length) {
        return null;
    }

    const activeIndex = normalizedItems.findIndex((item) => item._uiId === highlightedId);
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;
    const headerTitle = title || (type === 'restaurant' ? 'Restauracje' : 'Menu restauracji');

    const resultSummary = useMemo(() => {
        if (type !== 'restaurant') {
            return subtitle || null;
        }

        const countLabel = getResultsLabel(normalizedItems.length);
        const locationLabel = getLocationLabel(normalizedItems);
        return locationLabel ? `${countLabel} / ${locationLabel}` : countLabel;
    }, [normalizedItems, subtitle, type]);

    const goTo = useCallback((targetIndex: number) => {
        const clamped = Math.max(0, Math.min(normalizedItems.length - 1, targetIndex));
        setHighlightedId(normalizedItems[clamped]?._uiId || null);
    }, [normalizedItems, setHighlightedId]);

    if (type === 'restaurant') {
        return (
            <BottomSheetContainer
                initialSnap="peek"
                lockScrollOn="open"
                position={position}
                className="z-10"
                placementClassName="bottom-0"
                snapClassNames={{
                    closed: 'contextual-island-sheet--closed',
                    peek: 'contextual-island-sheet--peek',
                    expanded: 'contextual-island-sheet--expanded',
                }}
            >
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
        <BottomSheetContainer
            initialSnap="peek"
            lockScrollOn="open"
            position={position}
            className="z-10"
            placementClassName="bottom-0"
            snapClassNames={{
                closed: 'contextual-island-sheet--closed',
                peek: 'contextual-island-sheet--peek',
                expanded: 'contextual-island-sheet--expanded',
            }}
        >
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








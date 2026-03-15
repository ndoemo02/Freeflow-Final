import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import RestaurantSheetContent from './RestaurantSheetContent';
import BottomSheetContainer from './sheet/BottomSheetContainer';
import SheetHandle from './sheet/SheetHandle';
import SheetScrollable from './sheet/SheetScrollable';
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

const FLOATING_CARD_HEIGHT = 92;
const FLOATING_CARD_GAP = 10;
const FLOATING_STRIDE = FLOATING_CARD_HEIGHT + FLOATING_CARD_GAP;

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

function FloatingMenuFocusCard({
    item,
    offsetFromCenter,
    isFocused,
    isRecommended,
    onClick,
}: {
    item: any;
    offsetFromCenter: number;
    isFocused: boolean;
    isRecommended: boolean;
    onClick: () => void;
}) {
    const price = formatPrice(item);
    const metaLine = getMetaLine(item, 'menu');
    const normalizedDistance = Math.min(Math.abs(offsetFromCenter) / (FLOATING_STRIDE * 1.8), 1);
    const eased = normalizedDistance * normalizedDistance;
    const scale = 1.03 - 0.19 * eased;
    const blur = 3.2 * eased;
    const opacity = 1 - 0.62 * eased;

    return (
        <button
            type="button"
            onClick={onClick}
            className="absolute left-0 right-0 mx-auto will-change-transform text-left"
            style={{
                height: `${FLOATING_CARD_HEIGHT}px`,
                top: `calc(100% - 144px + ${offsetFromCenter}px)`,
                transform: `translate3d(0,0,0) scale(${scale.toFixed(4)})`,
                filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none',
                opacity,
                zIndex: isFocused ? 20 : 10 - Math.min(Math.abs(Math.round(offsetFromCenter / FLOATING_STRIDE)), 8),
                transition: 'transform 180ms ease, opacity 180ms ease, filter 180ms ease',
            }}
            aria-label={item.name}
        >
            <div
                className="relative h-full overflow-hidden rounded-[18px]"
                style={{
                    background: isFocused
                        ? 'linear-gradient(135deg, rgba(34,211,238,0.18) 0%, rgba(8,16,28,0.94) 100%)'
                        : isRecommended
                            ? 'linear-gradient(135deg, rgba(255,184,77,0.14) 0%, rgba(10,14,24,0.88) 100%)'
                            : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(10,14,24,0.54))',
                    boxShadow: isFocused
                        ? '0 0 0 1px rgba(34,211,238,0.7) inset, 0 0 28px rgba(34,211,238,0.26), 0 16px 30px rgba(0,0,0,0.34)'
                        : isRecommended
                            ? '0 0 24px rgba(255,184,77,0.14), 0 14px 28px rgba(0,0,0,0.28)'
                            : '0 10px 20px rgba(0,0,0,0.14)',
                    border: isFocused ? '1px solid rgba(34,211,238,0.5)' : '1px solid transparent',
                    backdropFilter: 'blur(16px) saturate(1.15)',
                    WebkitBackdropFilter: 'blur(16px) saturate(1.15)',
                }}
            >
                {isFocused ? (
                    <div
                        className="pointer-events-none absolute inset-x-6 -bottom-8 h-16 rounded-full"
                        style={{
                            background: 'radial-gradient(circle, rgba(34,211,238,0.30) 0%, rgba(34,211,238,0.14) 40%, rgba(34,211,238,0) 74%)',
                            filter: 'blur(16px)',
                        }}
                    />
                ) : null}

                {(isFocused || isRecommended) ? (
                    <div
                        className="absolute inset-x-5 top-0 h-px"
                        style={{ background: `linear-gradient(90deg, transparent, ${isFocused ? 'rgba(34,211,238,0.92)' : 'rgba(255,184,77,0.55)'}, transparent)` }}
                    />
                ) : null}

                {isFocused ? (
                    <div className="absolute right-3 top-3 rounded-full bg-cyan-400/18 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.2)]">
                        Fokus
                    </div>
                ) : null}

                <div className="flex h-full items-center gap-3 px-3.5">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${isFocused ? 'bg-cyan-400/16 text-cyan-100' : 'bg-white/6 text-white/42'}`}>
                                {getCuisine(item)}
                            </span>
                            {price ? <span className={`text-[12px] font-semibold ${isFocused ? 'text-cyan-100' : 'text-amber-200'}`}>{price}</span> : null}
                        </div>
                        <div className={`mt-2 truncate text-[14px] font-semibold ${isFocused ? 'text-cyan-50' : 'text-white'}`}>{item.name}</div>
                        <div className={`mt-1 line-clamp-3 text-[11px] leading-4 ${isFocused ? 'text-cyan-50/92' : 'text-white/62'}`}>{metaLine}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${isFocused ? 'bg-cyan-400/18 text-cyan-100' : 'bg-white/6 text-white/54'}`}>
                            {isFocused ? 'Wybrane' : 'Wybierz'}
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}

interface MenuSheetContentProps {
    normalizedItems: any[];
    position: 'left' | 'right';
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
    position,
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
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const peekRef = useRef<HTMLDivElement>(null);
    const focusedItem = normalizedItems[currentIndex];

    useEffect(() => {
        if (snap === 'expanded' && highlightedId && scrollContainerRef.current) {
            const activeElement = scrollContainerRef.current.querySelector(`[data-id="${highlightedId}"]`);
            if (activeElement) {
                (activeElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [highlightedId, snap]);

    useEffect(() => {
        if (snap !== 'peek') {
            return;
        }

        const element = peekRef.current;
        if (!element) {
            return;
        }

        let wheelLocked = false;
        let unlockTimer: number | null = null;

        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            event.stopPropagation();

            if (wheelLocked) {
                return;
            }

            wheelLocked = true;
            const direction = event.deltaY > 0 ? 1 : -1;
            goTo(currentIndex + direction);

            unlockTimer = window.setTimeout(() => {
                wheelLocked = false;
            }, 180);
        };

        element.addEventListener('wheel', onWheel, { passive: false, capture: true });

        return () => {
            element.removeEventListener('wheel', onWheel, true);
            if (unlockTimer !== null) {
                window.clearTimeout(unlockTimer);
            }
        };
    }, [currentIndex, goTo, snap]);

    return (
        <div className="relative flex h-full min-h-0 flex-col overflow-visible text-white">
            {snap === 'peek' ? <SheetHandle mode="surface" /> : null}
            <SheetHandle mode={snap === 'peek' ? 'overlay' : 'bar'} />
            <div className="absolute right-3 top-3 z-20 md:right-4 md:top-4">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSnap(snap === 'expanded' ? 'peek' : 'expanded');
                    }}
                    className="rounded-full bg-black/35 px-3 py-1.5 text-[11px] font-medium text-white/76 backdrop-blur-md transition hover:bg-black/45 hover:text-white"
                >
                    {snap === 'expanded' ? 'Zwin' : 'Rozwin'}
                </button>
            </div>

            {snap === 'peek' ? (
                <div ref={peekRef} className="relative z-10 flex flex-1 flex-col px-3 pb-20 pt-32 md:pt-40">
                    <div
                        className="relative mx-auto h-[16rem] md:h-[20rem] w-full overflow-visible"
                        style={{
                            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.88) 18%, rgba(0,0,0,1) 58%, rgba(0,0,0,1) 78%, rgba(0,0,0,0.76) 92%, rgba(0,0,0,0) 100%)',
                            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.88) 18%, rgba(0,0,0,1) 58%, rgba(0,0,0,1) 78%, rgba(0,0,0,0.76) 92%, rgba(0,0,0,0) 100%)',
                        }}
                    >
                        <div
                            className="absolute inset-0 transition-colors duration-500"
                            style={{
                                background: focusedItem
                                    ? 'radial-gradient(circle at 50% 74%, rgba(34,211,238,0.22) 0%, rgba(34,211,238,0.12) 18%, transparent 62%)'
                                    : 'none',
                            }}
                        />
                        <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
                            style={{
                                background: 'linear-gradient(180deg, rgba(2,6,23,0) 0%, rgba(2,6,23,0.1) 18%, rgba(2,6,23,0.34) 56%, rgba(2,6,23,0.72) 100%)',
                                filter: 'blur(18px)',
                            }}
                        />

                        {normalizedItems.map((item, index) => {
                            const offsetFromCenter = (index - currentIndex) * FLOATING_STRIDE;
                            if (Math.abs(offsetFromCenter) > FLOATING_STRIDE * 4.8) return null;

                            return (
                                <FloatingMenuFocusCard
                                    key={item._uiId}
                                    item={item}
                                    offsetFromCenter={offsetFromCenter}
                                    isFocused={index === currentIndex}
                                    isRecommended={item._uiId === recommendedId}
                                    onClick={() => {
                                        setHighlightedId(item._uiId);
                                        onSelect(item);
                                    }}
                                />
                            );
                        })}
                    </div>

                    <div className="mt-2 hidden items-start justify-between gap-2 px-1 text-xs text-white/48 md:flex md:flex-row md:items-end md:gap-3">
                        <div className="min-w-0 leading-5">Kolem zmieniasz fokus dan</div>
                        <div className="flex items-center gap-2 self-stretch md:self-end">
                            <span className="rounded-full bg-white/6 px-2 py-1 text-[11px] text-white/58">Rozwin, aby zobaczyc liste</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSnap('expanded');
                                }}
                                className="rounded-full bg-amber-300/12 px-3 py-1 text-[11px] text-amber-50 transition hover:bg-amber-300/18"
                            >
                                Rozwin liste
                            </button>
                        </div>
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
                        <SheetScrollable className="tiny-scroll mt-3 min-h-0 flex-1 space-y-2 px-3 pb-3">
                            <div ref={scrollContainerRef} className="space-y-2">
                                {normalizedItems.map((item, idx) => {
                                    const isActive = item._uiId === highlightedId;
                                    const price = formatPrice(item);

                                    return (
                                        <motion.button
                                            type="button"
                                            key={item._uiId}
                                            data-id={item._uiId}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setHighlightedId(item._uiId);
                                                onSelect(item);
                                            }}
                                            className="w-full text-left"
                                        >
                                            <div
                                                className="relative overflow-hidden rounded-[22px] px-4 py-3.5"
                                                style={{
                                                    background: isActive
                                                        ? 'linear-gradient(135deg, rgba(34,211,238,0.18) 0%, rgba(8,16,28,0.94) 100%)'
                                                        : (item._uiId === recommendedId
                                                            ? 'linear-gradient(135deg, rgba(255,184,77,0.16) 0%, rgba(10,14,24,0.88) 100%)'
                                                            : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(10,14,24,0.68))'),
                                                    boxShadow: isActive
                                                        ? '0 0 0 1px rgba(34,211,238,0.7) inset, 0 0 30px rgba(34,211,238,0.24), 0 18px 34px rgba(0,0,0,0.3)'
                                                        : (item._uiId === recommendedId
                                                            ? '0 0 28px rgba(255,184,77,0.22), 0 16px 30px rgba(0,0,0,0.28)'
                                                            : '0 10px 20px rgba(0,0,0,0.14)'),
                                                    border: isActive ? '1px solid rgba(34,211,238,0.5)' : '1px solid transparent',
                                                    backdropFilter: 'blur(16px) saturate(1.15)',
                                                    WebkitBackdropFilter: 'blur(16px) saturate(1.15)',
                                                }}
                                            >
                                                {(isActive || item._uiId === recommendedId) ? (
                                                    <div
                                                        className="absolute inset-x-5 top-0 h-px"
                                                        style={{ background: `linear-gradient(90deg, transparent, ${isActive ? 'rgba(34,211,238,0.92)' : 'rgba(255,184,77,0.45)'}, transparent)` }}
                                                    />
                                                ) : null}

                                                {isActive ? (
                                                    <div className="absolute right-3 top-3 rounded-full bg-cyan-400/18 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.22)]">
                                                        Aktywne
                                                    </div>
                                                ) : null}

                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${isActive ? 'bg-cyan-400/16 text-cyan-100' : 'bg-white/6 text-white/42'}`}>
                                                                {getCuisine(item)}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 text-[15px] font-semibold text-white">{item.name}</div>
                                                        <div className={`mt-2 line-clamp-3 text-[13px] leading-5 ${isActive ? 'text-cyan-50/92' : 'text-white/66'}`}>{getMetaLine(item, 'menu')}</div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        {price ? <div className={`text-[15px] font-semibold ${isActive ? 'text-cyan-100' : 'text-amber-200'}`}>{price}</div> : null}
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${isActive ? 'bg-cyan-400/18 text-cyan-100' : 'bg-white/6 text-white/54'}`}>
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

    if (type === 'restaurant') {
        return (
            <BottomSheetContainer
                initialSnap="peek"
                position={position}
                className="z-40"
                placementClassName="bottom-[118px] sm:bottom-[126px] md:bottom-[164px]"
                snapClassNames={{
                    closed: 'w-[15rem] h-0 opacity-0',
                    peek: 'w-[15.5rem] sm:w-[16.5rem] md:w-[20rem] h-[45vh] max-h-[45vh] overflow-hidden rounded-t-[28px]',
                    expanded: 'w-[15.5rem] sm:w-[16.5rem] md:w-[20rem] h-[100vh] max-h-[100vh] overflow-hidden rounded-t-[28px]',
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
            position={position}
            className="z-[60]"
            snapClassNames={{
                peek: 'w-[20.5rem] md:w-[22rem] h-[22.5rem] md:h-[25rem]',
                expanded: 'w-[24rem] md:w-[27rem] h-[28rem] md:h-[32rem] max-h-[72vh]',
            }}
        >
            {({ snap, setSnap }) => (
                <MenuSheetContent
                    normalizedItems={normalizedItems}
                    position={position}
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

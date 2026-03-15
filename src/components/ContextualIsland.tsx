import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FocusStack, { FocusStackItem } from './FocusStack';
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

const FLOATING_CARD_HEIGHT = 72;
const FLOATING_CARD_GAP = 10;
const FLOATING_STRIDE = FLOATING_CARD_HEIGHT + FLOATING_CARD_GAP;
const FLOATING_SPRING_STIFFNESS = 0.13;
const FLOATING_SPRING_DAMPING = 0.8;
const FLOATING_EXPAND_DISTANCE_THRESHOLD = 86;
const FLOATING_EXPAND_VELOCITY_THRESHOLD = 0.62;

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

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

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

function getRestaurantSecondary(item: any) {
    const parts = [item?.cuisine_type, item?.city];

    if (item?.distance != null) {
        parts.push(typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km` : item.distance);
    } else if (item?.delivery_time) {
        parts.push(item.delivery_time);
    }

    return parts.filter(Boolean).join(' / ');
}

function MenuPreviewCard({
    item,
    isRecommended,
    onClick,
}: {
    item: any;
    isRecommended: boolean;
    onClick: () => void;
}) {
    const price = formatPrice(item);
    const metaLine = getMetaLine(item, 'menu');

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left"
        >
            <div
                className="relative overflow-hidden rounded-[18px] px-3.5 py-3"
                style={{
                    background: isRecommended
                        ? 'linear-gradient(135deg, rgba(255,184,77,0.14) 0%, rgba(10,14,24,0.88) 100%)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(10,14,24,0.54))',
                    boxShadow: isRecommended
                        ? '0 0 24px rgba(255,184,77,0.14), 0 14px 28px rgba(0,0,0,0.28)'
                        : '0 10px 20px rgba(0,0,0,0.14)',
                    backdropFilter: 'blur(16px) saturate(1.15)',
                    WebkitBackdropFilter: 'blur(16px) saturate(1.15)',
                }}
            >
                {isRecommended ? (
                    <div
                        className="absolute inset-x-5 top-0 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,184,77,0.45), transparent)' }}
                    />
                ) : null}

                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/42">
                                {getCuisine(item)}
                            </span>
                        </div>
                        <div className="mt-2 truncate text-[14px] font-semibold text-white">{item.name}</div>
                        <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/62">{metaLine}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                        {price ? <div className="text-[14px] font-semibold text-amber-200">{price}</div> : null}
                        <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-white/54">Wybierz</span>
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
    stackItems: FocusStackItem[];
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
    stackItems,
    onSelect,
    goTo,
    snap,
    setSnap,
}: MenuSheetContentProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (snap === 'expanded' && highlightedId && scrollContainerRef.current) {
            const activeElement = scrollContainerRef.current.querySelector(`[data-id="${highlightedId}"]`);
            if (activeElement) {
                (activeElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [highlightedId, snap]);

    return (
        <div className="relative flex h-full flex-col overflow-visible text-white">
            <SheetHandle />
            <div className="px-3.5 py-2.5 md:px-4 md:py-3.5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-white/38">FreeFlow</div>
                        <h3 className="mt-1 text-sm font-semibold text-white">{headerTitle}</h3>
                        {resultSummary ? <p className="mt-1 text-xs text-white/54">{resultSummary}</p> : null}
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSnap(snap === 'expanded' ? 'peek' : 'expanded');
                        }}
                        className="rounded-full bg-white/6 px-3 py-1.5 text-[11px] font-medium text-white/68 transition hover:bg-white/10 hover:text-white"
                    >
                        {snap === 'expanded' ? 'Zwin' : 'Rozwin'}
                    </button>
                </div>
            </div>

            {snap === 'peek' ? (
                <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5 md:pt-3">
                    <div className="relative mx-auto h-[12.5rem] md:h-[16.5rem] w-full overflow-visible">
                        <FocusStack
                            side={position}
                            items={stackItems}
                            activeIndex={currentIndex}
                            setActiveIndex={goTo}
                            focusTop="35%"
                            cardWidth="18rem"
                        />
                    </div>

                    <div className="mt-2 hidden items-start justify-between gap-2 px-1 text-xs text-white/48 md:flex md:flex-row md:items-end md:gap-3">
                        <div className="min-w-0 leading-5">Pelna lista w zasiegu</div>
                        <div className="flex items-center gap-2 self-stretch md:self-end">
                            <span className="rounded-full bg-white/6 px-2 py-1 text-[11px] text-white/58">Kolem zmieniasz focus</span>
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
                        <SheetScrollable className="tiny-scroll mt-3 flex-1 space-y-2 px-3 pb-3">
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
                                                        ? (item._uiId === recommendedId
                                                            ? 'linear-gradient(135deg, rgba(255,184,77,0.16) 0%, rgba(10,14,24,0.88) 100%)'
                                                            : 'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(10,14,24,0.86) 100%)')
                                                        : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(10,14,24,0.68))',
                                                    boxShadow: isActive
                                                        ? '0 14px 28px rgba(0,0,0,0.22)'
                                                        : '0 10px 20px rgba(0,0,0,0.14)',
                                                    backdropFilter: 'blur(16px) saturate(1.15)',
                                                    WebkitBackdropFilter: 'blur(16px) saturate(1.15)',
                                                }}
                                            >
                                                {isActive ? (
                                                    <div
                                                        className="absolute inset-x-5 top-0 h-px"
                                                        style={{ background: `linear-gradient(90deg, transparent, ${item._uiId === recommendedId ? 'rgba(255,184,77,0.45)' : 'rgba(255,255,255,0.28)'}, transparent)` }}
                                                    />
                                                ) : null}

                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/42">
                                                                {getCuisine(item)}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 text-[15px] font-semibold text-white">{item.name}</div>
                                                        <div className="mt-2 line-clamp-3 text-[13px] leading-5 text-white/66">{getMetaLine(item, 'menu')}</div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        {price ? <div className="text-[15px] font-semibold text-amber-200">{price}</div> : null}
                                                        <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-white/54">Wybierz</span>
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

    const stackItems = useMemo<FocusStackItem[]>(() => {
        return normalizedItems.map((item) => ({
            id: item._uiId,
            render: () => (
                <MenuPreviewCard
                    item={item}
                    isRecommended={item._uiId === recommendedId}
                    onClick={() => {
                        setHighlightedId(item._uiId);
                        onSelect(item);
                    }}
                />
            ),
        }));
    }, [normalizedItems, onSelect, recommendedId, setHighlightedId]);

    if (type === 'restaurant') {
        return (
            <BottomSheetContainer
                initialSnap="peek"
                position={position}
                className="z-40"
                placementClassName="bottom-[118px] sm:bottom-[126px] md:bottom-[164px]"
                snapClassNames={{
                    peek: 'w-[13.5rem] sm:w-[14.5rem] md:w-[16.5rem] h-[9.75rem] sm:h-[10.5rem] md:h-[14.5rem]',
                    expanded: 'w-[14.5rem] sm:w-[15.5rem] md:w-[20.5rem] h-[18rem] sm:h-[20rem] md:h-[33rem] max-h-[44vh] md:max-h-[65vh]',
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
        <BottomSheetContainer initialSnap="peek" position={position} className="z-[60]">
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
                    stackItems={stackItems}
                    onSelect={onSelect}
                    goTo={goTo}
                    snap={snap}
                    setSnap={setSnap}
                />
            )}
        </BottomSheetContainer>
    );
}







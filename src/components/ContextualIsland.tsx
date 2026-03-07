import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import IslandWrapper from './IslandWrapper';

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

function getRestaurantSecondary(item: any) {
    const parts = [item?.cuisine_type, item?.city];

    if (item?.distance != null) {
        parts.push(typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km` : item.distance);
    } else if (item?.delivery_time) {
        parts.push(item.delivery_time);
    }

    return parts.filter(Boolean).join(' � ');
}

const CARD_WIDTH = 240;
const CARD_GAP = 16;

function RestaurantDepthCarousel({
    items,
    currentIndex,
    highlightedId,
    recommendedId,
    onSelect,
    setHighlightedId,
    goTo,
}: {
    items: any[];
    currentIndex: number;
    highlightedId: string | null;
    recommendedId: string | null;
    onSelect: (item: any) => void;
    setHighlightedId: (id: string | null) => void;
    goTo: (idx: number) => void;
}) {
    const handleDragEnd = useCallback(
        (_e: any, info: any) => {
            const OFFSET_THRESHOLD = 40;
            const VELOCITY_THRESHOLD = 400;
            const vx = info.velocity.x;
            const ox = info.offset.x;
            if (vx < -VELOCITY_THRESHOLD || ox < -OFFSET_THRESHOLD) goTo(currentIndex + 1);
            else if (vx > VELOCITY_THRESHOLD || ox > OFFSET_THRESHOLD) goTo(currentIndex - 1);
        },
        [currentIndex, goTo]
    );

    const offsetX = 140 - currentIndex * (CARD_WIDTH + CARD_GAP);

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="relative flex h-full min-h-[200px] items-center justify-center overflow-hidden select-none">
                <motion.div
                    className="flex cursor-grab items-center gap-4 active:cursor-grabbing"
                    drag="x"
                    dragDirectionLock
                    dragMomentum={false}
                    dragElastic={0.2}
                    onDragEnd={handleDragEnd}
                    animate={{ x: offsetX }}
                    transition={{ type: 'spring', stiffness: 300, damping: 35 }}
                    style={{ paddingLeft: 80, paddingRight: 80 }}
                >
                    {items.map((item, idx) => {
                        const dist = Math.abs(idx - currentIndex);
                        const scale = dist === 0 ? 1 : dist === 1 ? 0.88 : dist === 2 ? 0.76 : 0.64;
                        const opacity = dist === 0 ? 1 : dist === 1 ? 0.82 : dist === 2 ? 0.48 : 0.28;
                        const blur = dist === 0 ? 0 : dist === 1 ? 1.5 : dist === 2 ? 3.5 : 6;
                        const isRecommended = item._uiId === recommendedId;
                        return (
                            <motion.div
                                key={item._uiId}
                                className="flex shrink-0 cursor-pointer"
                                style={{ width: CARD_WIDTH }}
                                animate={{
                                    scale,
                                    opacity,
                                    filter: `blur(${blur}px)`,
                                    zIndex: 10 - dist,
                                }}
                                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                                onClick={() => {
                                    setHighlightedId(item._uiId);
                                    onSelect(item);
                                }}
                            >
                                <div
                                    className={`rounded-2xl ${
                                        isRecommended ? 'ff-prismatic-border' : ''
                                    }`}
                                >
                                    <RestaurantRow
                                        item={item}
                                        compact
                                        isActive={item._uiId === highlightedId}
                                        isRecommended={isRecommended}
                                        onClick={() => {
                                            setHighlightedId(item._uiId);
                                            onSelect(item);
                                        }}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </div>
    );
}

function RestaurantRow({
    item,
    isActive,
    isRecommended,
    onClick,
    compact = false,
}: {
    item: any;
    isActive: boolean;
    isRecommended: boolean;
    onClick: () => void;
    compact?: boolean;
}) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={`group w-full rounded-2xl px-3 py-3 text-left transition-shadow duration-200 ${
                isActive
                    ? 'bg-white/[0.08] border border-cyan-300/40 shadow-[0_16px_40px_rgba(0,0,0,0.45)]'
                    : 'bg-white/[0.03] border border-white/8 hover:bg-white/[0.07] hover:shadow-[0_14px_34px_rgba(0,0,0,0.4)]'
            } backdrop-blur-md`}
        >
            <div className="flex items-center gap-3">
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border ${
                        isRecommended
                            ? 'border-amber-300/80 bg-[radial-gradient(circle_at_top_left,rgba(253,230,138,0.9),rgba(15,23,42,0.9))] shadow-[0_0_18px_rgba(252,211,77,0.75)]'
                            : 'border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.55),rgba(15,23,42,0.9))]'
                    }`}
                >
                    <span className="text-xs font-semibold text-white/90">
                        {item?.rating ? item.rating : '★'}
                    </span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">{item.name}</div>
                            <div className={`mt-1 truncate text-white/60 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                                {getRestaurantSecondary(item) || getMetaLine(item, 'restaurant')}
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-[11px] text-white/48">
                            {item?.distance ? (
                                <span className="hidden sm:inline rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/60">
                                    {typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km` : item.distance}
                                </span>
                            ) : null}
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-xs text-white/70 transition group-hover:translate-x-0.5 group-hover:bg-white/10">
                                ›
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.button>
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
    subtitle
}: ContextualIslandProps) {
    const [expanded, setExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(304);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let retries = 0;
        const measure = () => {
            const width = containerRef.current?.offsetWidth || 0;
            if (width > 0) {
                setContainerWidth(width);
            } else if (retries < 10) {
                retries += 1;
                setTimeout(measure, 80);
            }
        };

        const timeout = setTimeout(measure, 30);
        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width || 0;
            if (width > 0) setContainerWidth(width);
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => {
            clearTimeout(timeout);
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        if (expanded && highlightedId && scrollContainerRef.current) {
            const activeElement = scrollContainerRef.current.querySelector(`[data-id="${highlightedId}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [highlightedId, expanded]);

    const normalizedItems = useMemo(() => items.map((item, index) => ({ ...item, _uiId: getItemId(item, index) })), [items]);

    if (!normalizedItems.length) return null;

    const activeIndex = normalizedItems.findIndex((item) => item._uiId === highlightedId);
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;
    const currentItem = normalizedItems[currentIndex] || normalizedItems[0];
    const canDrag = normalizedItems.length > 1;
    const headerTitle = title || (type === 'restaurant' ? 'Restauracje' : 'Menu restauracji');

    const resultSummary = useMemo(() => {
        if (type !== 'restaurant') return subtitle || null;
        const countLabel = getResultsLabel(normalizedItems.length);
        const locationLabel = getLocationLabel(normalizedItems);
        return locationLabel ? `${countLabel} � ${locationLabel}` : countLabel;
    }, [normalizedItems, subtitle, type]);

    const previewRestaurants = type === 'restaurant' ? normalizedItems.slice(0, 3) : [];
    const hiddenCount = type === 'restaurant' ? Math.max(0, normalizedItems.length - previewRestaurants.length) : 0;

    const goTo = useCallback((targetIndex: number) => {
        const clamped = Math.max(0, Math.min(normalizedItems.length - 1, targetIndex));
        setHighlightedId(normalizedItems[clamped]?._uiId || null);
    }, [normalizedItems, setHighlightedId]);

    const handleDragEnd = useCallback((_event: any, info: any) => {
        const OFFSET_THRESHOLD = 50;
        const VELOCITY_THRESHOLD = 800;
        const vx = info.velocity.x;
        const ox = info.offset.x;

        if (vx < -VELOCITY_THRESHOLD || ox < -OFFSET_THRESHOLD) {
            goTo(currentIndex + 1);
            return;
        }
        if (vx > VELOCITY_THRESHOLD || ox > OFFSET_THRESHOLD) {
            goTo(currentIndex - 1);
        }
    }, [currentIndex, goTo]);

    return (
        <IslandWrapper
            expanded={expanded}
            setExpanded={setExpanded}
            onClose={onClose}
            position={position}
            className={type === 'menu' ? 'z-[60]' : 'z-40'}
        >
            <div className="relative flex h-full flex-col text-white">
                {type === 'menu' && (
                    <div className="border-b border-white/8 px-4 py-3">
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
                                    setExpanded((v) => !v);
                                }}
                                className="rounded-full bg-white/6 px-3 py-1.5 text-[11px] font-medium text-white/72 transition hover:bg-white/10 hover:text-white"
                            >
                                {expanded ? 'Zwi? list?' : 'Rozwi?'}
                            </button>
                        </div>
                    </div>
                )}
                {type === 'restaurant' ? (
                    <RestaurantDepthCarousel
                        items={normalizedItems}
                        currentIndex={currentIndex}
                        highlightedId={highlightedId}
                        recommendedId={recommendedId}
                        onSelect={onSelect}
                        setHighlightedId={setHighlightedId}
                        goTo={goTo}
                    />
                ) : (
                    <>
                        {!expanded && currentItem && (
                            <div ref={containerRef} className="relative flex-1 overflow-hidden px-3 pb-4 pt-3">
                                <motion.div
                                    className="flex h-full"
                                    style={{ width: `${containerWidth * normalizedItems.length}px` }}
                                    animate={{ x: -(currentIndex * containerWidth) }}
                                    transition={{ type: 'spring', stiffness: 360, damping: 36, mass: 0.9 }}
                                    drag={canDrag ? 'x' : false}
                                    dragDirectionLock
                                    dragMomentum={false}
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.15}
                                    onDragEnd={handleDragEnd}
                                >
                                    {normalizedItems.map((item) => {
                                        const isRecommended = recommendedId === item._uiId;
                                        const price = formatPrice(item);
                                        const metaLine = getMetaLine(item, type);
                                        return (
                                            <div
                                                key={item._uiId}
                                                className="h-full shrink-0 px-1"
                                                style={{ width: `${containerWidth}px` }}
                                            >
                                                <div className={`relative flex h-full flex-col rounded-[22px] border p-4 ${isRecommended ? 'border-amber-300/60 bg-[linear-gradient(180deg,rgba(255,184,77,0.12),rgba(20,23,31,0.82))]' : 'border-white/8 bg-white/[0.04]'}`}>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55">{getCuisine(item)}</span>
                                                            </div>
                                                            <h4 className="mt-3 text-lg font-semibold leading-tight text-white">{item.name}</h4>
                                                            <p className="mt-2 line-clamp-3 text-sm leading-5 text-white/68">{metaLine}</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-auto pt-5">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <div className="flex flex-wrap items-center gap-2 text-white/55">
                                                                {item.distance ? <span>{typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km` : item.distance}</span> : null}
                                                                {item.delivery_time ? <span>{item.delivery_time}</span> : null}
                                                                {item.is_vege ? <span className="rounded-full border border-emerald-400/30 px-2 py-0.5 text-[11px] text-emerald-300">vege</span> : null}
                                                                {item.spicy ? <span className="rounded-full border border-rose-400/30 px-2 py-0.5 text-[11px] text-rose-300">ostre</span> : null}
                                                            </div>
                                                            {price ? <div className="text-lg font-semibold text-amber-200">{price}</div> : null}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${isRecommended ? 'bg-amber-300 text-slate-950 hover:bg-amber-200' : 'bg-white/8 text-white hover:bg-white/14'}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelect(item);
                                                            }}
                                                        >
                                                            Dodaj do zamowienia
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            </div>
                        )}

                        <AnimatePresence>
                            {expanded && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex min-h-0 flex-1 flex-col"
                                >
                                    <div ref={scrollContainerRef} className="tiny-scroll mt-3 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
                                        {normalizedItems.map((item, idx) => {
                                            const isActive = item._uiId === highlightedId;
                                            const isRecommended = item._uiId === recommendedId;
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
                                                    className={`w-full rounded-[20px] border p-4 text-left transition ${isActive ? 'border-cyan-300/50 bg-cyan-300/10' : 'border-white/8 bg-white/[0.04] hover:bg-white/[0.08]'} ${isRecommended ? 'shadow-[0_0_0_1px_rgba(252,211,77,0.35)]' : ''}`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-sm font-semibold text-white">{item.name}</div>
                                                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">{getCuisine(item)}</div>
                                                            <div className="mt-2 text-sm text-white/65">{getMetaLine(item, type)}</div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            {price ? <div className="text-sm font-semibold text-amber-200">{price}</div> : <div className="text-xs text-white/45">{item.rating ? `Ocena ${item.rating}` : ''}</div>}
                                                            <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/55">Dodaj</span>
                                                        </div>
                                                    </div>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {normalizedItems.length > 1 && !expanded && (
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                                {normalizedItems.map((item, idx) => (
                                    <div
                                        key={item._uiId}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-5 bg-amber-300' : 'w-1.5 bg-white/20'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </IslandWrapper>
    );
}

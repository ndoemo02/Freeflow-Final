import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import IslandWrapper from './IslandWrapper';
import FocusStack, { FocusStackItem } from './FocusStack';

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

function FloatingRestaurantFocusCard({
    item,
    offsetFromCenter,
    onClick,
    isRecommended,
}: {
    item: any;
    offsetFromCenter: number;
    onClick: () => void;
    isRecommended: boolean;
}) {
    const secondary = getRestaurantSecondary(item) || getMetaLine(item, 'restaurant');
    const normalizedDistance = Math.min(Math.abs(offsetFromCenter) / (FLOATING_STRIDE * 1.8), 1);
    const eased = normalizedDistance * normalizedDistance;
    const scale = 1.02 - 0.18 * eased;
    const blur = 3.2 * eased;
    const opacity = 1 - 0.62 * eased;
    const focused = normalizedDistance < 0.12;

    return (
        <button
            type="button"
            onClick={onClick}
            className="absolute left-0 right-0 mx-auto will-change-transform text-left"
            style={{
                height: `${FLOATING_CARD_HEIGHT}px`,
                top: `calc(50% + ${offsetFromCenter}px - ${FLOATING_CARD_HEIGHT / 2}px)`,
                transform: `translate3d(0,0,0) scale(${scale.toFixed(4)})`,
                filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none',
                opacity,
                zIndex: focused ? 20 : 10 - Math.min(Math.abs(Math.round(offsetFromCenter / FLOATING_STRIDE)), 8),
                transition: 'transform 180ms ease, opacity 180ms ease, filter 180ms ease',
            }}
            aria-label={item.name}
        >
            <div
                className="relative h-full overflow-hidden rounded-[18px]"
                style={{
                    background: focused
                        ? `linear-gradient(135deg, ${isRecommended ? 'rgba(34,211,238,0.24)' : 'rgba(255,255,255,0.10)'} 0%, rgba(10,14,24,0.88) 100%)`
                        : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(10,14,24,0.54))',
                    boxShadow: focused
                        ? `0 0 24px ${isRecommended ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.08)'}, 0 14px 28px rgba(0,0,0,0.28)`
                        : '0 10px 20px rgba(0,0,0,0.14)',
                    backdropFilter: 'blur(16px) saturate(1.2)',
                    WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
                }}
            >
                {focused ? (
                    <div
                        className="absolute inset-x-5 top-0 h-px"
                        style={{ background: `linear-gradient(90deg, transparent, ${isRecommended ? 'rgba(34,211,238,0.65)' : 'rgba(255,255,255,0.35)'}, transparent)` }}
                    />
                ) : null}

                <div className="flex h-full items-center gap-3 px-3.5">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[12px]" style={{ boxShadow: focused && isRecommended ? '0 0 14px rgba(34,211,238,0.24)' : 'none' }}>
                        {item?.image_url ? (
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : item?.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-black/20 text-xs text-white/60">{item?.rating ? item.rating : '?'}</div>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-[13px] font-semibold leading-tight text-white">{item.name}</div>
                            <div
                                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                style={{
                                    color: isRecommended ? 'rgba(103,232,249,0.92)' : 'rgba(255,255,255,0.58)',
                                    background: isRecommended ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.06)',
                                }}
                            >
                                {item?.distance != null ? (typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km` : item.distance) : 'teraz'}
                            </div>
                        </div>

                        <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.18em] text-white/36">
                            {item?.cuisine_type || 'Restauracja'}
                        </div>
                        <div className="mt-1 truncate text-[11px] text-white/62">{secondary}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/55">
                            <span className="font-semibold text-amber-300">{item?.rating || '4.5'}</span>
                            <span className="text-white/18">|</span>
                            <span>{item?.city || item?.address || 'w poblizu'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </button>
    );
}

function FloatingRestaurantListCard({
    item,
    onClick,
    isRecommended,
    isActive,
}: {
    item: any;
    onClick: () => void;
    isRecommended: boolean;
    isActive: boolean;
}) {
    const secondary = getRestaurantSecondary(item) || getMetaLine(item, 'restaurant');

    return (
        <button type="button" onClick={onClick} className="w-full text-left">
            <div
                className="relative overflow-hidden rounded-[22px] px-4 py-3.5"
                style={{
                    background: isActive
                        ? `linear-gradient(135deg, ${isRecommended ? 'rgba(34,211,238,0.24)' : 'rgba(255,255,255,0.12)'} 0%, rgba(10,14,24,0.88) 100%)`
                        : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(10,14,24,0.68))',
                    boxShadow: isActive
                        ? `0 0 24px ${isRecommended ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.08)'}, 0 14px 28px rgba(0,0,0,0.28)`
                        : '0 10px 20px rgba(0,0,0,0.14)',
                    backdropFilter: 'blur(16px) saturate(1.18)',
                    WebkitBackdropFilter: 'blur(16px) saturate(1.18)',
                }}
            >
                {isActive ? (
                    <div
                        className="absolute inset-x-5 top-0 h-px"
                        style={{ background: `linear-gradient(90deg, transparent, ${isRecommended ? 'rgba(34,211,238,0.65)' : 'rgba(255,255,255,0.35)'}, transparent)` }}
                    />
                ) : null}

                <div className="flex items-start gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[14px] bg-black/20">
                        {item?.image_url ? (
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : item?.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-white/58">{item?.rating ? item.rating : '?'}</div>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="truncate text-[15px] font-semibold text-white">{item.name}</div>
                                <div className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-white/38">
                                    {item?.cuisine_type || 'Restauracja'}
                                </div>
                            </div>
                            <div
                                className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                                style={{
                                    color: isRecommended ? 'rgba(103,232,249,0.92)' : 'rgba(255,255,255,0.58)',
                                    background: isRecommended ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.06)',
                                }}
                            >
                                {item?.distance != null ? (typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km` : item.distance) : 'teraz'}
                            </div>
                        </div>

                        <div className="mt-2 text-[13px] text-white/68">{secondary}</div>
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/52">
                            <span className="font-semibold text-amber-300">{item?.rating || '4.5'}</span>
                            <span className="text-white/18">|</span>
                            <span>{item?.city || item?.address || 'w poblizu'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </button>
    );
}

function FloatingRestaurantFocusIsland({
    items,
    activeId,
    setActiveId,
    onSelect,
    recommendedId,
    expanded,
    onExpand,
    onCollapse,
}: {
    items: any[];
    activeId: string | null;
    setActiveId: (id: string | null) => void;
    onSelect: (item: any) => void;
    recommendedId?: string | null;
    expanded: boolean;
    onExpand: () => void;
    onCollapse: () => void;
}) {
    const frameRef = useRef<number>(0);
    const positionRef = useRef(0);
    const velocityRef = useRef(0);
    const draggingRef = useRef(false);
    const lastPointerYRef = useRef(0);
    const dragStartYRef = useRef(0);
    const dragStartTimeRef = useRef(0);
    const accumulatedDeltaRef = useRef(0);
    const targetIndexRef = useRef(0);
    const listRef = useRef<HTMLDivElement>(null);
    const [scrollY, setScrollY] = useState(0);

    const maxScroll = Math.max(0, (items.length - 1) * FLOATING_STRIDE);
    const focusedIndex = clamp(Math.round(scrollY / FLOATING_STRIDE), 0, Math.max(items.length - 1, 0));
    const focusedItem = items[focusedIndex];
    const viewportHeight = expanded ? 364 : 152;

    useEffect(() => {
        const idx = items.findIndex((item) => item._uiId === activeId);
        const safeIndex = idx >= 0 ? idx : 0;
        targetIndexRef.current = safeIndex;
        positionRef.current = safeIndex * FLOATING_STRIDE;
        setScrollY(positionRef.current);
    }, [activeId, items]);

    useEffect(() => () => {
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
        }
    }, []);

    const startAnimation = useCallback(() => {
        if (frameRef.current) return;

        const tick = () => {
            if (!draggingRef.current) {
                const target = targetIndexRef.current * FLOATING_STRIDE;
                const distance = target - positionRef.current;
                velocityRef.current += distance * FLOATING_SPRING_STIFFNESS;
                velocityRef.current *= FLOATING_SPRING_DAMPING;
                positionRef.current += velocityRef.current;

                if (Math.abs(distance) < 0.35 && Math.abs(velocityRef.current) < 0.04) {
                    positionRef.current = target;
                    velocityRef.current = 0;
                    setScrollY(positionRef.current);
                    frameRef.current = 0;
                    return;
                }
            }

            setScrollY(positionRef.current);
            frameRef.current = requestAnimationFrame(tick);
        };

        frameRef.current = requestAnimationFrame(tick);
    }, []);

    const goToIndex = useCallback((index: number) => {
        const clampedIndex = clamp(index, 0, Math.max(items.length - 1, 0));
        targetIndexRef.current = clampedIndex;
        setActiveId(items[clampedIndex]?._uiId || null);
        startAnimation();
    }, [items, setActiveId, startAnimation]);

    const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        const direction = event.deltaY > 0 ? 1 : -1;
        goToIndex(focusedIndex + direction);
    }, [focusedIndex, goToIndex]);

    const handlePointerDown = useCallback((clientY: number) => {
        draggingRef.current = true;
        lastPointerYRef.current = clientY;
        dragStartYRef.current = clientY;
        dragStartTimeRef.current = performance.now();
        accumulatedDeltaRef.current = 0;
        velocityRef.current = 0;
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = 0;
        }
    }, []);

    const handlePointerMove = useCallback((clientY: number) => {
        if (!draggingRef.current) return;
        const delta = lastPointerYRef.current - clientY;
        lastPointerYRef.current = clientY;
        accumulatedDeltaRef.current += delta;
        positionRef.current = clamp(positionRef.current + delta, 0, maxScroll);
        setScrollY(positionRef.current);
    }, [expanded, maxScroll]);

    const handlePointerUp = useCallback(() => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        const elapsed = Math.max(performance.now() - dragStartTimeRef.current, 16);
        const totalTravel = dragStartYRef.current - lastPointerYRef.current;
        const gestureTravel = Math.abs(accumulatedDeltaRef.current) > Math.abs(totalTravel)
            ? accumulatedDeltaRef.current
            : totalTravel;
        const velocity = gestureTravel / elapsed;
        const isFlick =
            Math.abs(gestureTravel) >= FLOATING_EXPAND_DISTANCE_THRESHOLD &&
            Math.abs(velocity) >= FLOATING_EXPAND_VELOCITY_THRESHOLD;

        if (isFlick) {
            if (gestureTravel > 0) {
                onExpand();
            } else {
                onCollapse();
            }
        }

        const nextIndex = clamp(Math.round(positionRef.current / FLOATING_STRIDE), 0, Math.max(items.length - 1, 0));
        targetIndexRef.current = nextIndex;
        setActiveId(items[nextIndex]?._uiId || null);
        startAnimation();
    }, [items, onCollapse, onExpand, setActiveId, startAnimation]);

    useEffect(() => {
        const moveHandler = (event: PointerEvent) => handlePointerMove(event.clientY);
        const upHandler = () => handlePointerUp();
        window.addEventListener('pointermove', moveHandler);
        window.addEventListener('pointerup', upHandler);
        return () => {
            window.removeEventListener('pointermove', moveHandler);
            window.removeEventListener('pointerup', upHandler);
        };
    }, [handlePointerMove, handlePointerUp]);

    return (
        <div className="relative w-[min(70vw,16rem)] md:w-[16.5rem]">
            <div className="mb-2 px-2">
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/85">W poblizu</div>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="text-[14px] font-semibold tracking-tight text-white">Polecane miejsca</div>
                    <div className="text-[10px] text-white/46">{expanded ? 'Lista' : `${items.length} opcji`}</div>
                </div>
            </div>

            {expanded ? (
                <div
                    ref={listRef}
                    className="tiny-scroll relative space-y-2.5 overflow-y-auto pr-1"
                    onWheel={(event) => {
                        const node = listRef.current;
                        if (!node) return;
                        const atTop = node.scrollTop <= 2;
                        if (event.deltaY < -24 && atTop) {
                            event.preventDefault();
                            onCollapse();
                        }
                    }}
                    style={{
                        height: `${viewportHeight}px`,
                        touchAction: 'pan-y',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 6%, rgba(0,0,0,1) 94%, rgba(0,0,0,0) 100%)',
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 6%, rgba(0,0,0,1) 94%, rgba(0,0,0,0) 100%)',
                    }}
                >
                    {items.map((item, index) => (
                        <div key={item._uiId} data-id={item._uiId}>
                            <FloatingRestaurantListCard
                                item={item}
                                isRecommended={item._uiId === recommendedId}
                                isActive={index === focusedIndex}
                                onClick={() => {
                                    goToIndex(index);
                                    onSelect(item);
                                }}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    className="relative cursor-grab overflow-hidden active:cursor-grabbing"
                    onWheel={handleWheel}
                    onPointerDown={(event) => handlePointerDown(event.clientY)}
                    style={{
                        height: `${viewportHeight}px`,
                        touchAction: 'none',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)',
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)',
                    }}
                >
                    <div
                        className="absolute inset-0 transition-colors duration-500"
                        style={{
                            background: focusedItem ? `radial-gradient(circle at 50% 48%, ${recommendedId === focusedItem._uiId ? 'rgba(34,211,238,0.16)' : 'rgba(255,255,255,0.05)'} 0%, transparent 64%)` : 'none',
                        }}
                    />

                    {items.map((item, index) => {
                        const offsetFromCenter = index * FLOATING_STRIDE - scrollY;
                        if (Math.abs(offsetFromCenter) > FLOATING_STRIDE * 4.8) return null;

                        return (
                            <FloatingRestaurantFocusCard
                                key={item._uiId}
                                item={item}
                                offsetFromCenter={offsetFromCenter}
                                isRecommended={item._uiId === recommendedId}
                                onClick={() => {
                                    goToIndex(index);
                                    onSelect(item);
                                }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
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
            className={`relative flex w-full flex-col rounded-[24px] border px-4 py-4 text-left backdrop-blur-xl transition ${
                isRecommended
                    ? 'border-amber-300/60 bg-[linear-gradient(180deg,rgba(255,184,77,0.12),rgba(20,23,31,0.82))]'
                    : 'border-white/8 bg-[linear-gradient(180deg,rgba(18,24,36,0.78),rgba(7,10,16,0.82))]'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55">
                            {getCuisine(item)}
                        </span>
                    </div>
                    <h4 className="mt-3 text-lg font-semibold leading-tight text-white">{item.name}</h4>
                    <p className="mt-2 line-clamp-3 text-sm leading-5 text-white/68">{metaLine}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    {price ? <div className="text-lg font-semibold text-amber-200">{price}</div> : null}
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/55">Wybierz</span>
                </div>
            </div>
        </button>
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
    const [expanded, setExpanded] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (expanded && highlightedId && scrollContainerRef.current && type === 'menu') {
            const activeElement = scrollContainerRef.current.querySelector(`[data-id="${highlightedId}"]`);
            if (activeElement) {
                (activeElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [highlightedId, expanded, type]);

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
            <IslandWrapper
                expanded={expanded}
                setExpanded={setExpanded}
                onClose={onClose}
                position={position}
                sizeVariant="restaurant-stack"
                className="z-40"
            >
                <FloatingRestaurantFocusIsland
                    items={normalizedItems}
                    activeId={highlightedId}
                    setActiveId={setHighlightedId}
                    onSelect={onSelect}
                    recommendedId={recommendedId}
                    expanded={expanded}
                    onExpand={() => setExpanded(true)}
                    onCollapse={() => setExpanded(false)}
                />
            </IslandWrapper>
        );
    }

    return (
        <IslandWrapper
            expanded={expanded}
            setExpanded={setExpanded}
            onClose={onClose}
            position={position}
            sizeVariant="default"
            className="z-[60]"
        >
            <div className="relative flex h-full flex-col overflow-visible text-white">
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
                                setExpanded((v) => !v);
                            }}
                            className="rounded-full bg-white/6 px-3 py-1.5 text-[11px] font-medium text-white/72 transition hover:bg-white/10 hover:text-white"
                        >
                            {expanded ? 'Zwin' : 'Rozwin'}
                        </button>
                    </div>
                </div>

                {!expanded ? (
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
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px]">Kolem zmieniasz focus</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExpanded(true);
                                    }}
                                    className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[11px] text-cyan-50 transition hover:bg-cyan-300/16"
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
                            <div ref={scrollContainerRef} className="tiny-scroll mt-3 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
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
                                            <div className="relative overflow-hidden rounded-[22px] px-4 py-3.5" style={{ background: isActive ? (item._uiId === recommendedId ? 'linear-gradient(135deg, rgba(34,211,238,0.16) 0%, rgba(10,14,24,0.88) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(10,14,24,0.86) 100%)') : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(10,14,24,0.68))', boxShadow: isActive ? '0 14px 28px rgba(0,0,0,0.22)' : '0 10px 20px rgba(0,0,0,0.14)', backdropFilter: 'blur(16px) saturate(1.15)', WebkitBackdropFilter: 'blur(16px) saturate(1.15)' }}><div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-semibold text-white">{item.name}</div>
                                                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">{getCuisine(item)}</div>
                                                    <div className="mt-2 text-sm text-white/65">{getMetaLine(item, type)}</div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {price ? <div className="text-sm font-semibold text-amber-200">{price}</div> : <div className="text-xs text-white/45">{item.rating ? `Ocena ${item.rating}` : ''}</div>}
                                                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/55">Wybierz</span>
                                                </div>
                                            </div></div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </IslandWrapper>
    );
}






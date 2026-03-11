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

    return parts.filter(Boolean).join(' / ');
}

function RestaurantDepthCard({
    item,
    isRecommended,
    onClick,
}: {
    item: any;
    isRecommended: boolean;
    onClick: () => void;
}) {
    const price = formatPrice(item);
    const secondary = getRestaurantSecondary(item) || getMetaLine(item, 'restaurant');

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full rounded-[24px] bg-[linear-gradient(180deg,rgba(18,28,42,0.94),rgba(6,10,18,0.94))] px-4 py-4 text-left shadow-[0_0_30px_rgba(34,211,238,0.12),0_18px_42px_rgba(0,0,0,0.42)] backdrop-blur-xl"
        >
            <div className="flex items-start gap-3">
                <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        isRecommended
                            ? 'bg-[radial-gradient(circle_at_top_left,rgba(253,230,138,0.88),rgba(15,23,42,0.92))] shadow-[0_0_20px_rgba(252,211,77,0.45)]'
                            : 'bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.5),rgba(15,23,42,0.92))]'
                    }`}
                >
                    <span className="text-xs font-semibold text-white/90">{item?.rating ? item.rating : '?'}</span>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="truncate text-[15px] font-semibold tracking-[0.01em] text-white">{item.name}</div>
                            <div className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-cyan-100/40">
                                {item?.cuisine_type || 'Restauracja'}
                            </div>
                            <div className="mt-2 line-clamp-2 text-sm leading-5 text-white/62">{secondary}</div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2 text-[11px] text-white/48">
                            {price ? (
                                <span className="rounded-full bg-white/7 px-2.5 py-1 text-[11px] font-medium text-amber-100/88">{price}</span>
                            ) : item?.distance ? (
                                <span className="rounded-full bg-white/6 px-2.5 py-1 text-[10px] text-white/60">
                                    {typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km` : item.distance}
                                </span>
                            ) : null}
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-300/14 text-xs text-cyan-100 transition">{'>'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </button>
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

    const hiddenCount = type === 'restaurant' ? Math.max(0, normalizedItems.length - 3) : 0;

    const goTo = useCallback((targetIndex: number) => {
        const clamped = Math.max(0, Math.min(normalizedItems.length - 1, targetIndex));
        setHighlightedId(normalizedItems[clamped]?._uiId || null);
    }, [normalizedItems, setHighlightedId]);

    const stackItems = useMemo<FocusStackItem[]>(() => {
        return normalizedItems.map((item) => ({
            id: item._uiId,
            render: () =>
                type === 'restaurant' ? (
                    <RestaurantDepthCard
                        item={item}
                        isRecommended={item._uiId === recommendedId}
                        onClick={() => {
                            setHighlightedId(item._uiId);
                            onSelect(item);
                        }}
                    />
                ) : (
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
    }, [normalizedItems, onSelect, recommendedId, setHighlightedId, type]);

    return (
        <IslandWrapper
            expanded={expanded}
            setExpanded={setExpanded}
            onClose={onClose}
            position={position}
            sizeVariant="restaurant-stack"
            className={type === 'menu' ? 'z-[60]' : 'z-40'}
        >
            <div className="relative flex h-full flex-col text-white">
                <div className="border-b border-white/8 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-[0.24em] text-white/38">
                                {type === 'restaurant' ? 'Restauracje w zasiegu' : 'FreeFlow'}
                            </div>
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
                            {expanded ? 'Zwin' : type === 'restaurant' ? 'Pokaz wszystkie' : 'Rozwin'}
                        </button>
                    </div>
                </div>

                {!expanded ? (
                    <div className="flex flex-1 flex-col px-3 pb-3 pt-3">
                        <div className="relative mx-auto h-[21rem] w-full overflow-visible">
                            <FocusStack
                                side={position}
                                items={stackItems}
                                activeIndex={currentIndex}
                                setActiveIndex={goTo}
                                focusTop={type === 'restaurant' ? '34%' : '40%'}
                            />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 px-1 text-xs text-white/48">
                            <div className="min-w-0">{type === 'restaurant' && hiddenCount > 0 ? `+${hiddenCount} wiecej` : 'Pelna lista w zasiegu'}</div>
                            <div className="flex items-center gap-2">
                                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Kolem zmieniasz focus</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExpanded(true);
                                    }}
                                    className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-cyan-50 transition hover:bg-cyan-300/16"
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
                                                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/55">Wybierz</span>
                                                </div>
                                            </div>
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


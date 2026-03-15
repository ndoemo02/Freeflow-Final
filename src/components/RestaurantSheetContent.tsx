import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SheetHandle from './sheet/SheetHandle';
import SheetScrollable from './sheet/SheetScrollable';
import { SheetSnap } from './sheet/sheetTypes';

const FLOATING_CARD_HEIGHT = 72;
const FLOATING_CARD_GAP = 10;
const FLOATING_STRIDE = FLOATING_CARD_HEIGHT + FLOATING_CARD_GAP;

function getMetaLine(item: any) {
    return item?.city || item?.address || item?.delivery_time || 'Dostepna teraz';
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
    const secondary = getRestaurantSecondary(item) || getMetaLine(item);
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
    const secondary = getRestaurantSecondary(item) || getMetaLine(item);

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

interface RestaurantSheetContentProps {
    items: any[];
    highlightedId: string | null;
    setHighlightedId: (id: string | null) => void;
    recommendedId?: string | null;
    onSelect: (item: any) => void;
    snap: SheetSnap;
    setSnap: (next: SheetSnap) => void;
}

export default function RestaurantSheetContent({
    items,
    highlightedId,
    setHighlightedId,
    recommendedId,
    onSelect,
    snap,
    setSnap,
}: RestaurantSheetContentProps) {
    const activeIndex = useMemo(() => {
        const found = items.findIndex((item) => item._uiId === highlightedId);
        return found >= 0 ? found : 0;
    }, [highlightedId, items]);

    const viewportHeight = snap === 'expanded' ? 364 : 152;

    return (
        <div className="relative w-full text-white">
            <SheetHandle />
            <div className="mb-2 px-2">
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/85">W poblizu</div>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="text-[14px] font-semibold tracking-tight text-white">Polecane miejsca</div>
                    <div className="flex items-center gap-2">
                        <div className="text-[10px] text-white/46">{snap === 'expanded' ? 'Lista' : `${items.length} opcji`}</div>
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
            </div>

            {snap === 'expanded' ? (
                <SheetScrollable
                    className="tiny-scroll relative space-y-2.5 pr-1"
                >
                    <div
                        style={{
                            height: `${viewportHeight}px`,
                            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 6%, rgba(0,0,0,1) 94%, rgba(0,0,0,0) 100%)',
                            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 6%, rgba(0,0,0,1) 94%, rgba(0,0,0,0) 100%)',
                        }}
                    >
                        {items.map((item, index) => (
                            <div key={item._uiId} data-id={item._uiId} className="pb-2.5 last:pb-0">
                                <FloatingRestaurantListCard
                                    item={item}
                                    isRecommended={item._uiId === recommendedId}
                                    isActive={index === activeIndex}
                                    onClick={() => {
                                        setHighlightedId(item._uiId);
                                        onSelect(item);
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </SheetScrollable>
            ) : (
                <div
                    className="relative overflow-hidden"
                    style={{
                        height: `${viewportHeight}px`,
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)',
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)',
                    }}
                >
                    <div
                        className="absolute inset-0 transition-colors duration-500"
                        style={{
                            background: items[activeIndex]
                                ? `radial-gradient(circle at 50% 48%, ${recommendedId === items[activeIndex]._uiId ? 'rgba(34,211,238,0.16)' : 'rgba(255,255,255,0.05)'} 0%, transparent 64%)`
                                : 'none',
                        }}
                    />

                    {items.map((item, index) => {
                        const offsetFromCenter = (index - activeIndex) * FLOATING_STRIDE;
                        if (Math.abs(offsetFromCenter) > FLOATING_STRIDE * 4.8) return null;

                        return (
                            <FloatingRestaurantFocusCard
                                key={item._uiId}
                                item={item}
                                offsetFromCenter={offsetFromCenter}
                                isRecommended={item._uiId === recommendedId}
                                onClick={() => {
                                    setHighlightedId(item._uiId);
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

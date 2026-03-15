import React, { useCallback, useMemo } from 'react';
import SheetHandle from './sheet/SheetHandle';
import SheetScrollable from './sheet/SheetScrollable';
import { SheetSnap } from './sheet/sheetTypes';

const HERO_HEIGHT = 256;
const PEEK_TOP_OFFSET = HERO_HEIGHT + 16;
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
    const scale = 1.03 - 0.19 * eased;
    const blur = 3.2 * eased;
    const opacity = 1 - 0.62 * eased;
    const focused = normalizedDistance < 0.12;
    const focusAccent = 'rgba(34,211,238,0.92)';

    return (
        <button
            type="button"
            onClick={onClick}
            className="absolute left-0 right-0 mx-auto will-change-transform text-left"
            style={{
                height: `${FLOATING_CARD_HEIGHT}px`,
                top: `${offsetFromCenter}px`,
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
                        ? 'linear-gradient(135deg, rgba(34,211,238,0.18) 0%, rgba(8,16,28,0.94) 100%)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(10,14,24,0.54))',
                    boxShadow: focused
                        ? '0 0 0 1px rgba(34,211,238,0.7) inset, 0 0 28px rgba(34,211,238,0.26), 0 16px 30px rgba(0,0,0,0.34)'
                        : '0 10px 20px rgba(0,0,0,0.14)',
                    border: focused ? '1px solid rgba(34,211,238,0.5)' : '1px solid transparent',
                    backdropFilter: 'blur(16px) saturate(1.2)',
                    WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
                }}
            >
                {focused ? (
                    <>
                        <div className="absolute inset-x-5 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${focusAccent}, transparent)` }} />
                        <div className="absolute right-3 top-3 rounded-full bg-cyan-400/18 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.2)]">
                            Fokus
                        </div>
                    </>
                ) : null}

                <div className="flex h-full items-center gap-3 px-3.5">
                    <div
                        className="h-11 w-11 shrink-0 overflow-hidden rounded-[12px]"
                        style={{ boxShadow: focused ? '0 0 0 1px rgba(34,211,238,0.35) inset, 0 0 16px rgba(34,211,238,0.14)' : 'none' }}
                    >
                        {item?.image_url ? (
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : item?.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                            <div className={`flex h-full w-full items-center justify-center text-xs ${focused ? 'bg-cyan-400/14 text-cyan-100' : 'bg-black/20 text-white/60'}`}>
                                {item?.rating ? item.rating : '?'}
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <div className={`truncate text-[13px] font-semibold leading-tight ${focused ? 'text-cyan-50' : 'text-white'}`}>{item.name}</div>
                            <div
                                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                style={{
                                    color: focused ? 'rgba(224,255,255,0.96)' : isRecommended ? 'rgba(103,232,249,0.92)' : 'rgba(255,255,255,0.58)',
                                    background: focused ? 'rgba(34,211,238,0.18)' : isRecommended ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.06)',
                                }}
                            >
                                {item?.distance != null ? (typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km` : item.distance) : 'teraz'}
                            </div>
                        </div>

                        <div className={`mt-0.5 truncate text-[10px] uppercase tracking-[0.18em] ${focused ? 'text-cyan-200/78' : 'text-white/36'}`}>
                            {item?.cuisine_type || 'Restauracja'}
                        </div>
                        <div className={`mt-1 truncate text-[11px] ${focused ? 'text-cyan-50/92' : 'text-white/62'}`}>{secondary}</div>
                        <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${focused ? 'text-cyan-100/82' : 'text-white/55'}`}>
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
                    <div className="absolute inset-x-5 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${isRecommended ? 'rgba(34,211,238,0.65)' : 'rgba(255,255,255,0.35)'}, transparent)` }} />
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
                                <div className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-white/38">{item?.cuisine_type || 'Restauracja'}</div>
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

    const teaserItems = useMemo(() => items.slice(activeIndex), [activeIndex, items]);

    const selectIndex = useCallback((nextIndex: number) => {
        const safeIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
        const nextItem = items[safeIndex];
        if (!nextItem) return;
        setHighlightedId(nextItem._uiId);
    }, [items, setHighlightedId]);

    const handlePeekWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        if (Math.abs(event.deltaY) < 6) {
            return;
        }

        event.preventDefault();
        const direction = event.deltaY > 0 ? 1 : -1;
        selectIndex(activeIndex + direction);
    }, [activeIndex, selectIndex]);

    const viewportPaddingTop = snap === 'peek' ? PEEK_TOP_OFFSET : 24;

    return (
        <div className="relative flex h-full min-h-0 flex-col text-white">
            <SheetHandle className="relative z-20" mode={snap === 'peek' ? 'overlay' : 'bar'} />

            <div className="relative z-10 flex min-h-0 flex-1 flex-col px-3 pb-4" style={{ paddingTop: `${viewportPaddingTop}px` }}>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
                            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/85">W poblizu</div>
                        </div>
                        <div className="mt-1.5 text-[14px] font-semibold tracking-tight text-white">Polecane miejsca</div>
                    </div>
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

                {snap === 'expanded' ? (
                    <SheetScrollable className="tiny-scroll min-h-0 flex-1 space-y-2.5 pr-1">
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
                    </SheetScrollable>
                ) : (
                    <div
                        className="relative min-h-0 flex-1 overflow-hidden"
                        onWheel={handlePeekWheel}
                        style={{
                            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, rgba(0,0,0,1) 80px, rgba(0,0,0,1) 100%)',
                            maskImage: 'linear-gradient(to bottom, transparent 0px, rgba(0,0,0,1) 80px, rgba(0,0,0,1) 100%)',
                        }}
                    >
                        {teaserItems.map((item, index) => {
                            const offsetFromCenter = index * FLOATING_STRIDE;
                            if (offsetFromCenter > FLOATING_STRIDE * 2.2) return null;

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
        </div>
    );
}

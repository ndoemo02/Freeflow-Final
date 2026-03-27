import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import SheetScrollable from './sheet/SheetScrollable';
import { useBottomSheetContext } from './sheet/BottomSheetContainer';
import { getSheetViewportSnapPositions } from './sheet/sheetPhysics';
import { SheetSnap } from './sheet/sheetTypes';

const CARD_HEIGHT = 96;

function getDepthStyle(offset: number) {
    const abs = Math.abs(offset);

    if (abs === 0) {
        return { scale: 1.02, opacity: 1, y: 0, z: 80 };
    }

    if (abs === 1) {
        return { scale: 0.96, opacity: 0.45, y: offset * 68, z: 70 };
    }

    return { scale: 0.92, opacity: 0.18, y: offset * 128, z: 60 };
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

    return Math.max(12, desiredCenter - sheetTop - stackHeight / 2);
}

function formatDistance(item: any) {
    if (item?.distance == null) {
        return 'teraz';
    }

    return typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km` : item.distance;
}

function getMetaLine(item: any) {
    const parts = [item?.city || item?.address, item?.delivery_time, item?.cuisine_type];
    return parts.filter(Boolean).join(' / ') || 'Dostepna teraz';
}

function FloatingRestaurantFocusCard({
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

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full origin-center text-left"
            style={{
                gridArea: '1 / 1',
                alignSelf: 'center',
                height: `${CARD_HEIGHT}px`,
                transform: `translate3d(0, ${depthStyle.y}px, 0) scale(${depthStyle.scale})`,
                opacity: depthStyle.opacity,
                filter: isFocused ? 'none' : 'blur(0.6px)',
                zIndex: depthStyle.z,
                transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease, filter 220ms ease',
                willChange: 'transform',
            }}
            aria-label={item?.name || 'Restauracja'}
        >
            <div
                className="relative h-full overflow-hidden rounded-[20px] px-3.5 py-2.5"
                style={{
                    background: isFocused
                        ? 'linear-gradient(140deg, rgba(34,211,238,0.26) 0%, rgba(6,10,18,0.98) 100%)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(8,13,24,0.82))',
                    border: isFocused ? '1px solid rgba(34,211,238,0.62)' : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: isFocused
                        ? '0 0 0 1px rgba(34,211,238,0.34) inset, 0 10px 24px rgba(0,0,0,0.34)'
                        : '0 8px 14px rgba(0,0,0,0.2)',
                    backdropFilter: 'blur(10px) saturate(1.06)',
                    WebkitBackdropFilter: 'blur(10px) saturate(1.06)',
                }}
            >
                {isFocused ? (
                    <>
                        <div className="absolute inset-x-5 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.9), transparent)' }} />
                    </>
                ) : null}

                <div className="flex h-full items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[12px] bg-black/30">
                        {item?.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : null}
                        {!item?.image_url && item?.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : null}
                        {!item?.image_url && !item?.image ? (
                            <div className="flex h-full w-full items-center justify-center text-xs text-white/62">{item?.rating || '?'}</div>
                        ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <div className={`truncate text-[14px] font-semibold ${isFocused ? 'text-white' : 'text-white/84'}`}>{item?.name || 'Restauracja'}</div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isFocused ? 'bg-cyan-400/20 text-cyan-100' : 'bg-white/8 text-white/62'}`}>
                                {formatDistance(item)}
                            </span>
                        </div>

                        {isFocused ? (
                            <>
                                <div className="mt-1 truncate text-[11px] uppercase tracking-[0.16em] text-cyan-200/80">
                                    {item?.cuisine_type || 'Restauracja'}
                                </div>
                                <div className="mt-1 truncate text-[12px] text-white/96">{getMetaLine(item)}</div>
                                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/88">
                                    <span className="font-semibold text-amber-300">{item?.rating || '4.5'}</span>
                                    <span className="text-white/20">|</span>
                                    <span>{isRecommended ? 'Polecane' : 'W poblizu'}</span>
                                </div>
                            </>
                        ) : (
                            <div className="mt-1 truncate text-[11px] uppercase tracking-[0.12em] text-white/38">
                                {item?.cuisine_type || 'Restauracja'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}

function FloatingRestaurantListCard({
    item,
    isRecommended,
    isActive,
    onClick,
}: {
    item: any;
    isRecommended: boolean;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <button type="button" onClick={onClick} className="w-full text-left">
            <div
                className="relative overflow-hidden rounded-[20px] px-3 py-1.5"
                style={{
                    minHeight: '88px',
                    background: isActive
                        ? 'linear-gradient(140deg, rgba(34,211,238,0.22) 0%, rgba(8,12,20,0.95) 100%)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(8,13,24,0.72))',
                    border: isActive ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: isActive
                        ? '0 0 0 1px rgba(34,211,238,0.28) inset, 0 10px 20px rgba(0,0,0,0.26)'
                        : '0 8px 14px rgba(0,0,0,0.16)',
                    backdropFilter: 'blur(12px) saturate(1.08)',
                    WebkitBackdropFilter: 'blur(12px) saturate(1.08)',
                }}
            >
                {isActive ? (
                    <div className="absolute inset-x-5 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.88), transparent)' }} />
                ) : null}

                <div className="flex items-start gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[12px] bg-black/20">
                        {item?.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : null}
                        {!item?.image_url && item?.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : null}
                        {!item?.image_url && !item?.image ? (
                            <div className="flex h-full w-full items-center justify-center text-sm text-white/62">{item?.rating || '?'}</div>
                        ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="truncate text-[14px] font-semibold text-white">{item?.name || 'Restauracja'}</div>
                                <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.15em] text-white/42">{item?.cuisine_type || 'Restauracja'}</div>
                            </div>
                            <div className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isRecommended ? 'bg-cyan-400/14 text-cyan-100' : 'bg-white/8 text-white/60'}`}>
                                {formatDistance(item)}
                            </div>
                        </div>

                        <div className="mt-1 text-[12px] text-white/72">{getMetaLine(item)}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/56">
                            <span className="font-semibold text-amber-300">{item?.rating || '4.5'}</span>
                            <span className="text-white/20">|</span>
                            <span>{isRecommended ? 'Polecane' : 'W poblizu'}</span>
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
    const { boundary } = useBottomSheetContext();
    const swipeStartYRef = useRef<number | null>(null);
    const swipeStartAtRef = useRef(0);
    const lastWheelAtRef = useRef(0);
    const pointerStartYRef = useRef<number | null>(null);
    const pointerStartAtRef = useRef(0);
    const activeIndex = useMemo(() => {
        const found = items.findIndex((item) => item._uiId === highlightedId);
        return found >= 0 ? found : 0;
    }, [highlightedId, items]);

    const isExpanded = snap === 'expanded';
    const isTeaser = snap === 'closed';
    const stackOffsets = isTeaser ? [-1, 0, 1] : [-2, -1, 0, 1, 2];

    const stackItems = useMemo(
        () => stackOffsets
            .map((offset) => ({ offset, item: items[activeIndex + offset] }))
            .filter((entry) => Boolean(entry.item)),
        [activeIndex, items, stackOffsets],
    );

    const selectIndex = useCallback((targetIndex: number) => {
        const safeIndex = Math.max(0, Math.min(items.length - 1, targetIndex));
        const nextItem = items[safeIndex];
        if (!nextItem) return;
        setHighlightedId(nextItem._uiId);
    }, [items, setHighlightedId]);

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
        if (now - lastWheelAtRef.current < 90) return;
        event.stopPropagation();
        lastWheelAtRef.current = now;
        const direction = event.deltaY > 0 ? 1 : -1;
        const steps = Math.min(3, Math.max(1, Math.round(Math.abs(event.deltaY) / 120)));
        selectIndex(activeIndex + direction * steps);
    }, [activeIndex, isExpanded, selectIndex]);

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
                selectIndex(activeIndex + (deltaY < 0 ? 1 : -1));
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
    }, [activeIndex, boundary.atTop, selectIndex, setSnap, snap]);

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

    const stackHeight = isTeaser ? 170 : 220;
    const stackAnchorTop = useMemo(() => resolveStackAnchorTop(snap, stackHeight), [snap, stackHeight]);
    const stackSafeBottom = 'calc(env(safe-area-inset-bottom) + 84px)';
    const expandedSafeBottom = 'calc(env(safe-area-inset-bottom) + 80px)';
    const ctaLabel = snap === 'closed' ? 'Wyspa' : snap === 'peek' ? 'Pelna lista' : 'Wyspa';

    return (
        <div
            className="relative flex h-full min-h-0 flex-col overflow-visible text-white"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
        >
            {isExpanded ? (
                <div className="relative z-10 flex min-h-0 flex-1 flex-col px-3 pt-3">
                    <div className="mb-1.5 pl-0.5 flex items-start justify-between gap-3">
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/78">W poblizu</div>
                            <div className="mt-1 text-[14px] font-semibold text-white">Polecane miejsca</div>
                        </div>
                        <button
                            type="button"
                            onClick={handleCtaPress}
                            className="rounded-full bg-black/35 px-3 py-1.5 text-[11px] font-medium text-white/78 backdrop-blur-md transition hover:bg-black/45 hover:text-white"
                        >
                            {ctaLabel}
                        </button>
                    </div>

                    <SheetScrollable
                        className="list-scroll tiny-scroll min-h-0 flex-1 space-y-0.5 pr-1"
                        style={{ paddingBottom: expandedSafeBottom }}
                        onTouchStart={handleSwipeStart}
                        onTouchEnd={handleSwipeEnd}
                    >
                        {items.map((item, index) => (
                            <div key={item._uiId} className="pb-0.5 last:pb-0">
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
                </div>
            ) : (
                <div
                    className="relative z-10 flex min-h-0 flex-1 flex-col px-3"
                    style={{ paddingBottom: stackSafeBottom }}
                    onTouchStart={handleSwipeStart}
                    onTouchEnd={handleSwipeEnd}
                    onWheel={handlePeekWheel}
                >
                    <div
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
                                className="absolute -inset-x-2 -inset-y-3 z-[90] pointer-events-none"
                                style={{
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 20%, rgba(0,0,0,0) 42%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,1) 100%)',
                                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 20%, rgba(0,0,0,0) 42%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,1) 100%)',
                                }}
                            />

                            <div className="relative h-full w-full" style={{ display: 'grid', alignItems: 'center' }}>
                                {stackItems.map(({ item, offset }) => (
                                    <FloatingRestaurantFocusCard
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
            )}
        </div>
    );
}










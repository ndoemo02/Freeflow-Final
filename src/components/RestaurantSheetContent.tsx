import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import SheetScrollable from './sheet/SheetScrollable';
import { useBottomSheetContext } from './sheet/BottomSheetContainer';
import { getSheetViewportSnapPositions } from './sheet/sheetPhysics';
import { SheetSnap } from './sheet/sheetTypes';
import RestaurantAvatar from './RestaurantAvatar';
import { useIslandFullList } from '../hooks/useIslandFullList';

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
                className="relative h-full overflow-hidden px-3.5 py-2.5"
                style={{
                    borderRadius: 'var(--radius-md)',
                    background: isFocused
                        ? 'linear-gradient(155deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 45%, rgba(5,8,16,0.98) 100%)'
                        : isRecommended
                            ? 'linear-gradient(155deg, rgba(249,115,22,0.14) 0%, rgba(6,10,18,0.90) 100%)'
                            : 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(5,8,16,0.88) 100%)',
                    border: isFocused
                        ? '1px solid rgba(255,255,255,0.08)'
                        : isRecommended
                            ? '1px solid rgba(249,115,22,0.22)'
                            : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: isFocused
                        ? '0 0 0 1px rgba(255,255,255,0.08) inset, 0 16px 36px rgba(0,0,0,0.45)'
                        : '0 8px 16px rgba(0,0,0,0.22)',
                    backdropFilter: 'blur(var(--blur-md)) saturate(1.08)',
                    WebkitBackdropFilter: 'blur(var(--blur-md)) saturate(1.08)',
                }}
            >
                {isRecommended && !isFocused && (
                    <div
                        className="absolute inset-x-6 top-0 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.6), transparent)' }}
                    />
                )}

                <div className="flex h-full items-center gap-3">
                    <div
                        className="shrink-0 overflow-hidden"
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 'var(--radius-sm)',
                            border: isFocused ? '1px solid rgba(6,182,212,0.28)' : '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <RestaurantAvatar item={item} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <div className={`truncate text-[14px] font-semibold leading-tight ${isFocused ? 'text-white' : 'text-white/78'}`}>
                                {item?.name || 'Restauracja'}
                            </div>
                            <span
                                className="shrink-0 text-[10px] font-medium"
                                style={{
                                    borderRadius: 'var(--radius-pill)',
                                    padding: '2px 8px',
                                    background: isFocused ? 'rgba(6,182,212,0.18)' : 'rgba(255,255,255,0.07)',
                                    color: isFocused ? 'rgba(207,250,254,0.95)' : 'rgba(255,255,255,0.55)',
                                }}
                            >
                                {formatDistance(item)}
                            </span>
                        </div>

                        {isFocused ? (
                            <>
                                <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.18em] text-cyan-300/75">
                                    {item?.cuisine_type || 'Restauracja'}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-[10px]">
                                    <div className="flex items-center gap-0.5">
                                        <span className="font-semibold text-amber-300">★ {Number(item?.rating || 4.5).toFixed(1)}</span>
                                        {item?.ratings_total > 0 && <span className="text-white/40">({item.ratings_total})</span>}
                                    </div>
                                    <span className="text-white/18">·</span>
                                    <span className="text-white/65">{item?.delivery_time || (isRecommended ? 'Polecane' : 'W pobliżu')}</span>
                                    {item?.city && (
                                        <>
                                            <span className="text-white/18">·</span>
                                            <span className="truncate text-white/50">{item.city}</span>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.13em] text-white/32">
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
                className="relative overflow-hidden px-3 py-2"
                style={{
                    minHeight: '80px',
                    borderRadius: 'var(--radius-md)',
                    background: isActive
                        ? 'linear-gradient(155deg, rgba(6,182,212,0.20) 0%, rgba(6,182,212,0.05) 45%, rgba(5,8,16,0.96) 100%)'
                        : isRecommended
                            ? 'linear-gradient(155deg, rgba(249,115,22,0.11) 0%, rgba(5,8,16,0.88) 100%)'
                            : 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(5,8,16,0.84) 100%)',
                    border: isActive
                        ? '1px solid rgba(6,182,212,0.45)'
                        : isRecommended
                            ? '1px solid rgba(249,115,22,0.18)'
                            : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: isActive
                        ? '0 0 0 1px rgba(6,182,212,0.22) inset, 0 10px 22px rgba(0,0,0,0.28)'
                        : '0 6px 12px rgba(0,0,0,0.16)',
                }}
            >
                {isActive && (
                    <div className="absolute inset-x-6 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.90), transparent)' }} />
                )}
                {isRecommended && !isActive && (
                    <div className="absolute inset-x-6 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.55), transparent)' }} />
                )}

                <div className="flex items-center gap-3">
                    <div
                        className="shrink-0 overflow-hidden"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 'var(--radius-sm)',
                            border: isActive ? '1px solid rgba(6,182,212,0.25)' : '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <RestaurantAvatar item={item} size={40} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <div className={`truncate text-[13px] font-semibold leading-tight ${isActive ? 'text-white' : 'text-white/85'}`}>
                                    {item?.name || 'Restauracja'}
                                </div>
                                <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.14em] text-white/38">
                                    {item?.cuisine_type || 'Restauracja'}
                                </div>
                            </div>
                            <div
                                className="shrink-0 text-[10px] font-medium"
                                style={{
                                    borderRadius: 'var(--radius-pill)',
                                    padding: '2px 7px',
                                    background: isActive ? 'rgba(6,182,212,0.16)' : 'rgba(255,255,255,0.07)',
                                    color: isActive ? 'rgba(207,250,254,0.90)' : 'rgba(255,255,255,0.55)',
                                }}
                            >
                                {formatDistance(item)}
                            </div>
                        </div>

                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/50">
                            <div className="flex items-center gap-0.5">
                                <span className="font-semibold text-amber-300/90">★ {Number(item?.rating || 4.5).toFixed(1)}</span>
                                {item?.ratings_total > 0 && <span className="text-white/30 text-[9px]">({item.ratings_total})</span>}
                            </div>
                            <span className="text-white/15">·</span>
                            <span>{isRecommended ? 'Polecane' : 'W pobliżu'}</span>
                            {item?.delivery_time && (
                                <>
                                    <span className="text-white/15">·</span>
                                    <span>{item.delivery_time}</span>
                                </>
                            )}
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

    useIslandFullList(isExpanded);

    const stackHeight = isTeaser ? 170 : 220;
    const stackAnchorTop = useMemo(() => resolveStackAnchorTop(snap, stackHeight), [snap, stackHeight]);
    const stackSafeBottom = 'calc(env(safe-area-inset-bottom) + 84px)';
    const expandedSafeBottom = 'calc(env(safe-area-inset-bottom) + 112px)';
    const ctaLabel = snap === 'closed' ? 'Wyspa' : snap === 'peek' ? 'Pełna lista' : 'Wyspa';

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
                            <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/65">Restauracje w pobliżu</div>
                            <div className="mt-0.5 text-[13px] font-semibold text-white/90">{items.length} {items.length === 1 ? 'miejsce' : items.length < 5 ? 'miejsca' : 'miejsc'}</div>
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
                            className="text-[11px] font-medium text-white/75 backdrop-blur-md transition-all hover:text-white active:scale-95"
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
            )}
        </div>
    );
}

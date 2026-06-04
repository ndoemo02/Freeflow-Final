import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useIslandFullList } from '../hooks/useIslandFullList';

interface RestaurantItem {
    id: string | number;
    name: string;
    cuisine_type?: string;
    address?: string;
    city?: string;
    rating?: number | string;
    distance?: number | string;
    delivery_time?: string;
    image_url?: string;
    image?: string;
    img?: string;
    photo_gallery?: string[];
    _uiId?: string;
}

function resolveImage(item: RestaurantItem): string | null {
    return item.image_url
        || item.img
        || item.image
        || item.photo_gallery?.[0]
        || null;
}

interface Props {
    items: RestaurantItem[];
    selectedId: string | null;
    onSelect: (item: RestaurantItem) => void;
    onPreviewChange?: (item: RestaurantItem) => void;
    recommendedId?: string | null;
}

const GRADIENTS = [
    'linear-gradient(135deg,#2d1205,#7a2e0a)',
    'linear-gradient(135deg,#051e0a,#0d5a1a)',
    'linear-gradient(135deg,#05101e,#0d2a4a)',
    'linear-gradient(135deg,#1e0505,#6b1010)',
    'linear-gradient(135deg,#1a180a,#4a400a)',
    'linear-gradient(135deg,#1e0e05,#6b2a08)',
    'linear-gradient(135deg,#071a07,#124a12)',
    'linear-gradient(135deg,#1a0505,#5a0a18)',
    'linear-gradient(135deg,#1e0a10,#6b1428)',
    'linear-gradient(135deg,#050f1e,#0a2a4a)',
];

function getGradient(name: string) {
    return GRADIENTS[(name.charCodeAt(0) || 0) % GRADIENTS.length];
}

function formatDist(item: RestaurantItem) {
    if (item.distance == null) return 'teraz';
    return typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km` : item.distance;
}

function getStableViewportHeight() {
    if (typeof window === 'undefined') return 800;
    const inner = window.innerHeight || 0;
    const doc = document.documentElement?.clientHeight || 0;
    const vv = window.visualViewport?.height || 0;
    return Math.max(inner, doc, vv);
}

interface CardStyle {
    scale: number;
    opacity: number;
    blur: number;
    rotY: number;
    tz: number;
    ty: number;          // vertical depth offset — stack cards shift slightly down
    contentOpacity: number;
    zIndex: number;
    isCenter: boolean;
}

function getCardStyle(xPx: number, gap: number): CardStyle | null {
    const posFloat = xPx / gap;
    const abs = Math.abs(posFloat);
    if (abs > 4.5) return null;

    // Layered stack depth:
    //   abs=0  → active  : scale 1.0, opacity 1.0, ty 0
    //   abs=1  → 1st left: scale 0.87, opacity 0.78, ty 10px down
    //   abs=2  → 2nd left: scale 0.73, opacity 0.60, ty 18px down
    // z-index uses fine granularity (abs*10) to prevent GPU layer collisions
    // during drag when two cards can share the same absolute distance.
    // Tiebreaker: cards on the right (posFloat>0) render 1px above cards on the left.
    const zBase = 100 - Math.round(abs * 10);
    const zTie = posFloat > 0 ? 0 : -1;
    return {
        scale:          Math.max(0.48, 1 - abs * 0.135),
        opacity:        Math.max(0.18, 1 - abs * 0.22),
        blur:           Math.min(abs * 1.2, 5),
        rotY:           Math.max(-20, Math.min(20, posFloat * -12)),
        tz:             Math.max(-180, -abs * 55),
        ty:             Math.min(abs * 9, 32),   // depth: each layer shifts down
        contentOpacity: Math.max(0, 1 - abs * 0.80),
        zIndex:         zBase + zTie,
        isCenter:       abs < 0.15,
    };
}

export default function CinematicRestaurantCarousel({
    items,
    selectedId,
    onSelect,
    onPreviewChange,
    recommendedId,
}: Props) {
    const idsEqual = useCallback((a: string | number | null | undefined, b: string | number | null | undefined) => {
        if (a == null || b == null) return false;
        return String(a) === String(b);
    }, []);

    const [vpWidth, setVpWidth] = useState(() => window.innerWidth);
    const [vpHeight, setVpHeight] = useState(() => getStableViewportHeight());
    const [layoutReady, setLayoutReady] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(() => {
        const idx = items.findIndex(item => idsEqual(item.id, selectedId));
        return idx >= 0 ? idx : 0;
    });
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [listOpen, setListOpen] = useState(false);
    const [isFullWidth, setIsFullWidth] = useState(false);
    const [compactBounds, setCompactBounds] = useState(() => ({
        top: Math.round(window.innerHeight * 0.38),
        bottom: Math.round(window.innerHeight * 0.16),
    }));

    const dragStartXRef = useRef(0);
    const dragStartYRef = useRef(0);
    const dragLastXRef = useRef(0);
    const dragLastTRef = useRef(0);
    const dragVelocityRef = useRef(0);
    const dragAxisRef = useRef<'x' | 'y' | null>(null);
    const wasDraggedRef = useRef(false);
    const sheetStartXRef = useRef(0);
    const sheetStartYRef = useRef(0);
    const hasLoggedInitialLayoutRef = useRef(false);
    const hasLoggedRestoredLayoutRef = useRef(false);
    const wasExpandedRef = useRef(false);
    const justRestoredRef = useRef(false);
    const listOpenRef = useRef(false);

    const recalcCompactBounds = useCallback(() => {
        const viewportHeight = getStableViewportHeight();
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const logoZone = document.querySelector('.hero-stack') as HTMLElement | null;
        const logoContainer = document.querySelector('.logo-container') as HTMLElement | null;
        const logoImage = document.querySelector('.hero-stack .logo') as HTMLElement | null;
        const dockLayer = document.querySelector('[data-ui-role="voice-dock-layer"]') as HTMLElement | null;
        const dockBar = document.querySelector('[data-ui-role="voice-dock-bar"]') as HTMLElement | null;
        const dock = dockLayer || dockBar;
        const dockRect = dock?.getBoundingClientRect();

        let nextTop = Math.round(viewportHeight * 0.38);
        let nextBottom = Math.round(viewportHeight * 0.16);
        let logoTopFloor = nextTop;

        const logoBottomCandidates: number[] = [];
        // Only use the actual logo image to avoid artificial padding from containers
        if (logoImage) logoBottomCandidates.push(logoImage.getBoundingClientRect().bottom);
        const hasLogoAnchors = logoBottomCandidates.length > 0;
        const hasDockAnchor = !!dockRect;
        if (logoBottomCandidates.length > 0) {
            const logoBottom = Math.max(...logoBottomCandidates);
            // Keep clear space below the logo droplet so card never touches/covers it.
            logoTopFloor = Math.round(logoBottom + 14);
            nextTop = logoTopFloor;
        }

        if (dockRect) {
            const dockTop = dockRect.top;
            const baseBottom = viewportHeight - dockTop;
            // Mobile: anchor card to slightly overlap VoiceDock top edge
            // so it visually "emerges" from the dock instead of floating above it.
            const dockOverlapOffset = isMobile ? -16 : 4;
            const anchoredBottom = baseBottom + dockOverlapOffset;
            nextBottom = Math.max(8, Math.round(anchoredBottom));
        }

        const minStageHeight = 180;
        const available = viewportHeight - nextTop - nextBottom;
        if (available < minStageHeight) {
            const deficit = minStageHeight - available;
            nextBottom = Math.max(8, nextBottom - deficit);
            nextTop = Math.max(logoTopFloor, nextTop);
        }

        setCompactBounds((prev) => {
            if (prev.top === nextTop && prev.bottom === nextBottom) return prev;
            return { top: nextTop, bottom: nextBottom };
        });

        const stageHeight = Math.max(0, viewportHeight - nextTop - nextBottom);
        const hasStableAnchors = hasLogoAnchors && hasDockAnchor && stageHeight > 0;
        if (hasStableAnchors) {
            setLayoutReady(true);
        }

        if (hasStableAnchors && !hasLoggedInitialLayoutRef.current) {
            hasLoggedInitialLayoutRef.current = true;
            console.log(`[CAROUSEL_LAYOUT] phase=initial compact=true listOpen=${String(listOpenRef.current)} viewportHeight=${Math.round(viewportHeight)} stageHeight=${Math.round(stageHeight)} dockHeight=${Math.round(dockRect?.height || 0)} cardHeightHint=${Math.round(stageHeight * (isMobile ? 0.9 : 0.82))}`);
        }

        if (hasStableAnchors && justRestoredRef.current) {
            justRestoredRef.current = false;
            hasLoggedRestoredLayoutRef.current = true;
            console.log(`[CAROUSEL_LAYOUT] phase=restored compact=true listOpen=${String(listOpenRef.current)} viewportHeight=${Math.round(viewportHeight)} stageHeight=${Math.round(stageHeight)} dockHeight=${Math.round(dockRect?.height || 0)} cardHeightHint=${Math.round(stageHeight * (isMobile ? 0.9 : 0.82))}`);
        }
    }, []);

    useEffect(() => {
        const syncViewport = () => {
            setVpWidth(window.innerWidth);
            setVpHeight(getStableViewportHeight());
        };
        window.addEventListener('resize', syncViewport);
        const vv = window.visualViewport;
        vv?.addEventListener('resize', syncViewport);
        vv?.addEventListener('scroll', syncViewport);
        return () => {
            window.removeEventListener('resize', syncViewport);
            vv?.removeEventListener('resize', syncViewport);
            vv?.removeEventListener('scroll', syncViewport);
        };
    }, []);

    useEffect(() => {
        recalcCompactBounds();
        const onResize = () => window.requestAnimationFrame(recalcCompactBounds);
        window.addEventListener('resize', onResize);
        const vv = window.visualViewport;
        vv?.addEventListener('resize', onResize);
        vv?.addEventListener('scroll', onResize);
        let warmupFrames = 0;
        let warmupRaf = 0;
        const warmupMeasure = () => {
            window.requestAnimationFrame(recalcCompactBounds);
            warmupFrames += 1;
            // 60 frames (~1 sec) to ensure we capture the end of the 0.6s CSS transition
            if (warmupFrames < 60) {
                warmupRaf = window.requestAnimationFrame(warmupMeasure);
            }
        };
        warmupRaf = window.requestAnimationFrame(warmupMeasure);

        const observer = new MutationObserver(() => {
            window.requestAnimationFrame(recalcCompactBounds);
        });
        const geometryObserver = new MutationObserver(() => {
            window.requestAnimationFrame(recalcCompactBounds);
        });
        const homeRoot = document.querySelector('.home-page.freeflow');
        const dockLayer = document.querySelector('[data-ui-role="voice-dock-layer"]');
        const dockBar = document.querySelector('[data-ui-role="voice-dock-bar"]');
        const logoContainer = document.querySelector('.logo-container');
        const logoImage = document.querySelector('.hero-stack .logo');
        if (homeRoot) {
            observer.observe(homeRoot, { attributes: true, attributeFilter: ['class'] });
        }
        [dockLayer, dockBar, logoContainer, logoImage].forEach((node) => {
            if (!node) return;
            geometryObserver.observe(node, { attributes: true, attributeFilter: ['style', 'class'] });
        });

        return () => {
            window.removeEventListener('resize', onResize);
            vv?.removeEventListener('resize', onResize);
            vv?.removeEventListener('scroll', onResize);
            window.cancelAnimationFrame(warmupRaf);
            observer.disconnect();
            geometryObserver.disconnect();
        };
    }, [recalcCompactBounds]);

    useIslandFullList(listOpen);

    useEffect(() => {
        listOpenRef.current = listOpen;
        if (listOpen) {
            wasExpandedRef.current = true;
        } else if (wasExpandedRef.current) {
            justRestoredRef.current = true;
        }

        // Defensive reset during compact/expanded transitions.
        setDragOffset(0);
        setIsDragging(false);
        dragAxisRef.current = null;
        dragVelocityRef.current = 0;

        let warmupFrames = 0;
        let warmupRaf = 0;
        const warmupMeasure = () => {
            recalcCompactBounds();
            warmupFrames += 1;
            // 60 frames (~1 sec) to ensure we capture the end of the CSS transition
            if (warmupFrames < 60) {
                warmupRaf = window.requestAnimationFrame(warmupMeasure);
            }
        };
        warmupRaf = window.requestAnimationFrame(warmupMeasure);

        return () => {
            window.cancelAnimationFrame(warmupRaf);
        };
    }, [listOpen, recalcCompactBounds]);

    useEffect(() => {
        const resetDrag = () => {
            if (!isDragging && dragOffset === 0) return;
            setDragOffset(0);
            setIsDragging(false);
            dragAxisRef.current = null;
            dragVelocityRef.current = 0;
        };

        window.addEventListener('scroll', resetDrag, { passive: true });
        const vv = window.visualViewport;
        vv?.addEventListener('scroll', resetDrag);
        vv?.addEventListener('resize', resetDrag);

        return () => {
            window.removeEventListener('scroll', resetDrag);
            vv?.removeEventListener('scroll', resetDrag);
            vv?.removeEventListener('resize', resetDrag);
        };
    }, [isDragging, dragOffset]);

    useEffect(() => {
        if (!selectedId) return;
        setCurrentIndex(prev => {
            const idx = items.findIndex(item => idsEqual(item.id, selectedId));
            return idx >= 0 && idx !== prev ? idx : prev;
        });
    // currentIndex celowo pominięty — był źródłem pętli oscylacji
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, items, idsEqual]);

    const prevIndexRef = useRef(currentIndex);
    useEffect(() => {
        if (currentIndex !== prevIndexRef.current && items[currentIndex]) {
            prevIndexRef.current = currentIndex;
            onPreviewChange?.(items[currentIndex]);
        }
    }, [currentIndex, items, onPreviewChange]);

    const appWidth = Math.min(vpWidth, 480);
    const isMobileViewport = vpWidth <= 768;
    
    // Cinematic large card width
    const widthFactor = isMobileViewport ? 0.44 : 0.38; 
    const CARD_W = Math.max(140, Math.min(Math.floor(appWidth * widthFactor), 240));
    
    const compactStageHeight = Math.max(140, vpHeight - compactBounds.top - compactBounds.bottom);
    
    // Keep compact cards inside the measured safe zone between logo and VoiceDock.
    // The previous mobile factor intentionally oversized cards and could overlap the hero logo.
    const heightFactor = isMobileViewport ? 0.92 : 1.05;
    const maxCardHeight = isMobileViewport ? Math.max(180, compactStageHeight - 8) : 650;
    const CARD_H = Math.max(180, Math.min(Math.round(compactStageHeight * heightFactor), maxCardHeight));
    
    const GAP = Math.floor(CARD_W * 0.45); // tight stack — cards overlap like a deck
    
    // Active card hugs the right edge; blurred queue cards are to the LEFT
    const paddingRight = 16;
    const rightHuggingBias = (appWidth - CARD_W) / 2 - paddingRight;
    const ACTIVE_BIAS_X = isMobileViewport
        ? rightHuggingBias
        : Math.max(16, Math.round(appWidth * 0.1));

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragStartXRef.current = e.clientX;
        dragStartYRef.current = e.clientY;
        dragLastXRef.current = e.clientX;
        dragLastTRef.current = Date.now();
        dragVelocityRef.current = 0;
        dragAxisRef.current = null;
        wasDraggedRef.current = false;
        setIsDragging(true);
        setDragOffset(0);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartXRef.current;
        const dy = e.clientY - dragStartYRef.current;
        
        // Touch needs a tighter threshold; mouse pointer can drift up to ~14px on a click
        const dragThreshold = e.pointerType === 'touch' ? 8 : 14;
        if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
            wasDraggedRef.current = true;
        }

        if (dragAxisRef.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            dragAxisRef.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        }
        if (dragAxisRef.current !== 'x') return;

        const now = Date.now();
        const dt = Math.max(1, now - dragLastTRef.current);
        dragVelocityRef.current = (e.clientX - dragLastXRef.current) / dt * 14;
        dragLastXRef.current = e.clientX;
        dragLastTRef.current = now;
        setDragOffset(dx);
    }, [isDragging]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;

        const dx = e.clientX - dragStartXRef.current;
        const dy = e.clientY - dragStartYRef.current;
        const axis = dragAxisRef.current;

        if ((axis === 'y' || axis === null) && dy < -60 && Math.abs(dy) > Math.abs(dx)) {
            setDragOffset(0);
            setIsDragging(false);
            dragAxisRef.current = null;
            setListOpen(true);
            return;
        }

        const totalOffset = dragOffset + dragVelocityRef.current * 6;
        const dragFraction = totalOffset / GAP;
        let indexDelta = 0;
        if (Math.abs(dragFraction) > 0.32) {
            indexDelta = Math.sign(dragFraction) * Math.min(Math.ceil(Math.abs(dragFraction)), 1);
        }
        
        const newIndex = Math.max(0, Math.min(items.length - 1, currentIndex + indexDelta));

        setCurrentIndex(newIndex);
        setDragOffset(0);
        setIsDragging(false);
        dragAxisRef.current = null;
    }, [isDragging, dragOffset, currentIndex, items.length, GAP, isMobileViewport]);

    const handlePointerCancel = useCallback(() => {
        setDragOffset(0);
        setIsDragging(false);
        dragAxisRef.current = null;
    }, []);

    const handleCardClick = useCallback((index: number) => {
        if (wasDraggedRef.current) return;
        if (Math.abs(dragOffset) > 8) return;
        if (isMobileViewport) {
            // Mobile: first tap focuses the card, second tap (center) opens menu
            if (index !== currentIndex) {
                setCurrentIndex(index);
            } else {
                onSelect(items[index]);
            }
        } else {
            // Desktop: one click = open restaurant directly
            setCurrentIndex(index);
            onSelect(items[index]);
        }
    }, [dragOffset, currentIndex, items, onSelect, isMobileViewport]);

    const handleListItemClick = useCallback((index: number) => {
        setListOpen(false);
        setIsFullWidth(false);
        setCurrentIndex(index);
        onSelect(items[index]);
    }, [items, onSelect]);

    const closeList = useCallback(() => {
        setListOpen(false);
        setIsFullWidth(false);
    }, []);

    const handleSheetTouchStart = useCallback((e: React.TouchEvent) => {
        sheetStartXRef.current = e.touches[0].clientX;
        sheetStartYRef.current = e.touches[0].clientY;
    }, []);

    const handleSheetTouchEnd = useCallback((e: React.TouchEvent) => {
        const touch = e.changedTouches[0];
        if (!touch) return;
        const dx = touch.clientX - sheetStartXRef.current;
        const dy = touch.clientY - sheetStartYRef.current;
        if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
        if (dx > 0) closeList();
        else setIsFullWidth(prev => !prev);
    }, [closeList]);

    if (!items.length) return null;
    if (!layoutReady) return null;

    return (
        <>
            <div
                className="fixed z-[30] flex flex-col justify-end items-center pointer-events-none"
                style={{
                    maxWidth: 480,
                    left: isMobileViewport ? 'auto' : '50%',
                    transform: isMobileViewport ? 'none' : 'translateX(-50%)',
                    right: isMobileViewport ? '0px' : 'auto',
                    width: isMobileViewport ? 'min(100%, 480px)' : 'calc(100% - 14px)',
                    top: `${compactBounds.top}px`,
                    bottom: `${compactBounds.bottom}px`,
                    display: listOpen ? 'none' : 'flex',
                }}
            >
                <div className="flex-1 w-full flex items-end justify-end min-h-0 relative overflow-visible pointer-events-auto">
                    <div
                        style={{
                            position: 'relative', width: '100%', maxWidth: isMobileViewport ? 404 : 420, height: `${CARD_H}px`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            userSelect: 'none', touchAction: 'none', marginRight: isMobileViewport ? 0 : 4,
                            transformStyle: 'preserve-3d',
                        }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        onPointerLeave={handlePointerCancel}
                        onLostPointerCapture={handlePointerCancel}
                    >
                        {!isMobileViewport && currentIndex > 0 && !isDragging && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => Math.max(0, i - 1)); }}
                                style={{
                                    position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
                                    zIndex: 30, width: 30, height: 30, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                                    color: 'rgba(255,255,255,0.45)', fontSize: 18, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >&#8249;</button>
                        )}

                        {!isMobileViewport && currentIndex < items.length - 1 && !isDragging && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => Math.min(items.length - 1, i + 1)); }}
                                style={{
                                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                                    zIndex: 30, width: 30, height: 30, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                                    color: 'rgba(255,255,255,0.45)', fontSize: 18, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >&#8250;</button>
                        )}

                        {items.map((item, i) => {
                            const xPx = (currentIndex - i) * GAP + dragOffset;
                            const anchoredXPx = xPx + ACTIVE_BIAS_X;
                            const s = getCardStyle(xPx, GAP);
                            if (!s) return null;

                            return (
                                <div
                                    key={`${item.id}-${i}`}
                                    onClick={() => handleCardClick(i)}
                                    style={{
                                        position: 'absolute',
                                        width: CARD_W, height: CARD_H,
                                        zIndex: s.zIndex,
                                        opacity: s.opacity,
                                        filter: s.blur > 0.3 ? `blur(${s.blur.toFixed(1)}px)` : 'none',
                                        transform: `translateX(${anchoredXPx.toFixed(1)}px) translateY(${s.ty.toFixed(1)}px) scale(${s.scale.toFixed(3)})`,
                                        transition: isDragging
                                            ? 'transform 0.05s linear'
                                            : 'transform 0.5s cubic-bezier(0.2,0.8,0.2,1), opacity 0.4s ease, filter 0.4s ease',
                                        cursor: 'pointer',
                                        willChange: 'transform, opacity',
                                        backfaceVisibility: 'hidden',
                                        WebkitBackfaceVisibility: 'hidden',
                                        isolation: 'isolate',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '100%', height: '100%',
                                            borderRadius: 16, overflow: 'hidden', position: 'relative',
                                            border: s.isCenter
                                                ? '1px solid rgba(249,115,22,0.4)'
                                                : '1px solid rgba(255,255,255,0.08)',
                                            boxShadow: s.isCenter
                                                ? '0 20px 60px rgba(0,0,0,0.6), 0 0 48px rgba(249,115,22,0.18), 0 24px 60px rgba(0,0,0,0.88)'
                                                : '0 10px 30px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)',
                                            transform: `perspective(900px) rotateY(${s.rotY.toFixed(2)}deg) translateZ(${s.tz.toFixed(1)}px)`,
                                            transition: isDragging ? 'transform 0.05s linear' : 'transform 0.5s cubic-bezier(0.2,0.8,0.2,1)',
                                            backfaceVisibility: 'hidden',
                                            WebkitBackfaceVisibility: 'hidden',
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: resolveImage(item)
                                                ? `url(${resolveImage(item)}) center / cover no-repeat`
                                                : getGradient(item.name),
                                        }}>
                                            <div style={{
                                                position: 'absolute', inset: 0,
                                                background: 'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)',
                                            }} />
                                        </div>

                                        <div style={{
                                            position: 'absolute', top: 10, left: 0, right: 0, bottom: 10, padding: '0 14px',
                                            display: 'flex', flexDirection: 'column',
                                            opacity: s.contentOpacity,
                                            transition: isDragging ? 'none' : 'opacity 0.3s ease',
                                        }}>
                                            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(255,180,40,0.85)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>
                                                {item.cuisine_type || 'Restauracja'}
                                                {item.id === recommendedId && (
                                                    <span style={{ marginLeft: 6, color: '#f97316', letterSpacing: 0 }}>Polecane</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 3 }}>
                                                {item.name}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>
                                                {item.city || item.address || ''}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 'auto' }}>
                                                <span style={{ fontSize: 10, color: '#f97316' }}>Ocena {item.rating || '4.5'}</span>
                                                <span style={{
                                                    fontSize: 8, padding: '2px 7px', borderRadius: 20,
                                                    background: 'rgba(34,197,94,0.13)', color: 'rgba(100,220,130,0.9)',
                                                    border: '1px solid rgba(34,197,94,0.22)',
                                                }}>
                                                    {formatDist(item)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ height: '0px', flexShrink: 0 }} />
            </div>

            <AnimatePresence>
                {listOpen && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-[40]"
                            style={{
                                background: 'radial-gradient(circle at 50% 90%, rgba(8,5,2,0.74) 0%, rgba(8,5,2,0.56) 38%, rgba(8,5,2,0.26) 72%, rgba(8,5,2,0.08) 100%)',
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35 }}
                            onClick={closeList}
                        />
                        <motion.div
                            className="fixed right-0 z-[45] flex flex-col"
                            style={{
                                background: 'linear-gradient(170deg, rgba(18,14,9,0.96) 0%, rgba(10,8,5,0.94) 100%)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                height: '82vh',
                                maxHeight: '82vh',
                                bottom: 'calc(env(safe-area-inset-bottom) + 6px)',
                                backdropFilter: 'blur(12px) saturate(130%)',
                                boxShadow: '-8px 0 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(249,115,22,0.07) inset',
                                overflow: 'hidden',
                            }}
                            initial={{ y: '100%', width: Math.max(260, Math.round(vpWidth * 0.68)), borderRadius: '20px 0 0 0' }}
                            animate={{
                                y: 0,
                                width: isFullWidth ? vpWidth : Math.max(260, Math.round(vpWidth * 0.68)),
                                borderRadius: isFullWidth ? '0px' : '20px 0 0 0',
                            }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 280 }}
                        >
                            {/* Strefa gestów — tylko nagłówek, poza scroll divem */}
                            <div
                                onTouchStart={handleSheetTouchStart}
                                onTouchEnd={handleSheetTouchEnd}
                                style={{ flexShrink: 0, touchAction: 'pan-y', userSelect: 'none' }}
                            >
                                <div style={{ width: 30, height: 3, background: 'rgba(255,255,255,0.16)', borderRadius: 2, margin: '9px auto 5px' }} />
                                <div style={{ padding: '0 16px 9px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>{items.length} restauracji w pobliżu</span>
                                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', fontWeight: 400 }}>
                                        {isFullWidth ? '→ zwęź' : '← rozwiń'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' } as React.CSSProperties}>
                                {items.map((item, i) => (
                                    <div
                                        key={`${item.id}-list-${i}`}
                                        onClick={() => handleListItemClick(i)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 11,
                                            padding: '9px 16px', cursor: 'pointer',
                                            borderBottom: '1px solid rgba(255,255,255,0.035)',
                                            background: i === currentIndex ? 'rgba(249,115,22,0.07)' : 'transparent',
                                            borderLeft: i === currentIndex ? '2px solid rgba(249,115,22,0.45)' : '2px solid transparent',
                                        }}
                                    >
                                        <div style={{ width: 42, height: 42, borderRadius: 9, flexShrink: 0, background: getGradient(item.name), overflow: 'hidden' }}>
                                            {resolveImage(item) && <img src={resolveImage(item)!} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.name}
                                            </div>
                                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.32)', marginTop: 1 }}>
                                                {[item.cuisine_type, item.city || item.address].filter(Boolean).join(' · ')}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: 9, color: '#f97316' }}>Ocena {item.rating || '4.5'}</div>
                                            <div style={{ fontSize: 8, color: 'rgba(100,220,120,0.6)' }}>{formatDist(item)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div
                                onClick={closeList}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: 11, cursor: 'pointer', color: 'rgba(255,255,255,0.28)', fontSize: 10,
                                    gap: 4, borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
                                }}
                            >
                                zamknij liste
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

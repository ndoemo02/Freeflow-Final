import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion, useMotionValue, animate } from 'framer-motion';

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
    _uiId?: string;
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
    ty: number;
    contentOpacity: number;
    zIndex: number;
    isCenter: boolean;
    visible: boolean;
}

// posFloat = i - progress  (so 0 = active card, ±1 = neighbours, etc.)
function computeCardStyle(posFloat: number): CardStyle {
    const abs = Math.abs(posFloat);
    if (abs > 4.5) {
        return {
            scale: 0.4, opacity: 0, blur: 0, rotY: 0, tz: -200, ty: 32,
            contentOpacity: 0, zIndex: 0, isCenter: false, visible: false,
        };
    }
    return {
        scale: Math.max(0.48, 1 - abs * 0.135),
        opacity: Math.max(0.18, 1 - abs * 0.22),
        blur: Math.min(abs * 1.2, 5),
        // posFloat>0 means card sits to the LEFT of active → tilt right
        rotY: Math.max(-20, Math.min(20, posFloat * 12)),
        tz: Math.max(-180, -abs * 55),
        ty: Math.min(abs * 9, 32),
        contentOpacity: Math.max(0, 1 - abs * 0.80),
        zIndex: Math.round(30 - abs * 5),
        isCenter: abs < 0.15,
        visible: true,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
//  PHYSICS CONFIG
// ─────────────────────────────────────────────────────────────────────────────
//  Spring tuned for a "buttery" feel:
//   • stiffness 280  → reaches target in ~380 ms  (responsive but not jumpy)
//   • damping   34   → critical-ish damping, < 3 % overshoot, NO oscillation
//   • mass      0.9  → slightly lighter than default → snappier accel
//  Together these kill the visible "bounce-back" you saw on incomplete swipes:
//  the same spring handles BOTH the snap-to-current-card and the fling-forward,
//  so there is no transition fighting React state, no two-stage animation.
const SPRING_SNAP = {
    type: 'spring' as const,
    stiffness: 280,
    damping: 34,
    mass: 0.9,
    restDelta: 0.0008,
    restSpeed: 0.005,
};

//  Below this absolute index-velocity (units/sec) we treat the gesture as a
//  drag-release, NOT a flick. Above it, we force a one-step jump in the
//  flick direction even if the user barely moved their finger.
const FLICK_VELOCITY_THRESHOLD = 1.1;

//  Cap the velocity we forward to the spring solver so a wild flick can't
//  rocket six cards forward and miss the index entirely.
const MAX_VELOCITY_INDEX = 6;

//  How far ahead (in seconds) we project the current velocity to decide which
//  index the user "meant" to land on. 0.12 s ≈ iOS PagingScrollView.
const VELOCITY_PROJECTION_SEC = 0.12;

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

    const [vpWidth, setVpWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 480));
    const [vpHeight, setVpHeight] = useState(() => getStableViewportHeight());
    const [layoutReady, setLayoutReady] = useState(false);

    const initialIdx = (() => {
        const idx = items.findIndex(item => idsEqual(item.id, selectedId));
        return idx >= 0 ? idx : 0;
    })();

    const [currentIndex, setCurrentIndex] = useState(initialIdx);
    const [isDragging, setIsDragging] = useState(false);
    const [listOpen, setListOpen] = useState(false);
    const [isFullWidth, setIsFullWidth] = useState(false);
    const [compactBounds, setCompactBounds] = useState(() => ({
        top: typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.38) : 280,
        bottom: typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.16) : 120,
    }));

    // ─── PROGRESS: fractional index driving every card transform ────────────
    // Single motion value. Mutating it does NOT trigger a React render —
    // a single subscription writes directly to DOM refs.
    const progress = useMotionValue(initialIdx);
    const animationRef = useRef<ReturnType<typeof animate> | null>(null);

    // Per-card refs for imperative DOM updates (zero re-render path).
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const innerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const contentRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Pointer / gesture refs
    const isDraggingRef = useRef(false);
    const startPointerXRef = useRef(0);
    const startPointerYRef = useRef(0);
    const startProgressRef = useRef(0);
    const lastPointerXRef = useRef(0);
    const lastPointerTRef = useRef(0);
    const velocityPxPerMsRef = useRef(0);
    const dragAxisRef = useRef<'x' | 'y' | null>(null);
    const wasDraggedRef = useRef(false);

    const sheetStartXRef = useRef(0);
    const sheetStartYRef = useRef(0);
    const hasLoggedInitialLayoutRef = useRef(false);
    const hasLoggedRestoredLayoutRef = useRef(false);
    const wasExpandedRef = useRef(false);
    const justRestoredRef = useRef(false);
    const listOpenRef = useRef(false);

    const stopAnim = useCallback(() => {
        if (animationRef.current) {
            animationRef.current.stop();
            animationRef.current = null;
        }
    }, []);

    const recalcCompactBounds = useCallback(() => {
        const viewportHeight = getStableViewportHeight();
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const logoImage = document.querySelector('.hero-stack .logo') as HTMLElement | null;
        const dockLayer = document.querySelector('[data-ui-role="voice-dock-layer"]') as HTMLElement | null;
        const dockBar = document.querySelector('[data-ui-role="voice-dock-bar"]') as HTMLElement | null;
        const dock = dockLayer || dockBar;
        const dockRect = dock?.getBoundingClientRect();

        let nextTop = Math.round(viewportHeight * 0.38);
        let nextBottom = Math.round(viewportHeight * 0.16);
        let logoTopFloor = nextTop;

        const logoBottomCandidates: number[] = [];
        if (logoImage) logoBottomCandidates.push(logoImage.getBoundingClientRect().bottom);
        const hasLogoAnchors = logoBottomCandidates.length > 0;
        const hasDockAnchor = !!dockRect;
        if (logoBottomCandidates.length > 0) {
            const logoBottom = Math.max(...logoBottomCandidates);
            logoTopFloor = Math.round(logoBottom + 14);
            nextTop = logoTopFloor;
        }

        if (dockRect) {
            const dockTop = dockRect.top;
            const baseBottom = viewportHeight - dockTop;
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
            console.log(`[CAROUSEL_LAYOUT] phase=initial compact=true listOpen=${String(listOpenRef.current)} viewportHeight=${Math.round(viewportHeight)} stageHeight=${Math.round(stageHeight)} dockHeight=${Math.round(dockRect?.height || 0)}`);
        }
        if (hasStableAnchors && justRestoredRef.current) {
            justRestoredRef.current = false;
            hasLoggedRestoredLayoutRef.current = true;
            console.log(`[CAROUSEL_LAYOUT] phase=restored compact=true listOpen=${String(listOpenRef.current)} viewportHeight=${Math.round(viewportHeight)} stageHeight=${Math.round(stageHeight)}`);
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

    useEffect(() => {
        const root = document.querySelector('.freeflow');
        if (!root) return;
        listOpenRef.current = listOpen;
        root.classList.toggle('island-full-list', listOpen);
        if (listOpen) {
            wasExpandedRef.current = true;
        } else if (wasExpandedRef.current) {
            justRestoredRef.current = true;
        }

        // Defensive reset during compact/expanded transitions.
        stopAnim();
        progress.set(currentIndex);
        isDraggingRef.current = false;
        setIsDragging(false);
        dragAxisRef.current = null;
        velocityPxPerMsRef.current = 0;

        let warmupFrames = 0;
        let warmupRaf = 0;
        const warmupMeasure = () => {
            recalcCompactBounds();
            warmupFrames += 1;
            if (warmupFrames < 60) {
                warmupRaf = window.requestAnimationFrame(warmupMeasure);
            }
        };
        warmupRaf = window.requestAnimationFrame(warmupMeasure);

        return () => {
            window.cancelAnimationFrame(warmupRaf);
            if (listOpen) {
                root.classList.remove('island-full-list');
            }
        };
    }, [listOpen, recalcCompactBounds, currentIndex, progress, stopAnim]);

    // Cancel a swipe-in-flight if the page itself scrolls (e.g. soft kbd).
    useEffect(() => {
        const resetDrag = () => {
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;
            setIsDragging(false);
            dragAxisRef.current = null;
            velocityPxPerMsRef.current = 0;
            stopAnim();
            animationRef.current = animate(progress, currentIndex, SPRING_SNAP);
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
    }, [currentIndex, progress, stopAnim]);

    // External selection sync (e.g. from list panel)
    useEffect(() => {
        if (!selectedId) return;
        const idx = items.findIndex(item => idsEqual(item.id, selectedId));
        if (idx < 0 || idx === currentIndex) return;
        setCurrentIndex(idx);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, items, idsEqual]);

    const prevIndexRef = useRef(currentIndex);
    useEffect(() => {
        if (currentIndex !== prevIndexRef.current && items[currentIndex]) {
            prevIndexRef.current = currentIndex;
            onPreviewChange?.(items[currentIndex]);
        }
    }, [currentIndex, items, onPreviewChange]);

    // Animate progress whenever `currentIndex` changes from outside the
    // pointer-up handler (clicks, list selections, external selectedId).
    // The pointer-up handler bypasses this by writing progress directly
    // *and* setting currentIndex in the same tick — that path passes the
    // gesture velocity through.
    useEffect(() => {
        if (isDraggingRef.current) return;
        const cur = progress.get();
        if (Math.abs(cur - currentIndex) < 0.001) return;
        // Skip if we already have an animation heading to currentIndex.
        if (animationRef.current) return;
        animationRef.current = animate(progress, currentIndex, {
            ...SPRING_SNAP,
            onComplete: () => { animationRef.current = null; },
        });
    }, [currentIndex, progress]);

    // ─── LAYOUT MEASUREMENTS ────────────────────────────────────────────────
    const appWidth = Math.min(vpWidth, 480);
    const isMobileViewport = vpWidth <= 768;
    const widthFactor = isMobileViewport ? 0.44 : 0.38;
    const CARD_W = Math.max(140, Math.min(Math.floor(appWidth * widthFactor), 240));
    const compactStageHeight = Math.max(140, vpHeight - compactBounds.top - compactBounds.bottom);
    const heightFactor = isMobileViewport ? 1.32 : 1.05;
    const CARD_H = Math.max(220, Math.min(Math.round(compactStageHeight * heightFactor), 650));
    const GAP = Math.floor(CARD_W * 0.45);

    const paddingRight = 16;
    const rightHuggingBias = (appWidth - CARD_W) / 2 - paddingRight;
    const ACTIVE_BIAS_X = isMobileViewport
        ? rightHuggingBias
        : Math.max(16, Math.round(appWidth * 0.1));

    // ─── IMPERATIVE RENDER LOOP ──────────────────────────────────────────────
    // Single subscription on `progress`. Every frame the spring/drag commits
    // a new value, we mutate transforms directly. NO React re-render, NO
    // style diffing — just GPU-friendly transform writes.
    useEffect(() => {
        const apply = (val: number) => {
            const dragging = isDraggingRef.current;
            for (let i = 0; i < items.length; i++) {
                const outer = cardRefs.current[i];
                const inner = innerRefs.current[i];
                const content = contentRefs.current[i];
                if (!outer) continue;

                const posFloat = i - val;
                const s = computeCardStyle(posFloat);
                if (!s.visible) {
                    if (outer.style.display !== 'none') outer.style.display = 'none';
                    continue;
                }
                if (outer.style.display === 'none') outer.style.display = '';

                // Active card hugs the right edge; queue cards stack to the LEFT.
                // posFloat>0 means card sits ahead of active in the stack → shifts left.
                const xPx = -posFloat * GAP + ACTIVE_BIAS_X;

                // OUTER: pure 2D translate + scale → composited, no layout, no paint.
                outer.style.transform =
                    `translate3d(${xPx.toFixed(2)}px, ${s.ty.toFixed(2)}px, 0) ` +
                    `scale(${s.scale.toFixed(3)})`;
                outer.style.zIndex = String(s.zIndex);

                // INNER: perspective rotation — also pure transform.
                if (inner) {
                    inner.style.transform =
                        `perspective(900px) ` +
                        `rotateY(${s.rotY.toFixed(2)}deg) ` +
                        `translateZ(${s.tz.toFixed(1)}px)`;
                }

                // Opacity is cheap; safe to update every frame.
                outer.style.opacity = s.opacity.toFixed(3);
                if (content) content.style.opacity = s.contentOpacity.toFixed(3);

                // FILTER (blur) is the expensive one — kills the compositor on
                // mobile if it changes 60 times/sec while the user is scrubbing.
                // We freeze it during the drag and only refresh while the
                // post-release spring is settling.
                if (!dragging) {
                    const blurStr = s.blur > 0.3 ? `blur(${s.blur.toFixed(2)}px)` : '';
                    if (outer.style.filter !== blurStr) outer.style.filter = blurStr;
                }
            }
        };
        apply(progress.get());
        const unsub = progress.on('change', apply);
        return () => unsub();
    }, [items.length, GAP, ACTIVE_BIAS_X, progress]);

    // ─── POINTER HANDLERS ────────────────────────────────────────────────────
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        stopAnim();

        // Promote each visible card to its own compositor layer for the
        // duration of the gesture. We turn this OFF after settle because
        // permanent will-change wastes GPU memory.
        for (const el of cardRefs.current) {
            if (el) el.style.willChange = 'transform, opacity';
        }

        isDraggingRef.current = true;
        setIsDragging(true);
        startPointerXRef.current = e.clientX;
        startPointerYRef.current = e.clientY;
        startProgressRef.current = progress.get();
        lastPointerXRef.current = e.clientX;
        lastPointerTRef.current = performance.now();
        velocityPxPerMsRef.current = 0;
        dragAxisRef.current = null;
        wasDraggedRef.current = false;
    }, [progress, stopAnim]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - startPointerXRef.current;
        const dy = e.clientY - startPointerYRef.current;

        const dragThreshold = e.pointerType === 'touch' ? 8 : 14;
        if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
            wasDraggedRef.current = true;
        }
        if (dragAxisRef.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            dragAxisRef.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        }
        if (dragAxisRef.current !== 'x') return;

        // Exponentially-weighted velocity (px/ms). EMA smooths out the noise
        // of 4–8 ms pointer deltas so the spring solver gets a sane reading
        // instead of an outlier-driven rocket.
        const now = performance.now();
        const dt = Math.max(1, now - lastPointerTRef.current);
        const instV = (e.clientX - lastPointerXRef.current) / dt;
        velocityPxPerMsRef.current = velocityPxPerMsRef.current * 0.6 + instV * 0.4;
        lastPointerXRef.current = e.clientX;
        lastPointerTRef.current = now;

        // Drive the motion value imperatively. Negative because dragging
        // RIGHT should reveal the previous card (lower index), while the
        // queue stack visually sits to the LEFT of the active card.
        const next = startProgressRef.current - dx / GAP;
        // Soft rubber-band at the ends so users feel the boundary.
        const clamped =
            next < 0
                ? next * 0.35
                : next > items.length - 1
                    ? (items.length - 1) + (next - (items.length - 1)) * 0.35
                    : next;
        progress.set(clamped);
    }, [GAP, items.length, progress]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - startPointerXRef.current;
        const dy = e.clientY - startPointerYRef.current;
        const axis = dragAxisRef.current;

        isDraggingRef.current = false;
        setIsDragging(false);
        dragAxisRef.current = null;

        // Vertical flick-up → open list (preserved gesture, no spring needed).
        if ((axis === 'y' || axis === null) && dy < -60 && Math.abs(dy) > Math.abs(dx)) {
            // Snap progress back to the integer index (it never moved on X).
            stopAnim();
            animationRef.current = animate(progress, currentIndex, {
                ...SPRING_SNAP,
                onComplete: () => {
                    animationRef.current = null;
                    for (const el of cardRefs.current) if (el) el.style.willChange = 'auto';
                },
            });
            setListOpen(true);
            return;
        }

        // px/ms → index/sec
        const velIndex = -velocityPxPerMsRef.current * 1000 / GAP;
        const clampedVel = Math.max(-MAX_VELOCITY_INDEX, Math.min(MAX_VELOCITY_INDEX, velIndex));
        const current = progress.get();

        // Combine current position with velocity projection (~120 ms ahead).
        const projection = current + clampedVel * VELOCITY_PROJECTION_SEC;
        let target = Math.round(projection);

        // If the user clearly flicked but didn't move far enough on its own,
        // force a one-step jump in the flick direction.
        if (
            Math.abs(clampedVel) > FLICK_VELOCITY_THRESHOLD &&
            target === Math.round(current)
        ) {
            target = Math.round(current) + (clampedVel > 0 ? 1 : -1);
        }
        target = Math.max(0, Math.min(items.length - 1, target));

        // ONE spring handles both "snap back" (no flick) and "fling forward"
        // (strong flick) — the same physics, just different `velocity`. This
        // is what makes the result feel buttery: there is no behavioural
        // branch the user can perceive, only a continuous response curve.
        stopAnim();
        animationRef.current = animate(progress, target, {
            ...SPRING_SNAP,
            velocity: clampedVel,
            onComplete: () => {
                animationRef.current = null;
                // Release GPU layer promotion — keeping `will-change` on
                // permanently is the #1 way to leak compositor memory.
                for (const el of cardRefs.current) if (el) el.style.willChange = 'auto';
            },
        });

        if (target !== currentIndex) {
            setCurrentIndex(target);
        }
    }, [GAP, items.length, currentIndex, progress, stopAnim]);

    const handlePointerCancel = useCallback(() => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setIsDragging(false);
        dragAxisRef.current = null;
        velocityPxPerMsRef.current = 0;
        stopAnim();
        animationRef.current = animate(progress, currentIndex, {
            ...SPRING_SNAP,
            onComplete: () => {
                animationRef.current = null;
                for (const el of cardRefs.current) if (el) el.style.willChange = 'auto';
            },
        });
    }, [currentIndex, progress, stopAnim]);

    const handleCardClick = useCallback((index: number) => {
        if (wasDraggedRef.current) return;
        if (isMobileViewport) {
            if (index !== currentIndex) {
                setCurrentIndex(index);
            } else {
                onSelect(items[index]);
            }
        } else {
            setCurrentIndex(index);
            onSelect(items[index]);
        }
    }, [currentIndex, items, onSelect, isMobileViewport]);

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
                            position: 'relative',
                            width: '100%',
                            maxWidth: isMobileViewport ? 404 : 420,
                            height: `${CARD_H}px`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            userSelect: 'none',
                            touchAction: 'none',
                            marginRight: isMobileViewport ? 0 : 4,
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
                            // Each card is rendered ONCE. All animation goes
                            // through `progress` → imperative DOM writes.
                            // No transition on transform (it's driven at 60+
                            // fps by the spring solver). Opacity/filter use
                            // a tiny ease so the post-settle blur fade looks
                            // soft instead of popping.
                            return (
                                <div
                                    key={item._uiId || item.id}
                                    ref={(el) => { cardRefs.current[i] = el; }}
                                    onClick={() => handleCardClick(i)}
                                    style={{
                                        position: 'absolute',
                                        width: CARD_W,
                                        height: CARD_H,
                                        cursor: 'pointer',
                                        // Will-change is toggled imperatively
                                        // ONLY during a gesture so we don't
                                        // hold GPU layers when idle.
                                        backfaceVisibility: 'hidden',
                                        transition: isDragging ? 'none' : 'opacity 220ms ease-out, filter 260ms ease-out',
                                    }}
                                >
                                    <div
                                        ref={(el) => { innerRefs.current[i] = el; }}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: 16,
                                            overflow: 'hidden',
                                            position: 'relative',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)',
                                            backfaceVisibility: 'hidden',
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: item.image_url
                                                ? `url(${item.image_url}) center/cover no-repeat`
                                                : getGradient(item.name),
                                        }}>
                                            <div style={{
                                                position: 'absolute', inset: 0,
                                                background: 'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)',
                                            }} />
                                        </div>

                                        <div
                                            ref={(el) => { contentRefs.current[i] = el; }}
                                            style={{
                                                position: 'absolute', top: 10, left: 0, right: 0, bottom: 10, padding: '0 14px',
                                                display: 'flex', flexDirection: 'column',
                                                transition: isDragging ? 'none' : 'opacity 220ms ease-out',
                                            }}
                                        >
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
                                        key={item._uiId || item.id}
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
                                            {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
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

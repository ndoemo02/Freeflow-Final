import React, { useCallback, useRef } from 'react';
import { SheetSnap } from '../components/sheet/sheetTypes';

interface IslandGesturesOptions {
    snap: SheetSnap;
    setSnap: (next: SheetSnap) => void;
    currentIndex: number;
    goTo: (index: number) => void;
    isExpanded: boolean;
    atTop: boolean;
}

export function useIslandGestures({
    snap,
    setSnap,
    currentIndex,
    goTo,
    isExpanded,
    atTop,
}: IslandGesturesOptions) {
    const swipeStartYRef = useRef<number | null>(null);
    const swipeStartAtRef = useRef(0);
    const lastWheelAtRef = useRef(0);
    const pointerStartYRef = useRef<number | null>(null);
    const pointerStartAtRef = useRef(0);

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
                goTo(currentIndex + (deltaY < 0 ? 1 : -1));
            }
            return;
        }

        if (deltaY < 0 && snap !== 'expanded') {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            setSnap('expanded');
            return;
        }

        if (deltaY > 0 && snap === 'expanded' && atTop) {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            setSnap('peek');
        }
    }, [atTop, currentIndex, goTo, setSnap, snap]);

    const handleSwipeStart = useCallback((event: React.TouchEvent<HTMLElement>) => {
        swipeStartYRef.current = event.touches[0]?.clientY ?? null;
        swipeStartAtRef.current = performance.now();
    }, []);

    const handleSwipeEnd = useCallback((event: React.TouchEvent<HTMLElement>) => {
        if (swipeStartYRef.current == null) return;
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

    const handlePeekWheel = useCallback((event: React.WheelEvent<HTMLElement>) => {
        if (isExpanded || Math.abs(event.deltaY) < 8) return;
        const now = performance.now();
        if (now - lastWheelAtRef.current < 90) return;
        event.stopPropagation();
        lastWheelAtRef.current = now;
        const direction = event.deltaY > 0 ? 1 : -1;
        const steps = Math.min(3, Math.max(1, Math.round(Math.abs(event.deltaY) / 120)));
        goTo(currentIndex + direction * steps);
    }, [currentIndex, goTo, isExpanded]);

    const handlePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'mouse') return;
        pointerStartYRef.current = event.clientY;
        pointerStartAtRef.current = performance.now();
    }, []);

    const handlePointerUp = useCallback((event: React.PointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'mouse' || pointerStartYRef.current == null) return;
        const deltaY = event.clientY - pointerStartYRef.current;
        const elapsed = Math.max(performance.now() - pointerStartAtRef.current, 16);
        const velocityY = (deltaY / elapsed) * 1000;
        pointerStartYRef.current = null;
        applyGesture(deltaY, velocityY, event);
    }, [applyGesture]);

    const handlePointerCancel = useCallback(() => {
        pointerStartYRef.current = null;
    }, []);

    return {
        handleSwipeStart,
        handleSwipeEnd,
        handlePeekWheel,
        handlePointerDown,
        handlePointerUp,
        handlePointerCancel,
    };
}

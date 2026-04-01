import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { clampSheetDragOffset, resolveSheetSnap } from './sheetPhysics';
import { BottomSheetRenderState, INITIAL_SHEET_BOUNDARY, SheetBoundaryState, SheetDragState, SheetSnap } from './sheetTypes';

interface BottomSheetContextValue extends BottomSheetRenderState {
    bindHandle: {
        onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
        onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
        onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
        onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
    };
    reportBoundary: (boundary: SheetBoundaryState) => void;
}

interface BottomSheetContainerProps {
    initialSnap?: SheetSnap;
    onSnapChange?: (next: SheetSnap) => void;
    className?: string;
    position?: 'left' | 'right';
    placementClassName?: string;
    snapClassNames?: Partial<Record<SheetSnap, string>>;
    lockScrollOn?: 'expanded' | 'open';
    children: React.ReactNode | ((state: BottomSheetRenderState) => React.ReactNode);
}

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

export function useBottomSheetContext() {
    const context = useContext(BottomSheetContext);

    if (!context) {
        throw new Error('BottomSheet components must be used inside BottomSheetContainer.');
    }

    return context;
}

export default function BottomSheetContainer({
    initialSnap = 'peek',
    onSnapChange,
    className = '',
    position = 'right',
    placementClassName,
    snapClassNames,
    lockScrollOn = 'expanded',
    children,
}: BottomSheetContainerProps) {
    const [snap, setSnapState] = useState<SheetSnap>(initialSnap);
    const [boundary, setBoundary] = useState<SheetBoundaryState>(INITIAL_SHEET_BOUNDARY);
    const [dragOffsetY, setDragOffsetY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const dragStateRef = useRef<SheetDragState | null>(null);

    const setSnap = useCallback((next: SheetSnap) => {
        setSnapState(next);
        onSnapChange?.(next);
    }, [onSnapChange]);

    useEffect(() => {
        const shouldLock = lockScrollOn === 'open' ? snap !== 'closed' : snap === 'expanded';
        if (!shouldLock) {
            return;
        }

        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;

        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';

        return () => {
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
        };
    }, [lockScrollOn, snap]);

    const finishDrag = useCallback(() => {
        const dragState = dragStateRef.current;

        if (!dragState) {
            return;
        }

        const elapsed = Math.max(performance.now() - dragState.startedAt, 16);
        const velocityY = ((dragState.lastY - dragState.startY) / elapsed) * 1000;
        const nextSnap = resolveSheetSnap(snap, dragState.deltaY, velocityY, boundary);

        dragStateRef.current = null;
        setIsDragging(false);
        setDragOffsetY(0);
        setSnap(nextSnap);
    }, [boundary, setSnap, snap]);

    const bindHandle = useMemo(() => ({
        onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
            if (event.button !== 0 && event.pointerType !== 'touch') {
                return;
            }

            event.currentTarget.setPointerCapture(event.pointerId);
            dragStateRef.current = {
                pointerId: event.pointerId,
                startY: event.clientY,
                lastY: event.clientY,
                deltaY: 0,
                startedAt: performance.now(),
            };
            setIsDragging(true);
        },
        onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
            const dragState = dragStateRef.current;

            if (!dragState || dragState.pointerId !== event.pointerId) {
                return;
            }

            const rawOffset = event.clientY - dragState.startY;
            const clampedOffset = clampSheetDragOffset(snap, rawOffset, boundary);

            dragState.lastY = event.clientY;
            dragState.deltaY = clampedOffset;
            setDragOffsetY(clampedOffset);
        },
        onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
            const dragState = dragStateRef.current;

            if (!dragState || dragState.pointerId !== event.pointerId) {
                return;
            }

            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }

            finishDrag();
        },
        onPointerCancel: (event: React.PointerEvent<HTMLElement>) => {
            const dragState = dragStateRef.current;

            if (!dragState || dragState.pointerId !== event.pointerId) {
                return;
            }

            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }

            finishDrag();
        },
    }), [boundary, finishDrag, snap]);

    const resolvedPlacementClassName = placementClassName || 'bottom-0';
    const resolvedSnapClassNames = {
        closed: 'contextual-island-sheet--closed',
        peek: 'contextual-island-sheet--peek',
        expanded: 'contextual-island-sheet--expanded island-expanded',
        ...snapClassNames,
    };
    const overflowClassName = snap === 'expanded' ? 'overflow-hidden' : 'overflow-visible';

    const renderState: BottomSheetRenderState = {
        snap,
        setSnap,
        boundary,
        isDragging,
        dragOffsetY,
    };

    const contextValue = useMemo<BottomSheetContextValue>(() => ({
        ...renderState,
        bindHandle,
        reportBoundary: setBoundary,
    }), [bindHandle, boundary, dragOffsetY, isDragging, setSnap, snap]);

    return (
        <BottomSheetContext.Provider value={contextValue}>
            <motion.div
                className={`contextual-island fixed left-0 right-0 ${resolvedPlacementClassName} z-10 ${className}`}
                data-position={position}
                initial={{ opacity: 0, y: 200, scale: 0.94 }}
                animate={{ opacity: snap === 'closed' ? 0 : 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 160, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            >
                <motion.div
                    className={`contextual-island-sheet relative flex min-h-0 flex-col ${overflowClassName} ${resolvedSnapClassNames[snap]}`}
                    layout
                    animate={{ y: dragOffsetY }}
                    transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 34 }}
                >
                    {typeof children === 'function' ? children(renderState) : children}
                </motion.div>
            </motion.div>
        </BottomSheetContext.Provider>
    );
}


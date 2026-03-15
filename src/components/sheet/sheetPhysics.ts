import { SheetBoundaryState, SheetSnap } from './sheetTypes';

const EXPAND_DISTANCE = 48;
const COLLAPSE_DISTANCE = 32;
const EXPAND_VELOCITY_THRESHOLD = 0.38;
const COLLAPSE_VELOCITY_THRESHOLD = 0.24;
const MAX_DRAG_OFFSET = 120;

export function clampSheetDragOffset(snap: SheetSnap, rawOffset: number, boundary: SheetBoundaryState) {
    if (snap === 'peek') {
        return Math.max(-MAX_DRAG_OFFSET, Math.min(0, rawOffset));
    }

    if (!boundary.atTop && rawOffset > 0) {
        return 0;
    }

    return Math.max(0, Math.min(MAX_DRAG_OFFSET, rawOffset));
}

export function resolveSheetSnap(
    snap: SheetSnap,
    dragOffsetY: number,
    velocityY: number,
    boundary: SheetBoundaryState,
): SheetSnap {
    if (snap === 'peek') {
        if (dragOffsetY <= -EXPAND_DISTANCE || velocityY <= -EXPAND_VELOCITY_THRESHOLD) {
            return 'expanded';
        }

        return 'peek';
    }

    if (!boundary.atTop) {
        return 'expanded';
    }

    if (dragOffsetY >= COLLAPSE_DISTANCE || velocityY >= COLLAPSE_VELOCITY_THRESHOLD) {
        return 'peek';
    }

    return 'expanded';
}

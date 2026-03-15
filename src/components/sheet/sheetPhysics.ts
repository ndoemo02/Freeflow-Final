import { SheetBoundaryState, SheetSnap } from './sheetTypes';

const PEEK_EXPAND_DISTANCE = 90;
const PEEK_EXPAND_VELOCITY = -900;
const EXPANDED_COLLAPSE_DISTANCE = 70;
const EXPANDED_COLLAPSE_VELOCITY = 800;
const MAX_DRAG_OFFSET = 140;

export function clampSheetDragOffset(snap: SheetSnap, rawOffset: number, boundary: SheetBoundaryState) {
    if (snap === 'closed') {
        return Math.max(-MAX_DRAG_OFFSET, Math.min(0, rawOffset));
    }

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
    if (snap === 'closed') {
        if (dragOffsetY <= -PEEK_EXPAND_DISTANCE || velocityY <= PEEK_EXPAND_VELOCITY) {
            return 'peek';
        }

        return 'closed';
    }

    if (snap === 'peek') {
        if (dragOffsetY <= -PEEK_EXPAND_DISTANCE || velocityY <= PEEK_EXPAND_VELOCITY) {
            return 'expanded';
        }

        return 'peek';
    }

    if (!boundary.atTop) {
        return 'expanded';
    }

    if (dragOffsetY >= EXPANDED_COLLAPSE_DISTANCE || velocityY >= EXPANDED_COLLAPSE_VELOCITY) {
        return 'peek';
    }

    return 'expanded';
}

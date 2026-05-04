import { SheetBoundaryState, SheetSnap } from './sheetTypes';

const CLOSED_TO_PEEK_DISTANCE = 80;
const PEEK_TO_EXPANDED_DISTANCE = 120;
const EXPANDED_TO_FULLSCREEN_DISTANCE = 80;
const EXPANDED_TO_PEEK_DISTANCE = 140;
const FULLSCREEN_TO_EXPANDED_DISTANCE = 100;
const PEEK_TO_CLOSED_DISTANCE = 90;
const VELOCITY_THRESHOLD = 450; // 0.45px/ms
const MAX_UP_DRAG = 220;
const MAX_DOWN_DRAG = 220;

const PEEK_POSITION_RATIO = 0.58;
const CLOSED_POSITION_RATIO = 0.72;

export function getSheetViewportSnapPositions(viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0) {
    return {
        peekPosition: viewportHeight * PEEK_POSITION_RATIO,
        closedPosition: viewportHeight * CLOSED_POSITION_RATIO,
    };
}

function resolveByDistance(snap: SheetSnap, dragOffsetY: number, boundary: SheetBoundaryState): SheetSnap {
    if (snap === 'closed') {
        return dragOffsetY <= -CLOSED_TO_PEEK_DISTANCE ? 'peek' : 'closed';
    }

    if (snap === 'peek') {
        if (dragOffsetY <= -PEEK_TO_EXPANDED_DISTANCE) {
            return 'expanded';
        }

        if (dragOffsetY >= PEEK_TO_CLOSED_DISTANCE) {
            return 'closed';
        }

        if (dragOffsetY < 0) {
            return Math.abs(dragOffsetY) >= PEEK_TO_EXPANDED_DISTANCE / 2 ? 'expanded' : 'peek';
        }

        if (dragOffsetY > 0) {
            return dragOffsetY >= PEEK_TO_CLOSED_DISTANCE / 2 ? 'closed' : 'peek';
        }

        return 'peek';
    }

    if (snap === 'fullscreen') {
        if (dragOffsetY >= FULLSCREEN_TO_EXPANDED_DISTANCE) {
            return 'expanded';
        }
        return dragOffsetY >= FULLSCREEN_TO_EXPANDED_DISTANCE / 2 ? 'expanded' : 'fullscreen';
    }

    if (!boundary.atTop) {
        return 'expanded';
    }

    if (dragOffsetY <= -EXPANDED_TO_FULLSCREEN_DISTANCE) {
        return 'fullscreen';
    }

    if (dragOffsetY >= EXPANDED_TO_PEEK_DISTANCE) {
        return 'peek';
    }

    if (dragOffsetY < 0) {
        return Math.abs(dragOffsetY) >= EXPANDED_TO_FULLSCREEN_DISTANCE / 2 ? 'fullscreen' : 'expanded';
    }

    return dragOffsetY >= EXPANDED_TO_PEEK_DISTANCE / 2 ? 'peek' : 'expanded';
}

export function clampSheetDragOffset(snap: SheetSnap, rawOffset: number, boundary: SheetBoundaryState) {
    // Fullscreen: block all drag when scrolled (let list scroll take priority)
    if (snap === 'fullscreen' && !boundary.atTop) {
        return 0;
    }

    // Fullscreen at top: only allow downward drag (pull to exit fullscreen), no upward bounce
    if (snap === 'fullscreen') {
        return Math.max(0, Math.min(MAX_DOWN_DRAG, rawOffset));
    }

    if (snap === 'expanded' && !boundary.atTop && rawOffset > 0) {
        return 0;
    }

    if (snap === 'expanded') {
        return Math.max(-MAX_UP_DRAG * 0.4, Math.min(MAX_DOWN_DRAG, rawOffset));
    }

    return Math.max(-MAX_UP_DRAG, Math.min(MAX_DOWN_DRAG, rawOffset));
}

export function resolveSheetSnap(
    snap: SheetSnap,
    dragOffsetY: number,
    velocityY: number,
    boundary: SheetBoundaryState,
): SheetSnap {
    if (velocityY <= -VELOCITY_THRESHOLD) {
        if (snap === 'closed') return 'peek';
        if (snap === 'peek') return 'expanded';
        if (snap === 'expanded') return 'fullscreen';
        return 'fullscreen';
    }

    if (velocityY >= VELOCITY_THRESHOLD) {
        if (snap === 'fullscreen') {
            return boundary.atTop ? 'expanded' : 'fullscreen';
        }
        if (snap === 'expanded') {
            return boundary.atTop ? 'peek' : 'expanded';
        }
        if (snap === 'peek') return 'closed';
        return 'closed';
    }

    return resolveByDistance(snap, dragOffsetY, boundary);
}

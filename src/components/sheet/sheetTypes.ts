export type SheetSnap = 'peek' | 'expanded';

export interface SheetBoundaryState {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    atTop: boolean;
    atBottom: boolean;
}

export interface SheetDragState {
    pointerId: number | null;
    startY: number;
    lastY: number;
    deltaY: number;
    startedAt: number;
}

export interface BottomSheetRenderState {
    snap: SheetSnap;
    setSnap: (next: SheetSnap) => void;
    boundary: SheetBoundaryState;
    isDragging: boolean;
    dragOffsetY: number;
}

export const INITIAL_SHEET_BOUNDARY: SheetBoundaryState = {
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    atTop: true,
    atBottom: true,
};

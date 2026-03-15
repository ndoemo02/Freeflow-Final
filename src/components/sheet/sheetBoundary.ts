import { SheetBoundaryState } from './sheetTypes';

export function readSheetBoundary(node: HTMLElement | null): SheetBoundaryState {
    if (!node) {
        return {
            scrollTop: 0,
            scrollHeight: 0,
            clientHeight: 0,
            atTop: true,
            atBottom: true,
        };
    }

    const scrollTop = node.scrollTop;
    const scrollHeight = node.scrollHeight;
    const clientHeight = node.clientHeight;

    return {
        scrollTop,
        scrollHeight,
        clientHeight,
        atTop: scrollTop <= 1,
        atBottom: scrollTop + clientHeight >= scrollHeight - 1,
    };
}

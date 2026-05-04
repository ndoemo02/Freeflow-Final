import { useEffect, useRef } from 'react';

/**
 * Shared ref-counted manager for the `island-full-list` CSS class on `.freeflow`.
 *
 * Multiple components (MenuFlowView, CinematicRestaurantCarousel,
 * RestaurantSheetContent) need to toggle this class independently.
 * A naive add/remove from each component causes a race: when component A
 * unmounts, its cleanup unconditionally removes the class even though
 * component B still expects it.
 *
 * This hook uses module-level reference counting so the class is only
 * removed when ALL registered callers have released it.
 */

let refCount = 0;

export function useIslandFullList(active: boolean) {
    const activeRef = useRef(active);

    useEffect(() => {
        const root = document.querySelector('.freeflow');
        if (!root) return;

        const wasActive = activeRef.current;
        activeRef.current = active;

        if (active && !wasActive) {
            refCount++;
            root.classList.add('island-full-list');
        } else if (!active && wasActive) {
            refCount--;
            if (refCount <= 0) {
                refCount = 0;
                root.classList.remove('island-full-list');
            }
        }

        return () => {
            // Only clean up if we haven't already handled the toggle in the effect body.
            // The effect body handles the case where `active` changes between renders.
            // The cleanup handles the unmount case.
            if (activeRef.current) {
                refCount--;
                if (refCount <= 0) {
                    refCount = 0;
                    root.classList.remove('island-full-list');
                }
                activeRef.current = false;
            }
        };
    }, [active]);
}

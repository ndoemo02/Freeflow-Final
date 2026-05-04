import React, { useCallback, useEffect } from 'react';
import { SheetSnap } from '../components/sheet/sheetTypes';

interface IslandStateMachineOptions {
    snap: SheetSnap;
    setSnap: (next: SheetSnap) => void;
}

interface IslandStateMachineResult {
    isExpanded: boolean;
    isTeaser: boolean;
    ctaLabel: string;
    handleCtaPress: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function useIslandStateMachine({ snap, setSnap }: IslandStateMachineOptions): IslandStateMachineResult {
    const isExpanded = snap === 'expanded';
    const isFullscreen = snap === 'fullscreen';
    const isTeaser = snap === 'closed';
    const ctaLabel = snap === 'closed' ? 'Wyspa' : snap === 'peek' ? 'Pelna lista' : snap === 'fullscreen' ? 'Zmniejsz' : 'Wyspa';

    const handleCtaPress = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (snap === 'closed') {
            setSnap('peek');
            return;
        }
        if (snap === 'peek') {
            setSnap('fullscreen');
            return;
        }
        if (snap === 'fullscreen') {
            setSnap('expanded');
            return;
        }
        setSnap('peek');
    }, [setSnap, snap]);

    useEffect(() => {
        const root = document.querySelector('.freeflow');
        if (!root) return;
        root.classList.toggle('island-full-list', isExpanded || isFullscreen);
        root.classList.toggle('island-fullscreen', isFullscreen);
        return () => {
            root.classList.remove('island-full-list');
            root.classList.remove('island-fullscreen');
        };
    }, [isExpanded, isFullscreen]);

    return { isExpanded, isTeaser, ctaLabel, handleCtaPress };
}

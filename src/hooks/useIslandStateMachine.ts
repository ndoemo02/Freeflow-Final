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
    const isTeaser = snap === 'closed';
    const ctaLabel = snap === 'closed' ? 'Wyspa' : snap === 'peek' ? 'Pelna lista' : 'Wyspa';

    const handleCtaPress = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (snap === 'closed') {
            setSnap('peek');
            return;
        }
        if (snap === 'peek') {
            setSnap('expanded');
            return;
        }
        setSnap('peek');
    }, [setSnap, snap]);

    useEffect(() => {
        const root = document.querySelector('.freeflow');
        if (!root) return;
        root.classList.toggle('island-full-list', isExpanded);
        return () => {
            root.classList.remove('island-full-list');
        };
    }, [isExpanded]);

    return { isExpanded, isTeaser, ctaLabel, handleCtaPress };
}

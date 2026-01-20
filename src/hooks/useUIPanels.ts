import { useState, useCallback } from 'react';
import { UIHints, PanelType } from '../types/uiHints';

export interface UseUIPanelsReturn {
    activePanel: PanelType;
    uiHints: UIHints;
    setHints: (hints: UIHints) => void;
    reset: () => void;
}

export function useUIPanels(): UseUIPanelsReturn {
    const [uiHints, setUiHints] = useState<UIHints>({ panel: 'none' });

    const setHints = useCallback((hints: UIHints) => {
        console.log("📺 useUIPanels: Setting hints", hints);
        setUiHints(hints);
    }, []);

    const reset = useCallback(() => {
        setUiHints({ panel: 'none' });
    }, []);

    return {
        activePanel: uiHints.panel,
        uiHints,
        setHints,
        reset
    };
}

import React from 'react';
import { useBottomSheetContext } from './BottomSheetContainer';

interface SheetHandleProps {
    className?: string;
    mode?: 'bar' | 'overlay' | 'surface';
}

export default function SheetHandle({ className = '', mode = 'bar' }: SheetHandleProps) {
    const { bindHandle } = useBottomSheetContext();
    const layoutClassName = mode === 'surface'
        ? 'absolute inset-0 z-0 cursor-grab touch-none select-none active:cursor-grabbing'
        : mode === 'overlay'
            ? 'absolute inset-x-0 top-0 z-20 flex min-h-[7rem] cursor-grab touch-none select-none items-start justify-center px-4 pb-8 pt-3 active:cursor-grabbing'
            : 'flex min-h-[2.75rem] cursor-grab touch-none select-none items-center justify-center px-4 py-3 active:cursor-grabbing';

    return (
        <div
            className={`${layoutClassName} ${className}`}
            {...bindHandle}
        >
            {mode === 'surface' ? null : <div className="h-1.5 w-12 rounded-full bg-white/18" />}
        </div>
    );
}

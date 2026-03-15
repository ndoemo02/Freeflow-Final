import React from 'react';
import { useBottomSheetContext } from './BottomSheetContainer';

interface SheetHandleProps {
    className?: string;
}

export default function SheetHandle({ className = '' }: SheetHandleProps) {
    const { bindHandle } = useBottomSheetContext();

    return (
        <div
            className={`flex cursor-grab touch-none items-center justify-center pt-2 active:cursor-grabbing ${className}`}
            {...bindHandle}
        >
            <div className="h-1.5 w-10 rounded-full bg-white/18" />
        </div>
    );
}

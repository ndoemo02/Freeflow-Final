import React, { useEffect, useRef } from 'react';
import { useBottomSheetContext } from './BottomSheetContainer';
import { readSheetBoundary } from './sheetBoundary';

interface SheetScrollableProps {
    children: React.ReactNode;
    className?: string;
}

export default function SheetScrollable({ children, className = '' }: SheetScrollableProps) {
    const { reportBoundary } = useBottomSheetContext();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        reportBoundary(readSheetBoundary(scrollRef.current));
    }, [reportBoundary]);

    return (
        <div
            ref={scrollRef}
            className={className}
            onScroll={() => reportBoundary(readSheetBoundary(scrollRef.current))}
            style={{
                overflowY: 'auto',
                touchAction: 'pan-y',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
            }}
        >
            {children}
        </div>
    );
}

import React, { useEffect, useRef } from 'react';
import { CSSProperties } from 'react';
import { useBottomSheetContext } from './BottomSheetContainer';
import { readSheetBoundary } from './sheetBoundary';

interface SheetScrollableProps {
    children: React.ReactNode;
    className?: string;
    style?: CSSProperties;
}

export default function SheetScrollable({ children, className = '', style }: SheetScrollableProps) {
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
                ...style,
            }}
        >
            {children}
        </div>
    );
}

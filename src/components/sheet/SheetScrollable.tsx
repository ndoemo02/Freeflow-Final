import React, { HTMLAttributes, useEffect, useRef } from 'react';
import { CSSProperties } from 'react';
import { useBottomSheetContext } from './BottomSheetContainer';
import { readSheetBoundary } from './sheetBoundary';

interface SheetScrollableProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'className'> {
    children: React.ReactNode;
    className?: string;
    style?: CSSProperties;
}

export default function SheetScrollable({ children, className = '', style, ...restProps }: SheetScrollableProps) {
    const { reportBoundary } = useBottomSheetContext();
    const scrollRef = useRef<HTMLDivElement>(null);
    const { onScroll, ...nativeProps } = restProps;

    useEffect(() => {
        reportBoundary(readSheetBoundary(scrollRef.current));
    }, [reportBoundary]);

    return (
        <div
            ref={scrollRef}
            className={className}
            onScroll={(event) => {
                reportBoundary(readSheetBoundary(scrollRef.current));
                onScroll?.(event);
            }}
            {...nativeProps}
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

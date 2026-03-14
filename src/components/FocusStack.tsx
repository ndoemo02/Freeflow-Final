import React, { ReactNode, useEffect, useMemo, useRef } from 'react';

export interface FocusStackItem {
    id: string;
    render: () => ReactNode;
}

interface FocusStackProps {
    items: FocusStackItem[];
    activeIndex: number;
    setActiveIndex: (index: number) => void;
    side?: 'left' | 'right';
    focusTop?: string;
    cardWidth?: string;
}

type DepthStyle = {
    y: number;
    scale: number;
    blur: number;
    opacity: number;
    z: number;
};

const DEPTH_MAP: Record<string, DepthStyle> = {
    '0': { y: 0, scale: 1, blur: 0, opacity: 1, z: 10 },
    '1': { y: 55, scale: 0.96, blur: 2, opacity: 0.9, z: 9 },
    '2': { y: 110, scale: 0.92, blur: 4, opacity: 0.6, z: 8 },
    '-1': { y: -55, scale: 0.96, blur: 2, opacity: 0.9, z: 9 },
    '-2': { y: -110, scale: 0.92, blur: 4, opacity: 0.6, z: 8 },
};

function getDepthStyle(position: number, focusTop: string, cardWidth: string): React.CSSProperties {
    const mapped = DEPTH_MAP[String(position)];
    const style = mapped || {
        y: position < 0 ? -150 : 150,
        scale: 0.88,
        blur: 6,
        opacity: 0,
        z: 1,
    };

    return {
        position: 'absolute',
        left: '50%',
        top: focusTop,
        width: cardWidth,
        transform: `translate(-50%, ${style.y}px) scale(${style.scale})`,
        transformOrigin: 'center center',
        filter: `blur(${style.blur}px)`,
        opacity: style.opacity,
        zIndex: style.z,
        transition: 'transform 0.35s ease, filter 0.35s ease, opacity 0.35s ease',
        pointerEvents: style.opacity === 0 ? 'none' : 'auto',
    };
}

export default function FocusStack({
    items,
    activeIndex,
    setActiveIndex,
    side = 'left',
    focusTop = '38%',
    cardWidth = '320px',
}: FocusStackProps) {
    const stackRef = useRef<HTMLDivElement | null>(null);
    const wheelLockRef = useRef(false);
    const clampedIndex = useMemo(
        () => Math.max(0, Math.min(items.length - 1, activeIndex)),
        [activeIndex, items.length]
    );

    useEffect(() => {
        if (!items.length) return;

        const element = stackRef.current;
        if (!element) return;

        let unlockTimer: number | null = null;

        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            event.stopPropagation();

            if (wheelLockRef.current) return;
            wheelLockRef.current = true;

            const nextIndex = event.deltaY > 0 ? clampedIndex + 1 : clampedIndex - 1;
            setActiveIndex(Math.max(0, Math.min(items.length - 1, nextIndex)));

            unlockTimer = window.setTimeout(() => {
                wheelLockRef.current = false;
            }, 200);
        };

        element.addEventListener('wheel', onWheel, { passive: false, capture: true });

        return () => {
            element.removeEventListener('wheel', onWheel, true);
            if (unlockTimer !== null) {
                window.clearTimeout(unlockTimer);
            }
            wheelLockRef.current = false;
        };
    }, [clampedIndex, items.length, setActiveIndex]);

    if (!items.length) return null;

    return (
        <div
            ref={stackRef}
            className={`focus-stack ${side}`}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'visible',
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)',
            }}
        >
            {items.map((item, index) => {
                const position = index - clampedIndex;

                return (
                    <div key={item.id} className="focus-card" style={getDepthStyle(position, focusTop, cardWidth)}>
                        {item.render()}
                    </div>
                );
            })}
        </div>
    );
}


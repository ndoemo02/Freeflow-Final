import React from 'react';

const MASK = 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 20%, rgba(0,0,0,0) 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,1) 100%)';

export function IslandBackdrop() {
    return (
        <div
            className="absolute -inset-x-2 -inset-y-3 z-[99] pointer-events-none"
            style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                WebkitMaskImage: MASK,
                maskImage: MASK,
            }}
        />
    );
}

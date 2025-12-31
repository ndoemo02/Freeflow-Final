import React from 'react';
import './AmberIndicator.css';

export type AmberStatusNode = 'idle' | 'listening' | 'thinking' | 'speaking' | 'presenting' | 'error' | 'ok';

interface AmberIndicatorProps {
    status: AmberStatusNode;
    className?: string;
}

export function AmberIndicator({ status, className = "" }: AmberIndicatorProps) {
    // The original container is w-14 h-14 (56px). The new orb is 200px.
    // Scale factor: 56 / 200 = 0.28.
    
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
             <div style={{ transform: 'scale(0.28)', transformOrigin: 'center' }}>
                <div className="orb-container">
                  <div className="orb">
                    <div className="orb-inner"></div>
                    <div className="orb-inner"></div>
                  </div>
                </div>
             </div>
        </div>
    );
}

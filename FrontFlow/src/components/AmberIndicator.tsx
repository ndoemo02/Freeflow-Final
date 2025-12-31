import React from 'react';

export type AmberStatusNode = 'idle' | 'listening' | 'thinking' | 'speaking' | 'presenting' | 'error' | 'ok';

interface AmberIndicatorProps {
    status: AmberStatusNode;
    className?: string;
}

export function AmberIndicator({ status, className = "" }: AmberIndicatorProps) {
    // Base orb styles
    const baseStyles = "rounded-full transition-all duration-500 ease-in-out relative";

    // Status-specific styles (colors, shadows, animations)
    const getStatusStyles = (s: AmberStatusNode) => {
        switch (s) {
            case 'listening':
                return "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110 animate-pulse";
            case 'thinking':
                return "bg-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.6)] animate-pulse";
            case 'speaking':
            case 'presenting':
            case 'ok':
                return "bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-100";
            case 'error':
                return "bg-purple-600 shadow-[0_0_20px_rgba(147,51,234,0.5)]";
            case 'idle':
            default:
                return "bg-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)] scale-90";
        }
    };

    return (
        <div className={`${baseStyles} ${getStatusStyles(status)} ${className}`}>
            {/* Optional inner core or ring for extra detail */}
            <div className="absolute inset-0 rounded-full bg-white/20 blur-sm" />
        </div>
    );
}

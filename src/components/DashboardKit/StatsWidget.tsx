import React from 'react';

interface StatsWidgetProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    className?: string;
}

export function StatsWidget({
    title,
    value,
    subtitle,
    icon,
    trend,
    trendValue,
    className = '',
}: StatsWidgetProps) {
    const trendColors = {
        up: 'text-green-400',
        down: 'text-red-400',
        neutral: 'text-slate-400',
    };

    const trendIcons = {
        up: '↑',
        down: '↓',
        neutral: '→',
    };

    return (
        <div
            className={`
        bg-slate-800 border border-slate-700 rounded-xl p-6
        hover:border-slate-600 transition-colors duration-200
        ${className}
      `}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                    {title}
                </span>
                {icon && (
                    <div className="text-slate-500 text-xl">
                        {icon}
                    </div>
                )}
            </div>

            {/* Value */}
            <div className="text-4xl font-bold text-white mb-2">
                {value}
            </div>

            {/* Subtitle & Trend */}
            <div className="flex items-center gap-2">
                {subtitle && (
                    <span className="text-slate-400 text-sm">{subtitle}</span>
                )}
                {trend && trendValue && (
                    <span className={`text-sm font-medium ${trendColors[trend]}`}>
                        {trendIcons[trend]} {trendValue}
                    </span>
                )}
            </div>
        </div>
    );
}

export default StatsWidget;

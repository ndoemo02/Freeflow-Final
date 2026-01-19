/**
 * StatCard - Reusable KPI stat card component
 * 
 * Displays a single KPI with:
 * - Icon
 * - Value
 * - Label
 * - Trend indicator (optional)
 */

import React from 'react';
import './StatCard.css';

export interface StatCardProps {
    icon: React.ReactNode;
    iconBgColor?: string;
    value: string | number;
    label: string;
    trend?: number; // positive = good (green), negative for "reverse" metrics like time
    trendReversed?: boolean; // If true, negative trend = good (for time metrics)
}

export default function StatCard({
    icon,
    iconBgColor = 'var(--neon)',
    value,
    label,
    trend,
    trendReversed = false,
}: StatCardProps) {
    // Determine trend display
    let trendClass = '';
    let trendIcon = '';

    if (trend !== undefined) {
        const isPositive = trendReversed ? trend < 0 : trend > 0;
        trendClass = isPositive ? 'stat-card__trend--positive' : 'stat-card__trend--negative';
        trendIcon = trend > 0 ? '↑' : '↓';
    }

    return (
        <div className="stat-card glass">
            <div className="stat-card__header">
                <div
                    className="stat-card__icon"
                    style={{ background: `${iconBgColor}20`, color: iconBgColor }}
                >
                    {icon}
                </div>
                {trend !== undefined && (
                    <span className={`stat-card__trend ${trendClass}`}>
                        {trendIcon} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <p className="stat-card__value">{value}</p>
            <p className="stat-card__label">{label}</p>
        </div>
    );
}

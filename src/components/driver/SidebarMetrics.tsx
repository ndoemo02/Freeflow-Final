import React from 'react';

interface MetricCardProps {
    label: string;
    value: string;
    subValue?: string;
    trend?: 'up' | 'down' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, subValue, trend }) => (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-1 shadow-lg">
        <span className="text-white/40 text-xs font-mono uppercase tracking-wider">{label}</span>
        <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white font-mono">{value}</span>
            {subValue && <span className="text-xs text-white/60 mb-1">{subValue}</span>}
        </div>
        {trend && (
            <div className={`text-xs flex items-center mt-1 ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
                {trend === 'up' ? '↑ Rising' : trend === 'down' ? '↓ Falling' : '→ Stable'}
            </div>
        )}
    </div>
);

export const SidebarMetrics: React.FC = () => {
    // Simulated data based on user request (menu_items_v2 style simulation)
    return (
        <div className="flex flex-col gap-4 w-full p-4">
            <h2 className="text-white/80 text-sm font-semibold mb-2 px-1">Performance</h2>

            <MetricCard
                label="Today's Earnings"
                value="$145.50"
                subValue="+12% vs avg"
                trend="up"
            />

            <MetricCard
                label="Zone Bonus"
                value="$15.00/hr"
                subValue="High Demand"
                trend="up"
            />

            <MetricCard
                label="Acceptance Rate"
                value="94%"
                trend="neutral"
            />

            <div className="mt-4 p-4 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-2xl">
                <div className="text-indigo-300 text-xs font-bold mb-1">PRO TIP</div>
                <p className="text-indigo-100/70 text-sm leading-relaxed">
                    Head towards <span className="text-white font-medium">Market Square</span>. Demand forecast shows +45% surge in 15 mins.
                </p>
            </div>
        </div>
    );
};

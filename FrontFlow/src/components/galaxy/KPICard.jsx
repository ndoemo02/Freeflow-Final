import GlassCard from './GlassCard';
import CountUp from './CountUp';

// Helper to convert icon names to kebab-case for Phosphor Icons
const toKebabCase = (str) => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export default function KPICard({ title, value, prefix = "", suffix = "", subtext, trend, icon, color = "purple" }) {
  const textColor = color === 'cyan' ? 'text-cyan-400' : color === 'pink' ? 'text-pink-400' : 'text-purple-400';
  const neonText = color === 'cyan' ? 'neon-text-cyan' : color === 'pink' ? 'neon-text-pink' : 'neon-text-purple';
  const iconClass = `ph-${toKebabCase(icon)}`;

  return (
    <GlassCard glowColor={color} className="relative overflow-hidden group">
      <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-${color}-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity`}></div>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
          <i className={`ph ${iconClass} text-2xl ${textColor}`}></i>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-${color}-500/10 border border-${color}-500/20 ${textColor}`}>
          {trend > 0 ? <i className="ph ph-trend-up"></i> : <i className="ph ph-trend-down"></i>}
          {Math.abs(trend)}%
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
        <div className={`text-3xl font-bold font-space ${neonText} tracking-tight`}>
          <CountUp end={value} prefix={prefix} suffix={suffix} />
        </div>
        <p className="text-gray-500 text-xs">{subtext}</p>
      </div>
    </GlassCard>
  );
}



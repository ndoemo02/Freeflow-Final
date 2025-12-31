export default function GlassCard({ children, className = "", glowColor = "purple", hoverEffect = true }) {
  const glowClass = glowColor === 'cyan' 
    ? 'hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]'
    : glowColor === 'pink'
    ? 'hover:border-pink-500/50 hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]'
    : 'hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]';

  return (
    <div className={`glass-panel rounded-2xl p-6 transition-all duration-300 ease-out shimmer-effect ${hoverEffect ? 'hover:-translate-y-1' : ''} ${glowClass} ${className}`}>
      {children}
    </div>
  );
}



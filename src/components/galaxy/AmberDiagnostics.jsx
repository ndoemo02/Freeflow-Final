import { useState, useEffect } from 'react';
import GlassCard from './GlassCard';

export default function AmberDiagnostics({ metrics: externalMetrics }) {
  const [metrics, setMetrics] = useState(
    externalMetrics || { cpu: 45, nlu: 98, sentiment: 85, latency: 120 }
  );

  useEffect(() => {
    if (externalMetrics) {
      setMetrics(externalMetrics);
      return;
    }

    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.min(100, Math.max(20, prev.cpu + (Math.random() * 10 - 5))),
        nlu: Math.min(100, Math.max(80, prev.nlu + (Math.random() * 4 - 2))),
        sentiment: Math.min(100, Math.max(40, prev.sentiment + (Math.random() * 10 - 5))),
        latency: Math.min(300, Math.max(50, prev.latency + (Math.random() * 40 - 20)))
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [externalMetrics]);

  const ProgressBar = ({ label, value, color, unit = '%' }) => (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-gray-400 font-space uppercase">{label}</span>
        <span className={`text-xs font-bold text-${color}-400`}>{Math.round(value)}{unit}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`bg-${color}-500 h-1.5 rounded-full shadow-[0_0_10px_currentColor] transition-all duration-1000 ease-out`}
          style={{ width: `${Math.min(100, value)}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <GlassCard glowColor="cyan" className="h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="neon-text-cyan font-bold text-lg flex items-center gap-2">
          <i className="ph ph-sparkle animate-pulse-glow"></i>
          AMBER AI DIAGNOSTICS
        </h3>
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
          ONLINE
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <ProgressBar label="Core Processing" value={metrics.cpu} color="cyan" />
        <ProgressBar label="NLU Confidence" value={metrics.nlu} color="purple" />
        <ProgressBar label="User Sentiment" value={metrics.sentiment} color="pink" />
        <ProgressBar label="Avg Latency" value={metrics.latency} color="blue" unit="ms" />
      </div>
      <div className="mt-6 p-3 rounded-lg bg-black/20 border border-white/5">
        <div className="text-xs text-gray-500 mb-2">LIVE TERMINAL</div>
        <div className="text-xs font-mono text-cyan-300/80 space-y-1 h-24 overflow-hidden">
          <div className="opacity-50">&gt; Initializing semantic analysis...</div>
          <div className="opacity-70">&gt; User intent: "Order Pizza" (99.8%)</div>
          <div className="opacity-90">&gt; Querying restaurant database...</div>
          <div className="animate-pulse">&gt; Optimization protocols active</div>
        </div>
      </div>
    </GlassCard>
  );
}



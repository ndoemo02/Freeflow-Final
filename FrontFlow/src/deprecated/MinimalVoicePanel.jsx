import { useMemo } from "react";

/**
 * MinimalVoicePanel
 * Props:
 * - mode: 'typing' | 'listening' | 'idle' -> controls color theme
 * - energy?: number in [0,1] to slightly modulate stroke glow (optional)
 */
export default function MinimalVoicePanel({ mode = 'idle', energy = 0 }) {
  const colors = useMemo(() => {
    // typing -> turquoise, listening -> orange, idle -> subtle cyan
    if (mode === 'listening') return { stroke: '#ff7e00' };
    if (mode === 'typing') return { stroke: '#00ffc8' };
    return { stroke: '#00ffc8' };
  }, [mode]);

  const dynamicStrokeWidth = 3 + Math.max(0, Math.min(1, energy)) * 2; // 3..5
  const dynamicShadow = 6 + Math.max(0, Math.min(1, energy)) * 12; // 6..18

  return (
    <div className="voice-panel">
      <svg className="electric-border" viewBox="0 0 400 140" style={{ stroke: colors.stroke, filter: `drop-shadow(0 0 ${dynamicShadow}px ${colors.stroke})`, strokeWidth: dynamicStrokeWidth }}>
        <rect x="5" y="5" width="390" height="130" rx="25" ry="25" />
      </svg>
      <div className="panel-content">
        <div className="input-placeholder">
          <span className="cursor"></span>
        </div>
      </div>
    </div>
  );
}















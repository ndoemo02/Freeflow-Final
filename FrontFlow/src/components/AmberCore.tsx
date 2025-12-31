type AmberStatus =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "presenting"
  | "error";

const STATUS = {
  idle: { color: "#00FFD1", freq: 0.006, scale: 6 },
  listening: { color: "#00FF88", freq: 0.01, scale: 10 },
  thinking: { color: "#FFD000", freq: 0.02, scale: 18 },
  speaking: { color: "#FF7A00", freq: 0.015, scale: 14 },
  presenting: { color: "#00C8FF", freq: 0.005, scale: 8 },
  error: { color: "#FF0033", freq: 0.04, scale: 30 },
};

export function AmberCore({ status, className }: { status: AmberStatus, className?: string }) {
  const s = STATUS[status];

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 200 200"
      style={{ display: "block" }}
      className={className}
    >
      <defs>
        <filter id="amber-energy">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={s.freq}
            numOctaves="2"
            seed="2"
          />
          <feDisplacementMap in="SourceGraphic" scale={s.scale} />
        </filter>
      </defs>

      <image
        href="/amber-logo.svg"
        x="0"
        y="0"
        width="200"
        height="200"
        filter="url(#amber-energy)"
        style={{ filter: `drop-shadow(0 0 12px ${s.color})` }}
      />
    </svg>
  );
}

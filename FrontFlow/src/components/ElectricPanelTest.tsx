import React, { useEffect, useRef } from "react";
import gsap from "gsap";

type Props = {
  width?: number;         // szerokość panelu (px)
  height?: number;        // wysokość panelu (px)
  radius?: number;        // zaokrąglenie rogów (px)
  speed?: number;         // szybkość falowania (1 = wolno, 2 = szybciej)
  intensity?: number;     // intensywność zniekształcenia (8–20)
};

const ElectricPanelTest: React.FC<Props> = ({
  width = 420,
  height = 140,
  radius = 24,
  speed = 1,
  intensity = 12,
}) => {
  const turbRef = useRef<SVGFETurbulenceElement | null>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const dashRef = useRef<SVGRectElement | null>(null);

  useEffect(() => {
    // Animacja "żywego prądu" — sinusoidalny flow (bez fajerwerków)
    const freq = { v: 0.006 }; // bazowa częstotliwość szumu
    const disp = { s: intensity };

    const tl = gsap.timeline({ repeat: -1, yoyo: true, ease: "sine.inOut" });
    tl.to(freq, {
      v: 0.012,
      duration: 2 / speed,
      onUpdate: () => {
        if (turbRef.current) {
          // proporcje X/Y dają naturalny "podwodny" ruch
          turbRef.current.setAttribute("baseFrequency", `${freq.v} ${freq.v * 1.7}`);
          // lekkie „życie" przez zmianę ziarna
          const seed = Math.floor((performance.now() / 400) % 1000);
          turbRef.current.setAttribute("seed", String(seed));
        }
      },
    }).to(disp, {
      s: Math.max(6, intensity - 4),
      duration: 2 / speed,
      onUpdate: () => {
        if (dispRef.current) dispRef.current.setAttribute("scale", String(disp.s));
      },
    }, "<");

    // Subtelny przesuw kreski na obrysie (elektryczna "migracja" ładunku)
    if (dashRef.current) {
      const len = (dashRef.current as any).getTotalLength
        ? (dashRef.current as any).getTotalLength()
        : (width + height) * 2;
      dashRef.current.style.strokeDasharray = `${len / 18} ${len / 8}`;
      gsap.to(dashRef.current, {
        strokeDashoffset: len,
        duration: 6 / speed,
        ease: "none",
        repeat: -1,
      });
    }

    return () => {
      tl.kill();
      gsap.killTweensOf(dashRef.current);
    };
  }, [speed, intensity, width, height]);

  const vbW = width + 20;   // padding na glow
  const vbH = height + 20;

  return (
    <div style={{
      width,
      height,
      margin: "20px auto",
      position: "relative",
      borderRadius: radius,
      overflow: "hidden",
      // tło testowe panelu – „glass"
      background: "rgba(10,10,12,0.55)",
      backdropFilter: "blur(16px) saturate(160%)",
      WebkitBackdropFilter: "blur(16px) saturate(160%)",
      boxShadow: "0 0 26px rgba(120,180,255,0.18)",
    }}>
      {/* SVG border + filter */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${vbW} ${vbH}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* NIEBIESKA PALETA (Blue/Turquoise) */}
          <linearGradient id="blueStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A6E3FF" />
            <stop offset="50%" stopColor="#60C7FF" />
            <stop offset="100%" stopColor="#35B6FF" />
          </linearGradient>

          {/* Miękki glow pod obrysem */}
          <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* ORGANICZNY PRĄD – displacement na bazie turbulencji */}
          <filter id="electric" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.006 0.010"
              numOctaves="2"
              seed="3"
              result="noise"
            />
            {/* delikatne wygładzenie „wody" */}
            <feGaussianBlur stdDeviation="0.6" in="noise" result="noiseBlur" />
            {/* deformuj obrys/poświatę */}
            <feDisplacementMap
              ref={dispRef}
              in="SourceGraphic"
              in2="noiseBlur"
              scale={intensity}
              xChannelSelector="R"
              yChannelSelector="G"
              result="distort"
            />
            {/* lekkie przyciemnienie poza obszarem */}
            <feColorMatrix in="distort" type="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 1 0
              "
              result="colored"
            />
          </filter>
        </defs>

        {/* Glow pod spodem (rozmyty, filtrowany) */}
        <rect
          x={10}
          y={10}
          rx={radius}
          ry={radius}
          width={width}
          height={height}
          fill="none"
          stroke="url(#blueStroke)"
          strokeWidth="8"
          opacity="0.45"
          filter="url(#electric)"
        />

        {/* Właściwy obrys (czysty + „prądowy" dash offset) */}
        <rect
          ref={dashRef}
          x={10}
          y={10}
          rx={radius}
          ry={radius}
          width={width}
          height={height}
          fill="none"
          stroke="url(#blueStroke)"
          strokeWidth="2.5"
          filter="url(#softGlow)"
        />
      </svg>

      {/* TESTOWA zawartość panelu: migający kursor (do „pisania") */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        color: "rgba(230,240,255,0.85)",
        letterSpacing: "0.4px",
        fontSize: 16
      }}>
        <span style={{ opacity: 0.7 }}>Wpisz wiadomość</span>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 20,
            marginLeft: 6,
            borderRadius: 2,
            background: "linear-gradient(180deg, #CFEAFF, #60C7FF)",
            boxShadow: "0 0 10px rgba(96,199,255,0.55)",
            animation: "blink 1.1s infinite",
          }}
        />
      </div>

      {/* Keyframes lokalnie */}
      <style>{`
        @keyframes blink {
          0%,49% { opacity: 1; }
          50%,100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ElectricPanelTest;













// Plik: LogoAnimated.jsx

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import "./logo.css"; // Importujemy style

// Import SVG jako raw text (Vite)
import svgUrl from "./FreeflowLogo.svg?url";

export default function LogoAnimated({
  size = 420,
  state = "idle",
  micReactive = true,
}) {
  const wrapRef = useRef(null);
  const svgContainerRef = useRef(null);
  const micRef = useRef(null);
  const textRef = useRef(null);
  const iconsRef = useRef(null);
  const glowRef = useRef(null);
  const dripRef = useRef(null); // <-- DODANE dla kropli

  const [amp, setAmp] = useState(0);
  const [svgLoaded, setSvgLoaded] = useState(false);

  // Wczytaj SVG jako inline
  useEffect(() => {
    const loadSVG = async () => {
      try {
        const response = await fetch(svgUrl);
        const svgText = await response.text();
        if (svgContainerRef.current) {
          svgContainerRef.current.innerHTML = svgText;

          // Ustaw preserveAspectRatio na SVG
          const svg = svgContainerRef.current.querySelector('svg');
          if (svg) {
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svg.style.width = '100%';
            svg.style.height = '100%';
          }

          setSvgLoaded(true);
          console.log('✅ SVG loaded successfully');
        }
      } catch (error) {
        console.error('❌ Failed to load SVG:', error);
      }
    };
    loadSVG();
  }, []);

  // Opcjonalne: Nasłuch mikrofonu
  useEffect(() => {
    if (!micReactive) return;
    let ctx, analyser, src, data, raf;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        data = new Uint8Array(analyser.frequencyBinCount);
        src = ctx.createMediaStreamSource(stream);
        src.connect(analyser);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setAmp(Math.min(avg / 140, 1)); // Normalizacja 0..1
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        console.warn("Mikrofon zablokowany lub niedostępny:", e);
      }
    })();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (ctx) ctx.close();
    };
  }, [micReactive]);

  // Mapy kolorów i prędkości dla różnych stanów
  const palette = {
    idle: { hueMic: 28, hueText: 28, hueGlow: 28, hueIcons: 190, speed: 2.8 },
    listening: { hueMic: 32, hueText: 28, hueGlow: 28, hueIcons: 32, speed: 2.2 },
    thinking: { hueMic: 200, hueText: 210, hueGlow: 210, hueIcons: 210, speed: 1.8 },
    speaking: { hueMic: 190, hueText: 190, hueGlow: 190, hueIcons: 28, speed: 0.9 },
  };
  const cfg = palette[state] ?? palette.idle;

  // Główna animacja: różne rytmy + contra-puls + kapanie
  useEffect(() => {
    if (!svgLoaded || !svgContainerRef.current) return;

    // Opóźnienie 100ms aby SVG się w pełni załadował w DOM
    const timer = setTimeout(() => {
      const root = svgContainerRef.current;
      if (!root) return;

      // Znajdź warstwy po ID
      const mic = root.querySelector("#mic");
      const text = root.querySelector("#text");
      const icons = root.querySelector("#icons");
      const glow = root.querySelector("#glow");
      const drip = root.querySelector("#drip"); // <-- DODANE

      console.log('🔍 querySelector results:', { mic, text, icons, glow, drip });

      // Jeśli nie znaleziono elementów, spróbuj szukać w SVG
      if (!mic || !text || !icons || !glow) {
        const svg = root.querySelector('svg');
        console.log('🔍 SVG element:', svg);
        if (svg) {
          console.log('🔍 SVG innerHTML length:', svg.innerHTML.length);
        }
        return; // Nie uruchamiaj animacji jeśli nie ma elementów
      }

      // Przypisz do refów
      micRef.current = mic;
      textRef.current = text;
      iconsRef.current = icons;
      glowRef.current = glow;
      dripRef.current = drip; // <-- DODANE

    // Ubij stare animacje
    gsap.killTweensOf([mic, text, icons, glow, drip]); // <-- DODANE 'drip'

    // Definicje "sprężyn"
    const micScale = state === "speaking" ? 1.08 : 1.04;
    const textScale = state === "speaking" ? 1.03 : 1.015;
    const iconsScale = state === "speaking" ? 1.05 : 1.02;
    const glowScale = state === "speaking" ? 0.94 : 0.97; // KONTRA-PULS

    const speedMic = cfg.speed;
    const speedText = cfg.speed * 1.15;
    const speedIcons = cfg.speed * 0.9;
    const speedGlow = cfg.speed * 1.05;

    // MIC – główna sprężyna
    if (mic)
      gsap.to(mic, {
        transformOrigin: "50% 50%",
        scale: micScale,
        duration: speedMic,
        ease: "elastic.out(1, 0.45)",
        repeat: -1,
        yoyo: true,
      });

    // TEXT – wolniejszy oddech
    if (text)
      gsap.to(text, {
        transformOrigin: "50% 50%",
        scale: textScale,
        duration: speedText,
        ease: "elastic.out(1, 0.5)",
        repeat: -1,
        yoyo: true,
      });

    // ICONS – impulsy
    if (icons)
      gsap.to(icons, {
        transformOrigin: "50% 50%",
        scale: iconsScale,
        opacity: state === "speaking" ? 1 : 0.9,
        duration: speedIcons,
        ease: "elastic.out(1, 0.4)",
        repeat: -1,
        yoyo: true,
      });

    // GLOW – kontra do rdzenia
    if (glow)
      gsap.to(glow, {
        transformOrigin: "50% 50%",
        scale: glowScale,
        duration: speedGlow,
        ease: "elastic.inOut(1, 0.55)",
        repeat: -1,
        yoyo: true,
      });

    // ===================================
    // <-- POCZĄTEK: ANIMACJA KAPANIA -->
    // ===================================
    if (drip) {
      gsap.set(drip, { transformOrigin: "50% 0%" }); // Punkt obrotu na górze kropli

      const dripTL = gsap.timeline({
        repeat: -1,
        repeatDelay: 2.5, // Czekaj 2.5s między kapaniami
      });

      dripTL.fromTo(
        drip,
        {
          // STAN POCZĄTKOWY (na górze)
          y: 0,
          scaleY: 1,
          opacity: 1,
        },
        {
          // STAN KOŃCOWY (na dole)
          y: 60, // Jak daleko ma kapać (dostosuj do swojego SVG)
          scaleY: 1.6, // Rozciąganie
          opacity: 0, // Znika
          duration: 1.8,
          ease: "power2.in", // Przyspieszenie
        }
      );
    }
    // ===================================
    // <-- KONIEC: ANIMACJA KAPANIA -->
    // ===================================

    // Flash synchronizacji (opcjonalne)
    if (glow) {
      const flash = gsap.timeline({ repeat: -1, repeatDelay: 3.6 });
      flash
        .to(glow, {
          filter: "brightness(1.2)",
          duration: 0.25,
          ease: "power3.out",
        })
        .to(glow, {
          filter: "brightness(1)",
          duration: 0.5,
          ease: "power2.in",
        });
    }
    }, 100); // Opóźnienie 100ms

    return () => clearTimeout(timer);
  }, [state, svgLoaded]); // Przeładowuje przy zmianie stanu lub załadowaniu SVG

  // Reakcja na amplitudę (głośność)
  useEffect(() => {
    if (
      !micRef.current ||
      !glowRef.current ||
      !textRef.current ||
      !iconsRef.current ||
      !dripRef.current // <-- DODANE
    )
      return;

    const micBlur = 6 + amp * 10;
    const txtBlur = 4 + amp * 8;
    const icnBlur = 4 + amp * 6;
    const glwBlur = 12 + amp * 16;
    const dripBlur = 4 + amp * 6; // <-- DODANE

    const micCol = `hsl(${cfg.hueMic} 100% 60%)`;
    const txtCol = `hsl(${cfg.hueText} 100% 60%)`;
    const icnCol = `hsl(${cfg.hueIcons} 100% 60%)`;
    const glwCol = `hsl(${cfg.hueGlow} 100% 60%)`;
    const dripCol = `hsl(${cfg.hueGlow} 100% 70%)`; // <-- DODANE

    // Używamy filtrów CSS (drop-shadow) zamiast gradientów dla lepszej wydajności
    gsap.to(micRef.current, {
      filter: `drop-shadow(0 0 ${micBlur}px ${micCol})`,
      duration: 0.18,
      ease: "power2.out",
    });
    gsap.to(textRef.current, {
      filter: `drop-shadow(0 0 ${txtBlur}px ${txtCol})`,
      duration: 0.18,
      ease: "power2.out",
    });
    gsap.to(iconsRef.current, {
      filter: `drop-shadow(0 0 ${icnBlur}px ${icnCol})`,
      duration: 0.18,
      ease: "power2.out",
    });
    gsap.to(glowRef.current, {
      filter: `blur(${glwBlur}px) brightness(${1 + amp * 0.9})`,
      duration: 0.18,
      ease: "power2.out",
    });
    gsap.to(dripRef.current, { // <-- DODANE
      filter: `drop-shadow(0 0 ${dripBlur}px ${dripCol})`,
      duration: 0.18,
      ease: "power2.out",
    });
  }, [amp, cfg]);

  return (
    <div
      ref={wrapRef}
      className="ff-wrap"
      style={{ width: size, height: size }}
    >
      {/* SVG Container - wczytany inline przez fetch */}
      <div
        ref={svgContainerRef}
        className="ff-svg-container"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
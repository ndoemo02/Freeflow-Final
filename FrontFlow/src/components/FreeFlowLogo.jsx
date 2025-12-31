import { motion, useAnimation } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import logoPng from "../assets/Freeflowlogo.png";

/**
 * FreeFlowLogo - Animowany komponent logo z obsługą stanów głosowych
 * 
 * @param {Object} props
 * @param {'idle' | 'listening' | 'speaking' | 'off'} props.state - Stan animacji
 * @param {number} props.size - Rozmiar logo w px (default: 420)
 * @param {boolean} props.micReactive - Czy reagować na mikrofon (default: false)
 * @param {Function} props.onClick - Callback po kliknięciu
 * @param {string} props.className - Dodatkowe klasy CSS
 * 
 * @example
 * <FreeFlowLogo state="listening" size={460} onClick={handleClick} />
 */
export default function FreeFlowLogo({ 
  state = "idle", 
  size = 420, 
  micReactive = false,
  onClick,
  className = ""
}) {
  const controls = useAnimation();
  const glowControls = useAnimation();
  const [amplitude, setAmplitude] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Konfiguracja kolorów dla różnych stanów
  const stateConfig = {
    idle: {
      color: "#FF8A32", // Orange
      glowColor: "rgba(255, 138, 50, 0.4)",
      scale: 1,
      glowScale: 1,
      speed: 2.5,
      pulseIntensity: 0.03
    },
    listening: {
      color: "#00E0FF", // Cyan
      glowColor: "rgba(0, 224, 255, 0.6)",
      scale: 1.05,
      glowScale: 1.15,
      speed: 1.5,
      pulseIntensity: 0.08
    },
    speaking: {
      color: "#A855F7", // Purple
      glowColor: "rgba(168, 85, 247, 0.7)",
      scale: 1.08,
      glowScale: 1.2,
      speed: 1.2,
      pulseIntensity: 0.12
    },
    off: {
      color: "#64748B", // Slate
      glowColor: "rgba(100, 116, 139, 0.2)",
      scale: 0.95,
      glowScale: 0.8,
      speed: 3,
      pulseIntensity: 0.01
    }
  };

  const config = stateConfig[state] || stateConfig.idle;

  // Mic Reactive - Analiza audio z mikrofonu
  useEffect(() => {
    if (!micReactive || state !== 'listening') {
      setAmplitude(0);
      return;
    }

    let mounted = true;

    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        source.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateAmplitude = () => {
          if (!mounted) return;
          
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalized = Math.min(average / 128, 1);
          
          setAmplitude(normalized);
          animationFrameRef.current = requestAnimationFrame(updateAmplitude);
        };

        updateAmplitude();
      } catch (error) {
        console.warn('Microphone access denied:', error);
      }
    };

    setupAudio();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [micReactive, state]);

  // Główna animacja pulsowania
  useEffect(() => {
    const baseScale = config.scale;
    const pulseAmount = config.pulseIntensity;
    const micBoost = micReactive ? amplitude * 0.15 : 0;

    controls.start({
      scale: [baseScale, baseScale + pulseAmount + micBoost, baseScale],
      transition: {
        duration: config.speed,
        repeat: Infinity,
        ease: "easeInOut"
      }
    });

    // Contra-pulse dla glow (odwrotnie do głównego logo)
    glowControls.start({
      scale: [config.glowScale, config.glowScale - pulseAmount * 0.5, config.glowScale],
      opacity: [0.6, 0.8 + amplitude * 0.3, 0.6],
      transition: {
        duration: config.speed * 1.1,
        repeat: Infinity,
        ease: "easeInOut"
      }
    });
  }, [state, amplitude, config, controls, glowControls, micReactive]);

  // Animacja wejścia przy zmianie stanu
  useEffect(() => {
    controls.start({
      scale: config.scale,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15
      }
    });
  }, [state, config.scale, controls]);

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `FreeFlow logo - ${state}` : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Glow Layer - Zewnętrzna poświata w kształcie logo */}
      <motion.div
        animate={glowControls}
        className="absolute inset-0 blur-3xl"
        style={{
          background: `radial-gradient(ellipse 50% 60% at 50% 40%, ${config.glowColor} 0%, transparent 70%)`,
          filter: `blur(${40 + amplitude * 30}px)`,
          clipPath: 'ellipse(45% 55% at 50% 45%)',
        }}
      />

      {/* Fale zostaną dodane później jako gotowy SVG */}

      {/* Main Logo PNG z pulsowaniem podczas nasłuchiwania */}
      <motion.div
        animate={{
          ...controls,
          scale: state === 'listening' ? [1, 1.05, 1] : 1,
        }}
        transition={{
          scale: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        className="relative z-10 w-full h-full flex items-center justify-center"
        style={{
          filter: `drop-shadow(0 0 ${20 + amplitude * 40}px ${config.color}) brightness(${1 + amplitude * 0.3})`,
        }}
      >
        <img
          src={logoPng}
          alt="FreeFlow Logo"
          className="w-full h-full object-contain select-none"
          draggable={false}
        />
      </motion.div>

      {/* Amplitude Indicator (tylko dla micReactive) */}
      {micReactive && state === 'listening' && amplitude > 0.1 && (
        <motion.div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full"
              style={{
                height: `${8 + i * 4}px`,
                backgroundColor: config.color,
              }}
              animate={{
                scaleY: amplitude > (i * 0.2) ? [1, 1.5, 1] : 0.3,
                opacity: amplitude > (i * 0.2) ? 1 : 0.3,
              }}
              transition={{
                duration: 0.3,
                repeat: Infinity,
                delay: i * 0.05
              }}
            />
          ))}
        </motion.div>
      )}

      {/* State Label (opcjonalnie - dla debugowania) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-white/50 font-mono">
          {state} {micReactive && `| amp: ${amplitude.toFixed(2)}`}
        </div>
      )}
    </div>
  );
}


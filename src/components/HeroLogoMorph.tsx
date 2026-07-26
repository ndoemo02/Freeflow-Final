import { motion, useReducedMotion } from 'framer-motion';
import { getLogoMotionPlan, LogoScenePhase } from '../lib/logoSceneContract';

interface HeroLogoMorphProps {
  phase: LogoScenePhase;
  active?: boolean;
  onClick?: () => void;
  label?: string;
}

export default function HeroLogoMorph({
  phase,
  active = false,
  onClick,
  label = 'Uruchom mikrofon',
}: HeroLogoMorphProps) {
  const reduceMotion = useReducedMotion();
  const motionPlan = getLogoMotionPlan(phase, !!reduceMotion);

  const intentMotion = phase === 'intent' && !reduceMotion
    ? { x: [0, motionPlan.wobblePx, -Math.max(1, motionPlan.wobblePx - 1), 0], scaleY: [1, 0.97, 1], scaleX: [1, 1.018, 1] }
    : { x: 0, scaleY: 1, scaleX: 1 };

  return (
    <motion.div
      className="hero-logo-morph-source"
      data-logo-phase={phase}
      data-logo-visible={motionPlan.visible ? 'true' : 'false'}
      initial={false}
      animate={{
        opacity: motionPlan.visible ? 1 : 0,
        scale: motionPlan.visible ? 1 : 0.88,
        y: motionPlan.visible ? 0 : -24,
      }}
      transition={{ duration: motionPlan.transitionMs / 1000, ease: [0.22, 1, 0.36, 1] }}
      style={{ pointerEvents: motionPlan.visible ? 'auto' : 'none' }}
      aria-hidden={!motionPlan.visible}
    >
      <button
        type="button"
        onClick={onClick}
        className="hero-logo-morph"
        data-logo-phase={phase}
        data-logo-active={active ? 'true' : 'false'}
        aria-label={label}
        tabIndex={motionPlan.visible ? 0 : -1}
      >
        <motion.span
          className="hero-logo-morph__squash"
          animate={intentMotion}
          transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.4, 0, 0.2, 1] }}
        >
          <img
            src="/logo/logoglosnik.png"
            alt="FreeFlow"
            className="logo hero-logo-morph__image hero-logo-morph__shell"
            draggable={false}
          />
          <svg className="hero-logo-morph__overlay" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <defs>
              <filter id="hero-logo-soft-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="hero-logo-edge" x1="18" y1="24" x2="84" y2="86" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22d3ee" />
                <stop offset="0.52" stopColor="#ff7a1c" />
                <stop offset="1" stopColor="#ff4f0a" />
              </linearGradient>
            </defs>
            <motion.path
              className="hero-logo-morph__edge"
              d="M50 5 C72 5 88 20 88 42 C88 62 77 76 63 84 C55 89 55 96 50 97 C45 96 45 89 37 84 C23 76 12 62 12 42 C12 20 28 5 50 5 Z"
              pathLength={1}
              animate={active && !reduceMotion ? { opacity: [0.26, 0.46, 0.3], strokeDashoffset: [0.08, 0] } : { opacity: 0.26, strokeDashoffset: 0 }}
              transition={{ duration: 2.4, repeat: active && !reduceMotion ? Infinity : 0, ease: 'easeInOut' }}
            />
            <motion.g
              className="hero-logo-morph__waves"
              filter="url(#hero-logo-soft-glow)"
              animate={active && !reduceMotion ? { opacity: [0.24, 0.46, 0.28] } : { opacity: 0.22 }}
              transition={{ duration: 2.5, repeat: active && !reduceMotion ? Infinity : 0, ease: 'easeInOut' }}
            >
              <path d="M28 31 C38 23 52 22 63 30" />
              <path d="M23 38 C38 25 60 25 75 39" />
              <path d="M20 47 C39 29 64 29 82 49" />
            </motion.g>
          </svg>
          {active && !reduceMotion && <span className="hero-logo-morph__live-pulse" aria-hidden="true" />}
        </motion.span>
      </button>
    </motion.div>
  );
}

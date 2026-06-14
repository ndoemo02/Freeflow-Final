import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { getLogoMotionPlan, LogoScenePhase } from '../lib/logoSceneContract';

interface HeroLogoMorphProps {
  phase: LogoScenePhase;
  active?: boolean;
  onClick?: () => void;
  label?: string;
}

interface LogoFrameBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

function rectToBox(rect: DOMRect, offsetRect?: DOMRect): LogoFrameBox {
  const offsetLeft = offsetRect ? offsetRect.left : 0;
  const offsetTop = offsetRect ? offsetRect.top : 0;

  return {
    left: Math.round(rect.left - offsetLeft),
    top: Math.round(rect.top - offsetTop),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function measureFrameBox(source: HTMLElement | null, target: HTMLElement | null, isCompact: boolean): LogoFrameBox | null {
  if (!source) return null;
  const sourceRect = source.getBoundingClientRect();
  const offsetParentRect = source.offsetParent?.getBoundingClientRect();
  if (!sourceRect.width || !sourceRect.height) return null;
  if (!isCompact || !target) return rectToBox(sourceRect, offsetParentRect);

  const targetRect = target.getBoundingClientRect();
  if (!targetRect.width || !targetRect.height) return rectToBox(sourceRect, offsetParentRect);
  return rectToBox(targetRect, offsetParentRect);
}

export default function HeroLogoMorph({
  phase,
  active = false,
  onClick,
  label = 'Uruchom mikrofon',
}: HeroLogoMorphProps) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [frameBox, setFrameBox] = useState<LogoFrameBox | null>(null);
  const isCompact = phase !== 'idle';
  const motionPlan = getLogoMotionPlan(phase, !!reduceMotion);

  const recalcTransform = useCallback(() => {
    const target = document.querySelector('[data-ui-role="header-logo-target"]') as HTMLElement | null;
    const nextBox = measureFrameBox(sourceRef.current, target, isCompact);
    if (!nextBox) return;

    setFrameBox((currentBox) => (
      currentBox
      && currentBox.left === nextBox.left
      && currentBox.top === nextBox.top
      && currentBox.width === nextBox.width
      && currentBox.height === nextBox.height
        ? currentBox
        : nextBox
    ));
  }, [isCompact]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    recalcTransform();
    const raf = window.requestAnimationFrame(recalcTransform);
    const target = document.querySelector('[data-ui-role="header-logo-target"]') as HTMLElement | null;
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(recalcTransform)
      : null;
    if (resizeObserver) {
      if (sourceRef.current) resizeObserver.observe(sourceRef.current);
      if (target) resizeObserver.observe(target);
    }
    window.addEventListener('resize', recalcTransform);
    window.visualViewport?.addEventListener('resize', recalcTransform);
    window.visualViewport?.addEventListener('scroll', recalcTransform);

    return () => {
      window.cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', recalcTransform);
      window.visualViewport?.removeEventListener('resize', recalcTransform);
      window.visualViewport?.removeEventListener('scroll', recalcTransform);
    };
  }, [recalcTransform, phase]);

  const animate = useMemo(() => {
    if (!frameBox) return null;
    return frameBox;
  }, [frameBox]);

  const squashAnimate = useMemo(() => {
    const base = { x: 0, scaleY: 1, scaleX: 1 };
    if (phase !== 'intent' || reduceMotion) return base;

    const wobble = motionPlan.wobblePx;
    return {
      x: wobble > 0 ? [0, wobble, -Math.max(1, wobble - 1), 1, 0] : 0,
      scaleY: [1, 0.96, 1],
      scaleX: [1, 1.025, 1],
    };
  }, [motionPlan.wobblePx, phase, reduceMotion]);

  const frameStyle = useMemo<React.CSSProperties>(() => ({
    position: animate ? 'fixed' : 'relative',
    left: animate ? `${animate.left}px` : undefined,
    top: animate ? `${animate.top}px` : undefined,
    width: animate ? `${animate.width}px` : '100%',
    height: animate ? `${animate.height}px` : '100%',
    transition: 'none',
  }), [animate]);

  return (
    <div ref={sourceRef} className="hero-logo-morph-source" data-logo-phase={phase}>
      <div
        className="hero-logo-morph-frame"
        style={frameStyle}
      >
      <button
        type="button"
        onClick={onClick}
        className="hero-logo-morph"
        data-logo-phase={phase}
        data-logo-active={active ? 'true' : 'false'}
        aria-label={label}
      >
        <motion.span
          className="hero-logo-morph__squash"
          animate={squashAnimate}
          transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
        >
          <img
            src="/logo/logo-shell-base-clean.png"
            alt="FreeFlow"
            className="logo hero-logo-morph__image hero-logo-morph__shell"
            draggable={false}
          />
          <img
            src="/logo/layers/logo-waves.svg"
            alt=""
            className="hero-logo-morph__asset hero-logo-morph__asset--waves"
            draggable={false}
            aria-hidden="true"
          />
          <img
            src="/logo/layers/logo-speaker.png"
            alt=""
            className="hero-logo-morph__asset hero-logo-morph__asset--speaker"
            draggable={false}
            aria-hidden="true"
          />
          <img
            src="/logo/layers/logo-wordmark.svg"
            alt=""
            className="hero-logo-morph__asset hero-logo-morph__asset--wordmark"
            draggable={false}
            aria-hidden="true"
          />
          <img
            src="/logo/layers/logo-icon-food.svg"
            alt=""
            className="hero-logo-morph__asset hero-logo-morph__asset--icon hero-logo-morph__asset--food"
            draggable={false}
            aria-hidden="true"
          />
          <img
            src="/logo/layers/logo-icon-car.svg"
            alt=""
            className="hero-logo-morph__asset hero-logo-morph__asset--icon hero-logo-morph__asset--car"
            draggable={false}
            aria-hidden="true"
          />
          <img
            src="/logo/layers/logo-icon-home.svg"
            alt=""
            className="hero-logo-morph__asset hero-logo-morph__asset--icon hero-logo-morph__asset--home"
            draggable={false}
            aria-hidden="true"
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
              animate={phase === 'idle' || reduceMotion ? { opacity: 0.28, strokeDashoffset: 0 } : { opacity: [0.3, 0.52, 0.34], strokeDashoffset: [0.08, 0] }}
              transition={{ duration: 2.4, repeat: phase === 'idle' || reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
            />
            <motion.g
              className="hero-logo-morph__waves"
              filter="url(#hero-logo-soft-glow)"
              animate={motionPlan.pulse && !reduceMotion ? { opacity: [0.26, 0.48, 0.28] } : { opacity: phase === 'idle' ? 0.22 : 0.34 }}
              transition={{ duration: 2.5, repeat: motionPlan.pulse && !reduceMotion ? Infinity : 0, ease: 'easeInOut' }}
            >
              <path d="M28 31 C38 23 52 22 63 30" />
              <path d="M23 38 C38 25 60 25 75 39" />
              <path d="M20 47 C39 29 64 29 82 49" />
            </motion.g>
            <motion.path
              className="hero-logo-morph__drip"
              d="M48 84 C48 88 46 92 46 95 C46 98 48 99 50 99 C52 99 54 98 54 95 C54 92 52 88 52 84 Z"
              style={{ originY: 0, originX: 0.5 }}
              animate={motionPlan.retractDrip ? { scaleY: 0, opacity: 0 } : { scaleY: 1, opacity: 0.74 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.4, 0, 1, 1] }}
            />
          </svg>
          {motionPlan.pulse && !reduceMotion && <span className="hero-logo-morph__live-pulse" aria-hidden="true" />}
        </motion.span>
      </button>
      </div>
    </div>
  );
}

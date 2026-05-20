/**
 * VoiceDock - canonical voice bar for FreeFlow
 * Replaces VoiceCommandCenterV2 and VoiceInputBar.
 * Dark premium glass, interaction-first, token-based styling.
 */
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AmberIndicator, AmberStatusNode } from "./AmberIndicator";
import type { LiveUiSessionState } from "../lib/liveUiSessionAdapter";

interface VoiceDockProps {
  amberResponse?: string;
  interimText?: string;
  finalText?: string;
  recording?: boolean;
  visible?: boolean;
  onMicClick?: () => void;
  onTextSubmit?: (value: string) => void;
  onSubmitText?: (value: string) => void;
  isSpeaking?: boolean;
  isProcessing?: boolean;
  isPresenting?: boolean;
  onClearResponse?: () => void;
  liveSession?: {
    isActive: boolean;
    start: () => void;
    stop: () => void;
  };
  liveUiState?: LiveUiSessionState;
  liveStatusText?: string;
  liveTranscript?: string;
}

type DockGlassVariant = "clean-premium" | "neon-soft-glow" | "closest-to-logo";

const MOBILE_HERO_DOCK_VARIANT: DockGlassVariant = "neon-soft-glow";

function getDockGlassStyle(variant: DockGlassVariant, recording: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: "var(--radius-pill)",
    backdropFilter: "blur(16px) saturate(128%)",
    WebkitBackdropFilter: "blur(16px) saturate(128%)",
    transition: "border-color var(--anim-fast), box-shadow var(--anim-normal), background var(--anim-normal)",
    position: "relative",
    overflow: "visible",
  };

  const variants: Record<DockGlassVariant, React.CSSProperties> = {
    "clean-premium": {
      background: "linear-gradient(135deg, var(--ff-voice-panel, rgba(11,14,24,0.88)) 0%, rgba(14,17,28,0.72) 100%)",
      border: "1px solid var(--ff-voice-border, rgba(255,255,255,0.10))",
      boxShadow:
        "var(--ff-voice-shadow, 0 14px 34px rgba(0,0,0,0.34)), 0 1px 0 rgba(255,255,255,0.12) inset, 0 -1px 0 rgba(4,8,18,0.24) inset",
    },
    "neon-soft-glow": {
      background: "linear-gradient(132deg, var(--ff-voice-panel, rgba(11,14,24,0.88)) 0%, rgba(14,17,28,0.76) 100%)",
      border: "1px solid var(--ff-voice-border, rgba(255,255,255,0.10))",
      boxShadow:
        "var(--ff-voice-shadow, 0 14px 34px rgba(0,0,0,0.34)), 0 0 16px rgba(103,232,249,0.08), 0 1px 0 rgba(255,255,255,0.12) inset, 0 -1px 0 rgba(4,8,18,0.26) inset",
    },
    "closest-to-logo": {
      background: "linear-gradient(138deg, var(--ff-voice-panel, rgba(11,14,24,0.88)) 0%, rgba(16,20,33,0.74) 52%, rgba(12,17,28,0.68) 100%)",
      border: "1px solid var(--ff-voice-border, rgba(255,255,255,0.10))",
      boxShadow:
        "var(--ff-voice-shadow, 0 14px 34px rgba(0,0,0,0.34)), 0 0 18px rgba(249,115,22,0.10), 0 1px 0 rgba(255,255,255,0.12) inset",
    },
  };

  if (!recording) {
    return { ...base, ...variants[variant] };
  }

  return {
    ...base,
    background: "linear-gradient(135deg, rgba(9,18,25,0.84) 0%, rgba(10,24,32,0.78) 100%)",
    border: "1px solid rgba(103,232,249,0.34)",
    boxShadow:
      "var(--ff-voice-shadow, 0 14px 34px rgba(0,0,0,0.34)), 0 0 18px rgba(103,232,249,0.16), 0 1px 0 rgba(255,255,255,0.12) inset",
  };
}

function isTechnicalDockText(value: string): boolean {
  const text = value.trim();
  if (!text) return true;
  if (/^gotowe\.?$/i.test(text)) return true;
  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) return true;
  return /interactionbridge|gemini|tool_call|tool_result|ws_|https?:\/\/|session|request_id/i.test(text);
}

function firstUserFacingDockText(...values: string[]): string {
  return values.find((value) => value.trim() && !isTechnicalDockText(value))?.trim() || "";
}

function resolveLiveDockText(
  sessionState: LiveUiSessionState | undefined,
  statusText: string,
  transcript: string,
): string {
  if (!sessionState) return "";
  if (sessionState === "listening") return transcript || statusText || "Słucham...";
  if (sessionState === "processing") return transcript || statusText || "Analizuję...";
  if (sessionState === "results_ready") return transcript || statusText;
  if (sessionState === "restaurant_selected") return transcript || statusText;
  if (sessionState === "item_selected") return transcript || statusText;
  if (sessionState === "cart_ready") return transcript || statusText;
  if (sessionState === "paused") return transcript || statusText || "Wstrzymano LIVE.";
  return transcript || statusText;
}

export default function VoiceDock({
  amberResponse = "",
  interimText = "",
  recording = false,
  visible = true,
  onMicClick,
  onTextSubmit,
  onSubmitText,
  isSpeaking = false,
  isProcessing = false,
  isPresenting = false,
  onClearResponse,
  liveUiState,
  liveStatusText = "",
  liveTranscript = "",
}: VoiceDockProps) {
  const [inputValue, setInputValue] = useState("");
  const [mobileYOffset, setMobileYOffset] = useState(0);
  const [mobileLeftInset, setMobileLeftInset] = useState(48);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const handleSubmit = onTextSubmit ?? onSubmitText;
  const hasTypedText = inputValue.trim().length > 0;

  // Amber status mapping
  let amberStatus: AmberStatusNode = "idle";
  if (liveUiState === "listening") amberStatus = "listening";
  else if (liveUiState === "processing") amberStatus = "thinking";
  else if (
    liveUiState === "results_ready"
    || liveUiState === "restaurant_selected"
    || liveUiState === "item_selected"
    || liveUiState === "cart_ready"
  ) amberStatus = "ok";
  else if (recording) amberStatus = "listening";
  else if (isProcessing) amberStatus = "thinking";
  else if (isSpeaking || isPresenting) amberStatus = "ok";

  const liveDockText = resolveLiveDockText(liveUiState, liveStatusText, liveTranscript);
  const displayText = firstUserFacingDockText(liveDockText, interimText, recording ? "" : amberResponse);
  const showResponse = !!displayText;
  const voiceActive = recording || liveUiState === "listening";
  const inputPlaceholder = liveUiState === "listening"
    ? "Słucham..."
    : (recording ? "Słucham..." : "Napisz lub powiedz...");

  // Clear response when recording starts
  useEffect(() => {
    if (recording && amberResponse && onClearResponse) {
      onClearResponse();
    }
  }, [recording]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const handleMedia = () => setIsMobile(mq.matches);
    handleMedia();
    mq.addEventListener("change", handleMedia);
    return () => mq.removeEventListener("change", handleMedia);
  }, []);

  useEffect(() => {
    if (!isMobile || typeof window === "undefined") {
      setMobileYOffset(0);
      return;
    }

    const alignToStatusRail = () => {
      const statusDot = document.querySelector('[data-ui-role="status-dot"]') as HTMLElement | null;
      const statusBaseDot = document.querySelector('[data-ui-role="status-base-dot"]') as HTMLElement | null;
      const railTrack = document.querySelector('[data-ui-role="status-rail-track"]') as HTMLElement | null;
      const voiceBar = barRef.current;
      if (!statusDot || !voiceBar) return;

      const statusRect = statusDot.getBoundingClientRect();
      const baseRect = statusBaseDot?.getBoundingClientRect();
      const trackRect = railTrack?.getBoundingClientRect();
      const barRect = voiceBar.getBoundingClientRect();
      const statusCenterY = statusRect.top + statusRect.height / 2;
      const baseCenterY = baseRect ? baseRect.top + baseRect.height / 2 : statusCenterY;
      const fallbackBetweenDots = statusCenterY + (baseCenterY - statusCenterY) * 0.5;
      const targetCenterY = trackRect
        ? Math.round(trackRect.top + trackRect.height / 2)
        : Math.round(fallbackBetweenDots);
      const barCenterY = barRect.top + barRect.height / 2;
      const rawDelta = targetCenterY - barCenterY;
      const upwardNudge = 6;

      // Keep micro-adjustment small and stable across devices.
      const nextDelta = Math.max(-22, Math.min(22, Math.round(rawDelta + upwardNudge)));
      setMobileYOffset((prev) => (prev === nextDelta ? prev : nextDelta));

      const horizontalAnchorRect = baseRect || trackRect || statusRect;
      const nextLeftInset = Math.max(40, Math.min(96, Math.round(horizontalAnchorRect.right + 14)));
      setMobileLeftInset((prev) => (prev === nextLeftInset ? prev : nextLeftInset));
    };

    const rafId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(alignToStatusRail);
    });
    window.addEventListener("resize", alignToStatusRail);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", alignToStatusRail);
    };
  }, [isMobile, hasTypedText, recording, showResponse, voiceActive]);

  const submit = () => {
    if (hasTypedText) {
      handleSubmit?.(inputValue);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if (hasTypedText) {
      submit();
      return;
    }
    onMicClick?.();
  };

  const dockWrapperStyle = isMobile
    ? {
        paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
        paddingLeft: `calc(env(safe-area-inset-left) + ${mobileLeftInset}px)`,
        paddingRight: "max(env(safe-area-inset-right), 8px)",
        justifyContent: "flex-start",
      }
    : undefined;

  const dockGlassStyle = getDockGlassStyle(MOBILE_HERO_DOCK_VARIANT, voiceActive);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-ui-role="voice-dock-layer"
          className="fixed inset-x-0 bottom-0 z-[120] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
          style={dockWrapperStyle}
          initial={{ opacity: 0, y: 24 + (isMobile ? mobileYOffset : 0) }}
          animate={{ opacity: 1, y: isMobile ? mobileYOffset : 0 }}
          exit={{ opacity: 0, y: 24 + (isMobile ? mobileYOffset : 0) }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="w-full pointer-events-auto"
            style={{
              width: "100%",
              maxWidth: isMobile ? "none" : 600,
            }}
          >
            {/* Voice bar */}
            <div
              ref={barRef}
              data-ui-role="voice-dock-bar"
              className="flex items-end gap-2.5 px-3 py-2"
              style={{
                ...dockGlassStyle,
              }}
            >
              <div className="flex-1 min-w-0 pr-1">
                <AnimatePresence initial={false}>
                  {showResponse && (
                    <motion.p
                      key="dock-transcript"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 2 }}
                      transition={{ duration: 0.18 }}
                      className="mb-1 text-[11px] leading-tight truncate"
                      style={{ color: "color-mix(in srgb, var(--ff-voice-accent, #67e8f9) 82%, white 18%)" }}
                      title={displayText}
                    >
                      {displayText}
                    </motion.p>
                  )}
                </AnimatePresence>
                {/* Text input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={inputPlaceholder}
                  className="w-full min-w-0 bg-transparent text-[14px] text-white placeholder:text-white/40 focus:outline-none caret-cyan-300"
                  style={{ letterSpacing: "0.01em" }}
                />
              </div>


              {/* Send / mic button */}
              <AnimatePresence mode="wait">
                {hasTypedText ? (
                  <motion.button
                    key="send"
                    type="button"
                    onClick={submit}
                    className="shrink-0 flex items-center justify-center text-[13px] font-semibold text-white"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-pill)",
                      background: "linear-gradient(135deg, rgba(249,115,22,0.85), rgba(249,115,22,0.65))",
                      border: "1px solid rgba(249,115,22,0.35)",
                    }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    aria-label="Wyslij"
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M1 7.5h13M8.5 2 14 7.5 8.5 13" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.button>
                ) : (
                  <motion.button
                    key="mic"
                    type="button"
                    data-ui-role="action-orb"
                    onClick={onMicClick}
                    className="shrink-0 relative flex items-center justify-center"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "var(--radius-pill)",
                      overflow: "hidden",
                      background: voiceActive ? "rgba(103,232,249,0.10)" : "rgba(255,255,255,0.045)",
                      border: voiceActive ? "1px solid rgba(103,232,249,0.22)" : "1px solid rgba(255,255,255,0.08)",
                    }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ duration: 0.15 }}
                    aria-label={recording ? "Zatrzymaj nagrywanie" : "Włącz mikrofon"}
                    aria-pressed={recording}
                  >
                    <AmberIndicator status={amberStatus} className="h-9 w-9 overflow-hidden pointer-events-none" />
                    {recording && (
                      <motion.div
                        className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


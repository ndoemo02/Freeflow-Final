/**
 * VoiceDock - canonical voice bar for FreeFlow
 * Replaces VoiceCommandCenterV2 and VoiceInputBar.
 * Dark premium glass, interaction-first, token-based styling.
 */
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AmberStatusNode } from "./AmberIndicator";
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
  liveUserTranscript?: string;
  liveAssistantTranscript?: string;
  liveTranscript?: string;
}

type DockGlassVariant = "clean-premium" | "neon-soft-glow" | "closest-to-logo";

const MOBILE_HERO_DOCK_VARIANT: DockGlassVariant = "neon-soft-glow";

function getDockGlassStyle(variant: DockGlassVariant, recording: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: "999px",
    backdropFilter: "blur(20px) saturate(132%)",
    WebkitBackdropFilter: "blur(20px) saturate(132%)",
    transition: "border-color var(--anim-fast), box-shadow var(--anim-normal), background var(--anim-normal)",
    position: "relative",
    overflow: "visible",
  };

  const variants: Record<DockGlassVariant, React.CSSProperties> = {
    "clean-premium": {
      background: "linear-gradient(92deg, rgba(5,9,15,0.92) 0%, rgba(9,14,22,0.82) 48%, rgba(20,12,8,0.82) 100%)",
      border: "1px solid rgba(255,255,255,0.10)",
      boxShadow:
        "0 18px 42px rgba(0,0,0,0.40), 0 0 26px rgba(34,211,238,0.08), 0 0 28px rgba(249,115,22,0.08), 0 1px 0 rgba(255,255,255,0.14) inset",
    },
    "neon-soft-glow": {
      background: "linear-gradient(92deg, rgba(4,10,16,0.93) 0%, rgba(8,13,21,0.84) 46%, rgba(23,12,7,0.84) 100%)",
      border: "1px solid rgba(255,255,255,0.10)",
      boxShadow:
        "0 18px 46px rgba(0,0,0,0.44), 0 0 22px rgba(34,211,238,0.12), 0 0 24px rgba(249,115,22,0.10), 0 1px 0 rgba(255,255,255,0.16) inset",
    },
    "closest-to-logo": {
      background: "linear-gradient(94deg, rgba(3,8,14,0.94) 0%, rgba(8,12,20,0.84) 52%, rgba(25,12,6,0.84) 100%)",
      border: "1px solid rgba(255,255,255,0.11)",
      boxShadow:
        "0 18px 46px rgba(0,0,0,0.44), 0 0 24px rgba(34,211,238,0.10), 0 0 28px rgba(249,115,22,0.12), 0 1px 0 rgba(255,255,255,0.16) inset",
    },
  };

  if (!recording) {
    return { ...base, ...variants[variant] };
  }

  return {
    ...base,
    background: "linear-gradient(92deg, rgba(4,14,20,0.94) 0%, rgba(6,14,23,0.86) 44%, rgba(26,13,6,0.86) 100%)",
    border: "1px solid rgba(103,232,249,0.24)",
    boxShadow:
      "0 18px 46px rgba(0,0,0,0.46), 0 0 26px rgba(34,211,238,0.16), 0 0 26px rgba(249,115,22,0.10), 0 1px 0 rgba(255,255,255,0.16) inset",
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
  userTranscript = "",
  assistantTranscript = "",
): string {
  const userFacingUserTranscript = String(userTranscript || "").trim();
  const userFacingAssistantTranscript = String(assistantTranscript || "").trim();
  const fallbackTranscript = String(transcript || "").trim();

  if (!sessionState) return userFacingAssistantTranscript || userFacingUserTranscript || fallbackTranscript;
  if (sessionState === "listening") return userFacingUserTranscript || userFacingAssistantTranscript || fallbackTranscript || statusText || "Słucham...";
  if (sessionState === "processing") return userFacingUserTranscript || userFacingAssistantTranscript || fallbackTranscript || statusText || "Analizuję...";
  if (sessionState === "results_ready") return userFacingAssistantTranscript || userFacingUserTranscript || fallbackTranscript || statusText;
  if (sessionState === "restaurant_selected") return userFacingAssistantTranscript || userFacingUserTranscript || fallbackTranscript || statusText;
  if (sessionState === "item_selected") return userFacingAssistantTranscript || userFacingUserTranscript || fallbackTranscript || statusText;
  if (sessionState === "cart_ready") return userFacingAssistantTranscript || userFacingUserTranscript || fallbackTranscript || statusText;
  if (sessionState === "paused") return userFacingAssistantTranscript || userFacingUserTranscript || fallbackTranscript || statusText || "Wstrzymano LIVE.";
  return userFacingAssistantTranscript || userFacingUserTranscript || fallbackTranscript || statusText;
}

export default function VoiceDock({
  amberResponse = "",
  interimText = "",
  finalText = "",
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
  liveUserTranscript = "",
  liveAssistantTranscript = "",
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

  const liveDockText = resolveLiveDockText(
    liveUiState,
    liveStatusText,
    liveTranscript,
    liveUserTranscript,
    liveAssistantTranscript,
  );
  const displayText = firstUserFacingDockText(liveDockText, interimText, finalText, recording ? "" : amberResponse);
  const displayTextSource = displayText === String(liveAssistantTranscript || "").trim()
    || displayText === String(amberResponse || "").trim()
    ? "Amber"
    : displayText === String(liveUserTranscript || "").trim()
      ? "Ty"
      : displayText === String(liveTranscript || "").trim()
        || displayText === String(interimText || "").trim()
        || displayText === String(finalText || "").trim()
        ? "Rozpoznano"
        : "";
  const displayLine = displayText && displayTextSource ? `${displayTextSource}: ${displayText}` : displayText;
  const showResponse = !!displayText;
  const voiceActive = recording || liveUiState === "listening";
  const inputPlaceholder = liveUiState === "listening"
    ? "Słucham..."
    : (recording ? "Słucham..." : "Napisz lub powiedz...");

  useEffect(() => {
    if (recording && amberResponse && onClearResponse) {
      onClearResponse();
    }
  }, [recording, amberResponse, onClearResponse]);

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
          className="w-full z-[120] flex justify-center px-0 mb-2"
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
            <div
              ref={barRef}
              data-ui-role="voice-dock-bar"
              data-voice-active={voiceActive ? "true" : "false"}
              className="ff-voice-dock flex items-center gap-2.5 px-3 py-2"
              style={{
                ...dockGlassStyle,
              }}
            >
              <div className="ff-voice-dock__speaker" aria-hidden="true">
                <svg className="ff-voice-dock__speaker-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                  <path className="ff-voice-dock__speaker-body" d="M8.5 18.5H5.8a1.8 1.8 0 0 1-1.8-1.8v-1.4a1.8 1.8 0 0 1 1.8-1.8h2.7l5.8-4.7c.75-.6 1.87-.07 1.87.9v12.6c0 .97-1.12 1.5-1.87.9l-5.8-4.7Z" />
                  <path className="ff-voice-dock__speaker-wave ff-voice-dock__speaker-wave--cyan" d="M20.2 11.4c1.3 1.1 2.08 2.72 2.08 4.6s-.78 3.5-2.08 4.6" />
                  <path className="ff-voice-dock__speaker-wave ff-voice-dock__speaker-wave--amber" d="M23.7 8.6c2.18 1.78 3.54 4.42 3.54 7.4s-1.36 5.62-3.54 7.4" />
                </svg>
              </div>

              <div className="ff-voice-dock__core flex-1 min-w-0 pr-1">
                <AnimatePresence initial={false}>
                  {showResponse && (
                    <motion.p
                      key="dock-transcript"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 2 }}
                      transition={{ duration: 0.18 }}
                      className="mb-1 text-[10px] leading-tight break-words overflow-hidden"
                      style={{
                        color: "rgba(226, 232, 240, 0.62)",
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                      }}
                      title={displayLine}
                    >
                      {displayLine}
                    </motion.p>
                  )}
                </AnimatePresence>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={inputPlaceholder}
                  className="ff-voice-dock__input w-full min-w-0 bg-transparent text-[14px] text-white placeholder:text-white/40 focus:outline-none caret-cyan-300"
                  style={{ letterSpacing: "0.01em" }}
                />
              </div>

              <AnimatePresence mode="wait">
                {hasTypedText ? (
                  <motion.button
                    key="send"
                    type="button"
                    onClick={submit}
                    className="ff-voice-dock__send shrink-0 flex items-center justify-center text-[13px] font-semibold text-white"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "999px",
                      background: "radial-gradient(circle at 38% 30%, rgba(255,205,120,0.95), rgba(249,115,22,0.82) 42%, rgba(88,35,8,0.92) 100%)",
                      border: "1px solid rgba(255,162,82,0.48)",
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
                    data-amber-status={amberStatus}
                    onClick={onMicClick}
                    className="ff-voice-dock__orb shrink-0 relative flex items-center justify-center"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "999px",
                      overflow: "hidden",
                      background: voiceActive
                        ? "radial-gradient(circle at 38% 32%, rgba(147,245,255,0.78), rgba(19,116,135,0.44) 42%, rgba(5,10,18,0.78) 100%)"
                        : "radial-gradient(circle at 38% 30%, rgba(255,190,104,0.92), rgba(249,115,22,0.66) 42%, rgba(36,18,10,0.86) 100%)",
                      border: voiceActive ? "1px solid rgba(103,232,249,0.34)" : "1px solid rgba(255,162,82,0.42)",
                    }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ duration: 0.15 }}
                    aria-label={recording ? "Zatrzymaj nagrywanie" : "Włącz mikrofon"}
                    aria-pressed={recording}
                  >
                    <span className="ff-voice-dock__orb-core" aria-hidden="true" />
                    {recording && (
                      <motion.div
                        className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400"
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

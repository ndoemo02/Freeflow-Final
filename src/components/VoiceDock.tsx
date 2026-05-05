/**
 * VoiceDock - canonical voice bar for FreeFlow
 * Replaces VoiceCommandCenterV2 and VoiceInputBar.
 * Dark premium glass, interaction-first, token-based styling.
 *
 * Redesign notes:
 * - Local message history (last 6) of user/assistant turns rendered as chat bubbles
 *   above the input bar. Hidden when idle and empty.
 * - Backward compatible props: existing Home.tsx integration (466 lines) keeps
 *   working unchanged. New OPTIONAL props `liveUserTranscript` /
 *   `liveAssistantTranscript` enable cleaner role separation; otherwise we
 *   derive the role from `liveUiState` + `liveTranscript`.
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
  /** Optional. Latest user-side transcript. If omitted, role is inferred from liveUiState. */
  liveUserTranscript?: string;
  /** Optional. Latest assistant-side transcript. If omitted, role is inferred from liveUiState. */
  liveAssistantTranscript?: string;
}

type DockGlassVariant = "clean-premium" | "neon-soft-glow" | "closest-to-logo";

const MOBILE_HERO_DOCK_VARIANT: DockGlassVariant = "neon-soft-glow";

const MAX_MESSAGES = 6;

type ChatRole = "user" | "assistant";
interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

function getDockGlassStyle(
  variant: DockGlassVariant,
  recording: boolean,
  listening: boolean,
): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: "var(--radius-pill)",
    backdropFilter: "blur(16px) saturate(128%)",
    WebkitBackdropFilter: "blur(16px) saturate(128%)",
    transition:
      "border-color var(--anim-fast), box-shadow var(--anim-normal), background var(--anim-normal)",
    position: "relative",
    overflow: "visible",
  };

  const variants: Record<DockGlassVariant, React.CSSProperties> = {
    "clean-premium": {
      background:
        "linear-gradient(135deg, rgba(10,14,24,0.36) 0%, rgba(14,20,34,0.46) 100%)",
      border: "1px solid rgba(235,242,255,0.16)",
      boxShadow:
        "0 14px 34px rgba(2,6,14,0.38), 0 1px 0 rgba(255,255,255,0.16) inset, 0 -1px 0 rgba(4,8,18,0.24) inset",
    },
    "neon-soft-glow": {
      background:
        "linear-gradient(132deg, rgba(10,14,24,0.40) 0%, rgba(13,20,34,0.50) 100%)",
      border: "1px solid rgba(228,236,255,0.17)",
      boxShadow:
        "0 16px 42px rgba(2,6,14,0.42), 0 0 18px rgba(82,122,255,0.14), 0 0 14px rgba(45,212,191,0.10), 0 1px 0 rgba(255,255,255,0.14) inset, 0 -1px 0 rgba(4,8,18,0.26) inset",
    },
    "closest-to-logo": {
      background:
        "linear-gradient(138deg, rgba(10,12,22,0.42) 0%, rgba(16,20,33,0.54) 52%, rgba(12,17,28,0.50) 100%)",
      border: "1px solid rgba(238,246,255,0.18)",
      boxShadow:
        "0 16px 46px rgba(1,5,14,0.46), 0 0 20px rgba(249,115,22,0.15), 0 0 18px rgba(59,130,246,0.12), 0 1px 0 rgba(255,255,255,0.15) inset",
    },
  };

  if (recording) {
    return {
      ...base,
      background:
        "linear-gradient(135deg, rgba(24,10,16,0.44) 0%, rgba(28,14,24,0.56) 100%)",
      border: "1px solid rgba(239,68,68,0.38)",
      boxShadow:
        "0 16px 44px rgba(10,4,8,0.52), 0 0 18px rgba(239,68,68,0.18), 0 0 12px rgba(99,102,241,0.10), 0 1px 0 rgba(255,255,255,0.10) inset",
    };
  }

  if (listening) {
    return {
      ...base,
      ...variants[variant],
      border: "1px solid rgba(96,165,250,0.55)",
      boxShadow:
        "0 16px 42px rgba(2,6,14,0.42), 0 0 22px rgba(59,130,246,0.30), 0 0 14px rgba(45,212,191,0.10), 0 1px 0 rgba(255,255,255,0.14) inset",
    };
  }

  return { ...base, ...variants[variant] };
}

function resolveLiveDockText(
  sessionState: LiveUiSessionState | undefined,
  statusText: string,
  transcript: string,
): string {
  if (!sessionState) return "";
  if (sessionState === "listening") return transcript || statusText || "Slucham...";
  if (sessionState === "processing") return transcript || statusText || "Analizuje...";
  if (sessionState === "results_ready") return transcript || statusText;
  if (sessionState === "restaurant_selected") return transcript || statusText;
  if (sessionState === "item_selected") return transcript || statusText;
  if (sessionState === "cart_ready") return transcript || statusText;
  if (sessionState === "paused") return transcript || statusText || "Wstrzymano LIVE.";
  return transcript || statusText;
}

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
  liveUserTranscript,
  liveAssistantTranscript,
}: VoiceDockProps) {
  const [inputValue, setInputValue] = useState("");
  const [mobileYOffset, setMobileYOffset] = useState(0);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const prevUserRef = useRef<string>("");
  const prevAssistantRef = useRef<string>("");
  const prevTranscriptRef = useRef<string>("");

  const handleSubmit = onTextSubmit ?? onSubmitText;
  const hasTypedText = inputValue.trim().length > 0;

  const isListeningState = liveUiState === "listening" || recording;
  const isProcessingState = liveUiState === "processing" || isProcessing;
  const isPausedState = liveUiState === "paused";

  // ----- Amber orb status mapping -----
  let amberStatus: AmberStatusNode = "idle";
  if (liveUiState === "listening") amberStatus = "listening";
  else if (liveUiState === "processing") amberStatus = "thinking";
  else if (
    liveUiState === "results_ready" ||
    liveUiState === "restaurant_selected" ||
    liveUiState === "item_selected" ||
    liveUiState === "cart_ready"
  )
    amberStatus = "ok";
  else if (recording) amberStatus = "listening";
  else if (isProcessing) amberStatus = "thinking";
  else if (isSpeaking || isPresenting) amberStatus = "ok";

  // ----- Append messages on transcript prop change -----
  // Prefer explicit user/assistant props when provided; otherwise infer from
  // the combined `liveTranscript` + `liveUiState`.
  useEffect(() => {
    if (typeof liveUserTranscript !== "string") return;
    const next = liveUserTranscript.trim();
    if (!next) return;
    if (next === prevUserRef.current) return;
    prevUserRef.current = next;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "user" && last.text === next) return prev;
      const updated = [...prev, { id: genId(), role: "user" as const, text: next }];
      return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
    });
  }, [liveUserTranscript]);

  useEffect(() => {
    if (typeof liveAssistantTranscript !== "string") return;
    const next = liveAssistantTranscript.trim();
    if (!next) return;
    if (next === prevAssistantRef.current) return;
    prevAssistantRef.current = next;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant" && last.text === next) return prev;
      const updated = [
        ...prev,
        { id: genId(), role: "assistant" as const, text: next },
      ];
      return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
    });
  }, [liveAssistantTranscript]);

  // Fallback: if the dedicated props are not provided, derive role from session state.
  useEffect(() => {
    if (
      typeof liveUserTranscript === "string" ||
      typeof liveAssistantTranscript === "string"
    ) {
      return;
    }
    const next = (liveTranscript || "").trim();
    if (!next) return;
    if (next === prevTranscriptRef.current) return;
    prevTranscriptRef.current = next;
    const role: ChatRole = liveUiState === "listening" ? "user" : "assistant";
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.text === next) return prev;
      const updated = [...prev, { id: genId(), role, text: next }];
      return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
    });
  }, [liveTranscript, liveUiState, liveUserTranscript, liveAssistantTranscript]);

  // Auto-scroll history to bottom on new message.
  useEffect(() => {
    const node = historyRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  // ----- Live status text (placeholder/ghost line) -----
  const liveDockText = resolveLiveDockText(liveUiState, liveStatusText, liveTranscript);
  const ghostLine =
    !messages.length && (liveDockText || interimText || (recording ? "" : amberResponse));
  const showHistory = messages.length > 0 || isListeningState || isProcessingState;

  let inputPlaceholder = "Napisz lub powiedz...";
  if (isProcessingState) inputPlaceholder = "Amber mysli...";
  else if (isPausedState) inputPlaceholder = "Wstrzymano...";
  else if (isListeningState) inputPlaceholder = "Slucham...";

  // Clear response when recording starts
  useEffect(() => {
    if (recording && amberResponse && onClearResponse) {
      onClearResponse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const statusDot = document.querySelector(
        '[data-ui-role="status-dot"]',
      ) as HTMLElement | null;
      const statusBaseDot = document.querySelector(
        '[data-ui-role="status-base-dot"]',
      ) as HTMLElement | null;
      const railTrack = document.querySelector(
        '[data-ui-role="status-rail-track"]',
      ) as HTMLElement | null;
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
    };

    const rafId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(alignToStatusRail);
    });
    window.addEventListener("resize", alignToStatusRail);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", alignToStatusRail);
    };
  }, [isMobile, hasTypedText, recording, messages.length]);

  const submit = () => {
    if (hasTypedText) {
      // Optimistically push the typed message into local history so the user
      // sees their bubble immediately (assistant follow-up arrives via props).
      const text = inputValue.trim();
      setMessages((prev) => {
        const updated = [...prev, { id: genId(), role: "user" as const, text }];
        return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
      });
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
    ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }
    : undefined;

  const dockGlassStyle = getDockGlassStyle(
    MOBILE_HERO_DOCK_VARIANT,
    recording,
    isListeningState && !recording,
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-ui-role="voice-dock-layer"
          className="fixed inset-x-0 bottom-0 z-[120] flex justify-center pl-14 pr-5 sm:pl-20 sm:pr-8 pb-[calc(env(safe-area-inset-bottom)+12px)]"
          style={dockWrapperStyle}
          initial={{ opacity: 0, y: 24 + (isMobile ? mobileYOffset : 0) }}
          animate={{ opacity: 1, y: isMobile ? mobileYOffset : 0 }}
          exit={{ opacity: 0, y: 24 + (isMobile ? mobileYOffset : 0) }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="w-full max-w-3xl pointer-events-auto flex flex-col gap-2">
            {/* ----- Message history ----- */}
            <AnimatePresence initial={false}>
              {showHistory && messages.length > 0 && (
                <motion.div
                  key="dock-history"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                  className="px-1"
                >
                  <div
                    ref={historyRef}
                    className="flex flex-col gap-1.5 overflow-y-auto pr-1"
                    style={{
                      maxHeight: 120,
                      WebkitMaskImage:
                        "linear-gradient(to bottom, transparent 0, black 24px, black 100%)",
                      maskImage:
                        "linear-gradient(to bottom, transparent 0, black 24px, black 100%)",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    <style>{`[data-ui-role="voice-dock-history"]::-webkit-scrollbar{display:none;}`}</style>
                    <div data-ui-role="voice-dock-history" className="flex flex-col gap-1.5">
                      <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            layout
                            initial={{
                              opacity: 0,
                              x: msg.role === "user" ? -20 : 20,
                            }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className={
                              msg.role === "user"
                                ? "self-start"
                                : "self-end"
                            }
                            style={{ maxWidth: "60%" }}
                          >
                            <div
                              className={
                                msg.role === "user"
                                  ? "rounded-2xl rounded-bl-sm bg-white/10 px-3 py-1.5 text-xs leading-snug text-white/80 backdrop-blur-sm"
                                  : "rounded-2xl rounded-br-sm bg-orange-500/15 px-3 py-1.5 text-xs leading-snug text-orange-100 backdrop-blur-sm"
                              }
                              style={
                                msg.role === "user"
                                  ? { border: "1px solid rgba(255,255,255,0.10)" }
                                  : { border: "1px solid rgba(249,115,22,0.25)" }
                              }
                            >
                              {msg.text}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ----- Voice bar ----- */}
            <div
              ref={barRef}
              data-ui-role="voice-dock-bar"
              className="relative flex items-center gap-2.5 px-3 h-14"
              style={dockGlassStyle}
            >
              {/* Listening pulse glow (subtle, infinite) */}
              {isListeningState && !recording && (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    borderRadius: "var(--radius-pill)",
                    boxShadow:
                      "0 0 0 1px rgba(96,165,250,0.45), 0 0 18px rgba(59,130,246,0.30)",
                  }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              {/* Paused yellow strip on top */}
              <AnimatePresence>
                {isPausedState && (
                  <motion.div
                    key="paused-bar"
                    aria-hidden
                    className="pointer-events-none absolute left-3 right-3 top-0 origin-left"
                    style={{
                      height: 4,
                      borderRadius: 999,
                      background:
                        "linear-gradient(90deg, rgba(250,204,21,0.95), rgba(245,158,11,0.95))",
                      boxShadow: "0 0 10px rgba(250,204,21,0.5)",
                      transform: "translateY(-50%)",
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    exit={{ scaleX: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </AnimatePresence>

              <div className="relative z-[1] flex-1 min-w-0 pr-1">
                {/* Ghost line shown only when there is no message history yet */}
                <AnimatePresence initial={false}>
                  {!!ghostLine && (
                    <motion.p
                      key="dock-ghost"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 2 }}
                      transition={{ duration: 0.18 }}
                      className="mb-1 text-[11px] leading-tight text-cyan-200/85 truncate"
                      title={ghostLine || undefined}
                    >
                      {ghostLine}
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
                  disabled={isProcessingState}
                  className="w-full min-w-0 bg-transparent text-[14px] text-white placeholder:text-white/40 focus:outline-none caret-cyan-300 disabled:opacity-60"
                  style={{ letterSpacing: "0.01em" }}
                />
              </div>

              {/* Send / mic button */}
              <div className="relative z-[1]">
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
                        background:
                          "linear-gradient(135deg, rgba(249,115,22,0.85), rgba(249,115,22,0.65))",
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
                        <path
                          d="M1 7.5h13M8.5 2 14 7.5 8.5 13"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </motion.button>
                  ) : (
                    <motion.button
                      key="mic"
                      type="button"
                      data-ui-role="action-orb"
                      onClick={onMicClick}
                      className="shrink-0 relative flex items-center justify-center"
                      style={{ width: 36, height: 36 }}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      whileTap={{ scale: 0.92 }}
                      transition={{ duration: 0.15 }}
                      aria-label={recording ? "Zatrzymaj nagrywanie" : "Wlacz mikrofon"}
                      aria-pressed={recording}
                    >
                      <AmberIndicator status={amberStatus} />
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

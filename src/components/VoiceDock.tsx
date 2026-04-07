/**
 * VoiceDock - canonical voice bar for FreeFlow
 * Replaces VoiceCommandCenterV2 and VoiceInputBar.
 * Dark premium glass, interaction-first, token-based styling.
 */
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AmberIndicator, AmberStatusNode } from "./AmberIndicator";

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
}: VoiceDockProps) {
  const [inputValue, setInputValue] = useState("");
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const handleSubmit = onTextSubmit ?? onSubmitText;
  const hasTypedText = inputValue.trim().length > 0;

  // Amber status mapping
  let amberStatus: AmberStatusNode = "idle";
  if (recording) amberStatus = "listening";
  else if (isProcessing) amberStatus = "thinking";
  else if (isSpeaking || isPresenting) amberStatus = "ok";

  const displayText = interimText || (recording ? "" : amberResponse);
  const showResponse = !!displayText;

  // Clear response when recording starts
  useEffect(() => {
    if (recording && amberResponse && onClearResponse) {
      onClearResponse();
    }
  }, [recording]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const handleMedia = () => setIsMobile(mq.matches);
    handleMedia();
    mq.addEventListener("change", handleMedia);
    return () => mq.removeEventListener("change", handleMedia);
  }, []);

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
    ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 28px)" }
    : undefined;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-ui-role="voice-dock-layer"
          className="fixed inset-x-0 bottom-0 z-[120] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
          style={dockWrapperStyle}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="w-full pointer-events-auto"
            style={{
              width: isMobile ? "92vw" : "100%",
              maxWidth: isMobile ? 500 : 600,
            }}
          >
            {/* Amber response bubble - above bar */}
            <AnimatePresence>
              {showResponse && (
                <motion.div
                  className="mb-2 px-1"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.25 }}
                >
                  <div
                    className="relative overflow-hidden px-4 py-2.5"
                    style={{
                      borderRadius: "var(--radius-md)",
                      background: "linear-gradient(155deg, rgba(6,182,212,0.10) 0%, rgba(5,8,16,0.92) 100%)",
                      border: "1px solid rgba(6,182,212,0.18)",
                      backdropFilter: "blur(var(--blur-md))",
                      WebkitBackdropFilter: "blur(var(--blur-md))",
                    }}
                  >
                    <div className="absolute inset-x-8 top-0 h-px"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.55), transparent)" }}
                    />
                    <p
                      className="text-[13px] leading-snug text-white/90 min-w-0 truncate"
                      title={displayText}
                    >
                      {displayText}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Voice bar */}
            <div
              ref={barRef}
              data-ui-role="voice-dock-bar"
              className="flex items-center gap-2.5 px-3 py-2"
              style={{
                borderRadius: "var(--radius-pill)",
                background: "linear-gradient(135deg, rgba(5,8,16,0.88) 0%, rgba(10,16,28,0.92) 100%)",
                border: recording
                  ? "1px solid rgba(239,68,68,0.45)"
                  : "1px solid rgba(255,255,255,0.09)",
                boxShadow: recording
                  ? "0 0 0 1px rgba(239,68,68,0.18) inset, 0 20px 48px rgba(0,0,0,0.55), 0 0 32px rgba(239,68,68,0.12)"
                  : "0 20px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset",
                backdropFilter: "blur(var(--blur-lg))",
                WebkitBackdropFilter: "blur(var(--blur-lg))",
                transition: "border-color var(--anim-fast), box-shadow var(--anim-normal)",
                position: "relative",
                overflow: "visible",
              }}
            >
              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={recording ? "Słucham…" : "Napisz lub powiedz…"}
                className="flex-1 min-w-0 bg-transparent text-[14px] text-white placeholder:text-white/28 focus:outline-none caret-cyan-400"
                style={{ letterSpacing: "0.01em" }}
              />

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
                    aria-label="Wyślij"
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
                    style={{ width: 36, height: 36 }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ duration: 0.15 }}
                    aria-label={recording ? "Zatrzymaj nagrywanie" : "Włącz mikrofon"}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

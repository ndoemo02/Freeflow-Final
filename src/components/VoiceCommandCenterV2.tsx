import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AmberIndicator, AmberStatusNode } from "./AmberIndicator";
import './VoiceCommandCenterV2.css';

interface VoiceCommandCenterV2Props {
  amberResponse?: string;
  interimText?: string;
  finalText?: string;
  recording?: boolean;
  visible?: boolean;
  onMicClick?: () => void;
  onTextSubmit?: (value: string) => void;
  onSubmitText?: (value: string) => void; // Fallback
  isSpeaking?: boolean;
  isProcessing?: boolean;
  isPresenting?: boolean;
  onClearResponse?: () => void;
  viewMode?: 'bar' | 'island';
  onToggleView?: () => void;
}

export default function VoiceCommandCenterV2({
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
  viewMode = 'bar',
  onToggleView,
}: VoiceCommandCenterV2Props) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle both prop names
  const handleSubmitText = onTextSubmit || onSubmitText;

  // Auto-clear response when recording starts
  useEffect(() => {
    if (recording && amberResponse && onClearResponse) {
      onClearResponse();
    }
  }, [recording, amberResponse, onClearResponse]);

  // 1️⃣ Mapowanie stanu aplikacji na status Amber (Deterministic)
  let amberStatus: AmberStatusNode = 'idle';

  if (recording) amberStatus = 'listening';
  else if (isProcessing) amberStatus = 'thinking';
  else if (isSpeaking) amberStatus = 'ok'; // Speaking is active/healthy
  else if (isPresenting) amberStatus = 'ok'; // Presenting is active
  else amberStatus = 'idle';

  const showResponse = !!(amberResponse && amberResponse.length > 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleSubmitText?.(inputValue);
      setInputValue("");
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      handleSubmitText?.(inputValue);
      setInputValue("");
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0, x: "-50%" }}
          animate={{ y: 0, opacity: 1, x: "-50%" }}
          exit={{ y: 100, opacity: 0, x: "-50%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-2 left-[53%] sm:left-1/2 w-[92%] sm:w-[90%] md:w-full max-w-[600px] z-50 transform-gpu vcc-input-wrapper pointer-events-auto"
        >
          <div className="voice-cc-container" data-status={amberStatus === 'listening' ? 'listening' : ''}>
            <div className="voice-cc-inner-container">
              <div className="voice-cc-field">
                {/* Visual Flairs */}
                <div className="vcc-twinkle-container">
                  {[...Array(10)].map((_, i) => <div key={i} className="vcc-twinkle"></div>)}
                </div>
                <div className="voice-cc-flare"></div>
                {/* Ticker / Chip Area */}
                <div className="flex-1 flex flex-col justify-center px-4 overflow-hidden relative" style={{ height: '60px' }}>

                  {/* User Transcript Ticker */}
                  <AnimatePresence>
                    {(interimText || (recording && amberStatus === 'listening')) && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        className="text-white/60 text-[11px] font-medium truncate mb-0.5 flex items-center gap-1"
                      >
                        <i className="fas fa-user-circle text-[10px]" />
                        <span>{interimText || "Słucham..."}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Assistant Reply / Input */}
                  {showResponse && !recording ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[#00ffcc] font-medium text-sm w-full cursor-pointer flex items-center gap-2 min-w-0"
                      onClick={onClearResponse}
                    >
                      <i className="fas fa-robot text-[#00ffcc]/60 text-xs flex-shrink-0" />
                      <span className="truncate min-w-0 flex-1" title={amberResponse}>{amberResponse}</span>
                    </motion.div>
                  ) : (
                    <input
                      id="voice-cc-text-input"
                      ref={inputRef}
                      type="text"
                      placeholder={amberStatus === 'listening' ? "" : "Napisz lub powiedz..."}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-transparent border-none text-white placeholder-white/40 focus:ring-0 text-sm tracking-wide p-0 m-0"
                      style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}
                    />
                  )}

                  {/* Debug Tools */}
                  {import.meta.env.DEV && (showResponse || interimText) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(`U: ${interimText}\nA: ${amberResponse}`);
                      }}
                      className="absolute right-2 top-2 text-[8px] bg-purple-900/50 text-white/70 px-1.5 py-0.5 rounded border border-purple-500/50 hover:bg-purple-800 transition-colors pointer-events-auto"
                      title="Copy last transcript + reply"
                    >
                      Copy TR
                    </button>
                  )}
                </div>

                {/* ORB AREA (Inside Panel, Right Side) */}
                <div
                  className="voice-cc-animation-container cursor-pointer hover:scale-105 transition-transform active:scale-95 flex items-center justify-center w-[60px] h-[60px] shrink-0"
                  title={inputValue.trim() ? "Wyślij wiadomość" : "Kliknij, aby rozmawiać"}
                  onClick={inputValue.trim() ? handleSubmit : onMicClick}
                >
                  {inputValue.trim() ? (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--neon)] text-black shadow-[0_0_15px_var(--neon)]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </div>
                  ) : (
                    <AmberIndicator status={amberStatus === 'listening' ? 'listening' : 'idle'} className="w-12 h-12" />
                  )}
                </div>

                {/* Typing/Processing Indicator */}
                {(isProcessing || amberStatus === 'thinking') && (
                  <div className="voice-cc-typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

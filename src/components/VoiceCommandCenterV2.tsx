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
          className="fixed bottom-6 left-1/2 w-[95%] sm:w-full max-w-[600px] z-50 transform-gpu vcc-input-wrapper pointer-events-auto"
        >
          <div className="voice-cc-container">
            <div className="voice-cc-inner-container">
              <div className="voice-cc-field">
                {/* Visual Flairs */}
                <div className="vcc-twinkle-container">
                  {[...Array(10)].map((_, i) => <div key={i} className="vcc-twinkle"></div>)}
                </div>
                <div className="voice-cc-flare"></div>
                <div className="voice-cc-floating-label">
                  {showResponse ? "Asystent" : "Twoja wiadomość"}
                </div>

                {/* INPUT AREA */}
                {showResponse ? (
                  <div
                    className="w-full h-[60px] flex items-center px-[20px] pt-[15px] relative z-[2] cursor-pointer"
                    onClick={onClearResponse}
                  >
                    <span className="text-[#00ffcc] truncate font-medium text-[15px] w-full">
                      {amberResponse}
                    </span>
                  </div>
                ) : (
                  <input
                    id="voice-cc-text-input"
                    ref={inputRef}
                    type="text"
                    placeholder={amberStatus === 'listening' ? "Słucham..." : "Napisz lub powiedz..."}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent border-none text-white placeholder-white/40 focus:ring-0 text-lg tracking-wide h-full px-6"
                    style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}
                  />
                )}

                {/* ORB AREA (Inside Panel, Right Side) */}
                <div
                  className="voice-cc-animation-container cursor-pointer hover:scale-105 transition-transform active:scale-95 flex items-center justify-center w-[60px] h-[60px]"
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

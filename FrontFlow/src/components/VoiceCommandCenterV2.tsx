import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AmberIndicator, AmberStatusNode } from "./AmberIndicator";

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

  const isIsland = viewMode === 'island';

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
          className="fixed bottom-6 left-[58%] md:left-1/2 w-[72%] md:w-[92%] max-w-lg flex items-center gap-2 
                     rounded-full backdrop-blur-xl bg-[#0F0F16]/90 border border-white/10 
                     shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] p-2 z-50 transform-gpu"
        >
          {/* Amber Orb (Status Indicator) */}
          <div
            onClick={onMicClick}
            className="flex items-center justify-center flex-shrink-0 cursor-pointer w-14 h-14"
            title="Kliknij, aby rozmawiać"
          >
            <AmberIndicator status={amberStatus} className="w-full h-full" />
          </div>

          {/* Input / Message Area */}
          <div className="flex-1 relative h-10 transition-all duration-300 flex items-center overflow-hidden">
            {showResponse ? (
              // 🗣️ Asystent mówi/wyświetla (Amber Text)
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full h-full flex items-center justify-between cursor-pointer group"
                onClick={onClearResponse}
                title="Kliknij, aby zamknąć"
              >
                <span className="text-[15px] font-medium text-amber-400 px-2 truncate leading-10 flex-1">
                  {amberResponse}
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white/50 text-xs px-2">✕</span>
              </motion.div>
            ) : (
              // 🎤 Użytkownik mówi / pisze (User Input) - TYLKO TEXT INPUT, BEZ PODGLĄDU MOWY
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={amberStatus === 'listening' ? "Słucham..." : amberStatus === 'thinking' ? "Przetwarzam..." : "Napisz wiadomość..."}
                className={`w-full h-full bg-transparent border-none text-white font-sans text-[15px] px-2 outline-none 
                                         placeholder:text-white/30`}
              />
            )}
          </div>

          {/* Send Button */}
          {!showResponse && (
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/80 
                                  disabled:opacity-20 disabled:cursor-not-allowed transition-colors mr-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" />
              </svg>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import React, { useEffect, useRef, useState } from "react";
import TTSSwitcher from "./TTSSwitcher";

// Demo napisy wyłączone

/**
 * Text box z rozpoznawaniem mowy:
 * - przycisk Start/Stop
 * - interim results (na żywo)
 * - podpowiedzi w trybie live
 * - aktualizuje parent przez onChange/onSubmit
 */
export default function VoiceTextBox({
  value,
  onChange,
  onSubmit,
  chatHistory = [],
  placeholder = "Mów tutaj…",
  onTTSModeChange,
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [hasInteraction, setHasInteraction] = useState(false);
  const recognitionRef = useRef(null);
  const interimRef = useRef("");

  useEffect(() => {
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "pl-PL";

    rec.onresult = (e) => {
      let interim = "";
      let finalChunk = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res[0].transcript;
        if (res.isFinal) {
          finalChunk += txt + " ";
        } else {
          interim += txt + " ";
        }
      }

      // pokazuj interim „na żywo” (nie nadpisuj finalnej wartości)
      interimRef.current = interim;
      if (finalChunk) {
        onChange?.(`${value ?? ""}${finalChunk}`);
        interimRef.current = ""; // wyczyść
      }
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch {}
    };
  }, [onChange, value]);

  const start = () => {
    if (!supported) return;
    if (listening) return;
    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch {}
  };

  const stop = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  };


  // Demo napisy wyłączone

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setHasInteraction(true);
      onSubmit?.(value?.trim?.() ?? "");
    }
  };

  // Ustaw hasInteraction na true gdy pojawi się historia rozmowy
  useEffect(() => {
    if (chatHistory.length > 0) {
      setHasInteraction(true);
    }
  }, [chatHistory]);

  // Ustaw hasInteraction na true gdy użytkownik zacznie pisać
  const handleChange = (e) => {
    if (e.target.value.trim()) {
      setHasInteraction(true);
    }
    onChange?.(e.target.value);
  };


  // Formatuj historię rozmowy
  const formatChatHistory = () => {
    if (chatHistory.length === 0) return "";
    
    return chatHistory.map((entry, index) => {
      const prefix = entry.speaker === 'user' ? '👤 Ty: ' : '🤖 Agent: ';
      return `${prefix}${entry.text}`;
    }).join('\n\n');
  };

  const displayValue = `${hasInteraction ? formatChatHistory() : ''}${hasInteraction && chatHistory.length > 0 ? '\n\n' : ''}${value || ""}${interimRef.current ? `${value ? " " : ""}${interimRef.current}` : ""}`;

  return (
    <div className="ff-voicebox relative">
      <textarea
        className={`ff-input-large ${hasInteraction ? 'expanded' : ''} pr-24`}
        rows={hasInteraction ? 6 : 2}
        placeholder={supported ? "Mów tutaj..." : "Mikrofon wymaga HTTPS lub localhost (brak wsparcia)"}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKey}
        readOnly={false}
      />
      
      {/* Prawa strona - TTS Switcher i kolorowy mikrofon */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {/* Kolorowy mikrofon */}
        <button
          onClick={listening ? stop : start}
          className={`p-2 rounded-full transition-all duration-300 ${
            listening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-gradient-to-r from-orange-500 to-purple-500 hover:from-orange-600 hover:to-purple-600'
          } shadow-lg`}
          title={listening ? "Zatrzymaj nagrywanie" : "Rozpocznij nagrywanie"}
        >
          <svg 
            className="w-5 h-5 text-white" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        </button>
        
        {/* TTS Switcher */}
        <TTSSwitcher onModeChange={onTTSModeChange} />
      </div>
    </div>
  );
}





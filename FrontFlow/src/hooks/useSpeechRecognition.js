// src/hooks/useSpeechRecognition.js
import { useState, useEffect, useRef } from "react";

const SILENCE_MS = 800;
const MAX_RECORDING_MS = 10000;

export function useSpeechRecognition({ onTranscriptChange }) {
  const [recording, setRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const hardStopTimerRef = useRef(null);
  const finalStrRef = useRef("");
  const interimStrRef = useRef("");

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn("SpeechRecognition API not supported in this browser.");
      setSupported(false);
      return;
    } else {
      setSupported(true);
    }
    const recognition = new SR();
    recognition.lang = "pl-PL";
    recognition.interimResults = true;
    recognition.continuous = false; // pojedyncza wypowiedź, autostop
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimStr = "";
      let finalStr = finalStrRef.current;

      console.log("🎤 Speech result event:", event.resultIndex, "results:", event.results.length)

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const t = res[0].transcript;
        console.log(`  Result ${i}: isFinal=${res.isFinal}, transcript="${t}"`)
        if (res.isFinal) {
          finalStr += (finalStr ? " " : "") + t.trim();
          // Szybkie zakończenie po finalu, żeby nie czekać
          try { recognition.stop(); } catch (e) {}
        } else {
          interimStr += t;
        }
      }

      finalStrRef.current = finalStr;
      interimStrRef.current = interimStr;
      setInterimText(interimStr);
      // NIE ustawiamy setFinalText tutaj - czekamy na onend

      console.log("📝 FinalStr:", finalStr, "| InterimStr:", interimStr)

      const merged = (finalStr + " " + interimStr).trim();
      if (onTranscriptChange) {
        onTranscriptChange(merged);
      }

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        console.log("⏱️ Silence timeout - stopping recognition")
        try {
          recognition.stop();
        } catch (e) {}
      }, SILENCE_MS);
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      setRecording(false);
    };

    recognition.onend = () => {
      console.log("🔚 Recognition ended")
      console.log("📋 Final text before clearing:", finalStrRef.current)
      
      // NAJPIERW ustaw recording na false
      setRecording(false);
      console.log("✅ Recording set to FALSE")
      
      // Zbierz cały tekst (final + interim jeśli coś zostało)
      const finalStr = finalStrRef.current.trim();
      const interimStr = interimStrRef.current.trim();
      const textToSend = finalStr || interimStr;
      console.log("📤 Text to send:", textToSend)
      
      // DOPIERO TERAZ ustaw finalText (gdy recording już FALSE)
      if (textToSend) {
        setTimeout(() => {
          console.log("⏰ Setting finalText:", textToSend)
          setFinalText(textToSend);
        }, 50); // Małe opóźnienie aby recording:false zdążyło się zaktualizować
      }
      
      // Wyczyść refs po chwili
      setTimeout(() => {
        finalStrRef.current = "";
        interimStrRef.current = "";
        setInterimText("");
      }, 300);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {}
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (hardStopTimerRef.current) clearTimeout(hardStopTimerRef.current);
      recognitionRef.current = null;
    };
  }, [onTranscriptChange]);

  const startRecording = () => {
    console.log("🎙️ Starting recording...")
    if (!supported || !recognitionRef.current) {
      console.warn("SpeechRecognition not available — ignoring start");
      setRecording(false);
      return;
    }
    finalStrRef.current = "";
    setFinalText("");
    setInterimText("");
    try {
      recognitionRef.current.start();
      setRecording(true);
      // Twardy limit bezpieczeństwa — zatrzymaj po MAX_RECORDING_MS
      if (hardStopTimerRef.current) clearTimeout(hardStopTimerRef.current);
      hardStopTimerRef.current = setTimeout(() => {
        try { recognitionRef.current?.stop(); } catch (e) {}
      }, MAX_RECORDING_MS);
    } catch (e) {
      console.warn("Failed to start recognition:", e);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    console.log("🛑 Stopping recording...")
    console.log("📋 Current finalStr:", finalStrRef.current)
    try { recognitionRef.current?.stop(); } catch (e) {}
  };

  return { recording, interimText, finalText, setFinalText, startRecording, stopRecording };
}
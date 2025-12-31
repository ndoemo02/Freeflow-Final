import React, { useState, useEffect } from "react";

export default function TTSSwitcher({ onModeChange }) {
  const [mode, setMode] = useState(() => {
    // Initialize from localStorage or default to "classic"
    if (typeof window !== "undefined") {
      return localStorage.getItem("ttsMode") || "classic";
    }
    return "classic";
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Save to localStorage whenever mode changes
    if (typeof window !== "undefined") {
      localStorage.setItem("ttsMode", mode);
    }
    
    // Notify parent component
    if (onModeChange) {
      onModeChange(mode);
    }
  }, [mode, onModeChange]);

  const toggle = async () => {
    const next = mode === "classic" ? "chirp" : "classic";
    setLoading(true);
    
    try {
      // Send to backend
      await fetch("/api/tts-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          engine: next,
          timestamp: new Date().toISOString()
        })
      });
      
      setMode(next);
      console.log(`✅ TTS mode switched to: ${next}`);
    } catch (error) {
      console.error("❌ Failed to switch TTS mode:", error);
      // Still update local state even if backend fails
      setMode(next);
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyle = () => {
    const baseStyle = "px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 active:scale-95";
    
    if (mode === "chirp") {
      return `${baseStyle} bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25`;
    } else {
      return `${baseStyle} bg-sky-500 hover:bg-sky-600 shadow-lg shadow-sky-500/25`;
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={getButtonStyle()}
      title={`Aktualnie: ${mode === "chirp" ? "Chirp HD" : "Classic HD"} - Kliknij aby przełączyć`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin">⏳</span>
          Przełączanie...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <span className="text-lg">🎧</span>
          {mode === "chirp" ? "Chirp HD" : "Classic HD"}
        </span>
      )}
    </button>
  );
}


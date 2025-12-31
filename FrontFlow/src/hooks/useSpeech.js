import { useState, useEffect, useCallback } from "react";
import { getApiUrl } from "../lib/config";

export const useSpeech = (options = {}) => {
  const {
    language = "pl-PL",
    continuous = false,
    interimResults = false,
    onResult = null,
    onError = null,
    onEnd = null,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  let recognition = null;

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setError(null);
        if (onResult) {
          onResult(text);
        }
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error:", e);
        setError(e.error);
        setIsListening(false);
        if (onError) {
          onError(e);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (onEnd) {
          onEnd();
        }
      };
    } else {
      setError("Speech recognition not supported in this browser");
    }
  }, [language, continuous, interimResults, onResult, onError, onEnd]);

  // Toggle listening state
  const toggleListening = useCallback(() => {
    if (!recognition) {
      setError("Speech recognition not available");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      setTranscript("");
      setResponse("");
      setError(null);
    }
  }, [isListening, recognition]);

  // Send transcript to backend with proper validation
  const sendToBackend = useCallback(async (text, userId = "demo-user-001") => {
    setLoading(true);
    setError(null);
    
    console.log("🚀 Sending to backend:", { text, userId });
    
    try {
      const res = await fetch(getApiUrl('/api/brain'), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          text: text,
          user_id: userId,
        }),
      });

      console.log("📡 API Response status:", res.status, res.statusText);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("✅ Backend response:", data);

      // Extract response with fallback logic
      const reply = 
        data?.fulfillment_response?.messages?.[0]?.text?.text?.[0] ||
        data?.message ||
        data?.response ||
        "No response received.";
      
      setResponse(reply);
      console.log("🎯 Extracted reply:", reply);
      
    } catch (err) {
      console.error("❌ Backend error:", err);
      const errorMessage = err.message || "Connection error with server";
      setError(errorMessage);
      setResponse(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear all states
  const clearAll = useCallback(() => {
    setTranscript("");
    setResponse("");
    setError(null);
    setLoading(false);
  }, []);

  return {
    isListening,
    transcript,
    response,
    loading,
    error,
    toggleListening,
    sendToBackend,
    clearAll,
  };
};

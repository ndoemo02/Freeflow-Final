import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getApiUrl } from "../lib/config";

export default function VoicePanel() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  let recognition;

  // --- Inicjalizacja STT ---
  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.lang = "pl-PL";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        sendToBackend(text);
      };

      recognition.onerror = (e) => {
        console.error("Błąd rozpoznawania mowy:", e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      alert("Twoja przeglądarka nie obsługuje rozpoznawania mowy 😢");
    }
  }, []);

  // --- Start/stop nasłuchiwania ---
  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      setTranscript("");
      setResponse("");
    }
  };

  // --- Wysyłanie do webhooka FreeFlow ---
  const sendToBackend = async (text) => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/brain'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          user_id: "demo-user-001",
        }),
      });

      const data = await res.json();
      console.log("Odpowiedź backendu:", data);

      const reply =
        data?.fulfillment_response?.messages?.[0]?.text?.text?.[0] ||
        "Brak odpowiedzi.";
      setResponse(reply);
    } catch (err) {
      console.error("Błąd backendu:", err);
      setResponse("Błąd połączenia z serwerem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 text-center">
      <motion.button
        onClick={toggleListening}
        className={`rounded-full p-8 shadow-lg ${
          isListening
            ? "bg-gradient-to-tr from-fuchsia-600 to-purple-700 animate-pulse"
            : "bg-gradient-to-tr from-gray-700 to-gray-900"
        } text-white transition-transform hover:scale-105`}
        whileTap={{ scale: 0.9 }}
      >
        <i className={`fa-solid fa-${isListening ? "microphone" : "microphone-slash"} fa-2x`}></i>
      </motion.button>

      <p className="text-gray-300 mt-4 text-sm italic">
        {isListening ? "Nasłuchiwanie..." : "Kliknij, by mówić"}
      </p>

      <AnimatePresence>
        {transcript && (
          <motion.div
            key="transcript"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-gray-800 p-3 mt-4 rounded-xl text-gray-100 w-full max-w-md"
          >
            <strong>Ty:</strong> {transcript}
          </motion.div>
        )}

        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-fuchsia-400 mt-3"
          >
            Przetwarzanie...
          </motion.div>
        )}

        {response && (
          <motion.div
            key="response"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-fuchsia-700/30 p-3 mt-4 rounded-xl text-fuchsia-200 w-full max-w-md"
          >
            <strong>FreeFlow:</strong> {response}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FreeFlowSandbox() {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);

  const addMessage = (text, sender) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text, sender },
    ]);
  };

  const handleVoiceClick = () => {
    if (isListening) return;
    setIsListening(true);
    addMessage("Dodaj zupę czosnkową", "user");

    setTimeout(() => {
      addMessage("Zupa czosnkowa została dodana do menu 🍲", "ai");
      setIsListening(false);
    }, 1800);
  };

  return (
    <div className="bg-[#0D0D1A] text-white min-h-screen flex flex-col items-center justify-between font-[Inter] overflow-hidden">

      {/* Górny nagłówek */}
      <header className="text-center mt-8">
        <motion.h1
          className="text-3xl font-bold bg-gradient-to-r from-fuchsia-500 to-purple-400 text-transparent bg-clip-text"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          FreeFlow Sandbox
        </motion.h1>
        <p className="text-gray-400 text-sm mt-2">
          Tryb demonstracyjny — AI + Motion 💫
        </p>
      </header>

      {/* Sekcja dymków */}
      <div className="w-full max-w-md px-4 flex flex-col gap-3 overflow-y-auto h-[60vh] mt-6 mb-8 scrollbar-hide">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                  msg.sender === "user"
                    ? "bg-gradient-to-tr from-fuchsia-600 to-purple-700 text-white rounded-br-none"
                    : "bg-[#222] text-gray-200 rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Przycisk mikrofonu */}
      <motion.button
        onClick={handleVoiceClick}
        whileTap={{ scale: 0.9 }}
        animate={{
          scale: isListening ? [1, 1.15, 1] : 1,
          boxShadow: isListening
            ? "0 0 25px rgba(255, 0, 255, 0.7)"
            : "0 0 10px rgba(255, 0, 255, 0.3)",
        }}
        transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
        className={`mb-8 px-10 py-5 rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-3 ${
          isListening
            ? "bg-gradient-to-tr from-fuchsia-600 to-purple-700 text-white"
            : "bg-[#222] hover:bg-[#333]"
        }`}
      >
        <i className="fas fa-microphone text-xl"></i>
        {isListening ? "Słucham..." : "Powiedz coś..."}
      </motion.button>
    </div>
  );
}

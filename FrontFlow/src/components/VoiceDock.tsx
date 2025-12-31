import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Msg = { id: string | number; role: "user" | "assistant"; text: string };

export default function VoiceDock({
  messages,
  value,
  onChange,
  onSubmit,
  recording,
  onMicClick,
  onClearTranscript,
}: {
  messages: Msg[];
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  recording: boolean;
  onMicClick: () => void;
  onClearTranscript?: () => void;
}) {
  // Demo typing animation disabled

  const handleClearTranscript = () => {
    onChange("");
    if (onClearTranscript) {
      onClearTranscript();
    }
  };

  return (
    <div
      className="
      fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 sm:px-6
    "
    >
      <motion.div
        className="
        w-full max-w-3xl rounded-2xl bg-black/40 backdrop-blur-xl
        ring-1 ring-cyan-500/20 shadow-2xl
        "
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 255, 255, 0.05))',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* historia (krótka) */}
        <div className="max-h-40 overflow-y-auto p-3 space-y-2">
          {(messages ?? []).slice(-6).map((m) => (
            <div
              key={m.id}
              className={[
                "text-sm leading-snug",
                m.role === "assistant"
                  ? "text-slate-200"
                  : "text-slate-100 text-right",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block rounded-lg px-3 py-2",
                  m.role === "assistant"
                    ? "bg-white/5 ring-1 ring-white/10"
                    : "bg-orange-500/20 ring-1 ring-orange-400/20",
                ].join(" ")}
              >
                {m.text}
              </span>
            </div>
          ))}
        </div>

        {/* wiersz inputu */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex items-center gap-2 p-3 border-t border-white/10"
        >
          <div className="flex-1 relative">
            <input
              className="
                w-full rounded-xl bg-black/40 backdrop-blur-xl text-white placeholder:text-slate-400
                px-3 py-2 ring-1 ring-cyan-500/20 focus:outline-none focus:ring-2
                focus:ring-cyan-500/60 transition-all duration-200
              "
              placeholder="Powiedz lub wpisz…"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            
          </div>
          
          {/* Clear button */}
          {value && (
            <motion.button
              type="button"
              onClick={handleClearTranscript}
              className="rounded-xl px-3 py-2 text-sm ring-1 bg-red-500/20 text-red-400 ring-red-400/30 hover:bg-red-500/30 transition-all"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              title="Wyczyść pole"
            >
              🗑️
            </motion.button>
          )}
          
          <motion.button
            type="button"
            onClick={onMicClick}
            className={[
              "rounded-xl px-3 py-2 text-sm ring-1 backdrop-blur-xl transition-all",
              recording
                ? "bg-red-600/20 text-white ring-red-400/50 shadow-lg shadow-red-500/20"
                : "bg-black/40 text-slate-100 ring-cyan-500/30 hover:bg-cyan-500/10 hover:ring-cyan-500/50",
            ].join(" ")}
            aria-pressed={recording}
            title={recording ? "Zatrzymaj nagrywanie" : "Rozpocznij nagrywanie"}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              boxShadow: recording 
                ? "0 0 20px rgba(239, 68, 68, 0.4)" 
                : "0 0 0px rgba(0, 255, 255, 0)"
            }}
          >
            <motion.span
              animate={{
                rotate: recording ? [0, 10, -10, 0] : 0
              }}
              transition={{
                duration: 0.5,
                repeat: recording ? Infinity : 0,
                repeatType: "reverse"
              }}
            >
              {recording ? "🛑" : "🎙️"}
            </motion.span>
          </motion.button>
          
          <motion.button
            type="submit"
            className="
              rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white px-3 py-2 text-sm
              font-semibold border border-cyan-500/30 backdrop-blur-xl hover:from-cyan-500/30 hover:to-purple-500/30
              transition-all duration-200
            "
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 0 20px rgba(0, 255, 255, 0.3)"
            }}
            whileTap={{ scale: 0.95 }}
            disabled={!value.trim()}
          >
            Wyślij
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

"use client";
import { motion } from "framer-motion";

export default function MotionPreview() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-b from-[#080808] to-[#111]">
      <motion.div
        className="w-40 h-40 rounded-full bg-gradient-to-tr from-cyan-400/30 to-pink-400/20 backdrop-blur-xl border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
        animate={{
          scale: [1, 1.15, 1],
          y: [0, -15, 0],
          rotate: [0, 10, -10, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

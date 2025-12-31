import React, { useState } from "react";
import { motion } from "framer-motion";

export default function MotionTiles() {
  const [theme, setTheme] = useState("neon"); // neon | clean

  const tiles = [
    { id: 1, label: "Jedzenie", icon: "🍕", color: "#ff00ff" },
    { id: 2, label: "Taxi", icon: "🚖", color: "#00ffff" },
    { id: 3, label: "Hotel", icon: "🏨", color: "#ff9900" },
  ];

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.2, type: "spring", stiffness: 250 },
    }),
  };

  const bg =
    theme === "neon"
      ? "bg-[#0D0D1A]"
      : "bg-gradient-to-br from-gray-100 to-gray-300 text-black";

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${bg}`}>
      <div className="mb-10 flex items-center gap-3">
        <h2 className="text-xl font-bold">
          {theme === "neon" ? "🌌 FreeFlow Neon" : "🪶 Clean Mode"}
        </h2>
        <button
          onClick={() => setTheme(theme === "neon" ? "clean" : "neon")}
          className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm text-white"
        >
          Przełącz
        </button>
      </div>

      <div className="flex gap-6">
        {tiles.map((tile, i) => (
          <motion.div
            key={tile.id}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            whileHover={{
              scale: 1.08,
              boxShadow:
                theme === "neon"
                  ? `0 0 20px ${tile.color}`
                  : "0 4px 20px rgba(0,0,0,0.2)",
            }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className={`w-40 h-40 rounded-2xl cursor-pointer flex flex-col items-center justify-center 
              ${
                theme === "neon"
                  ? "bg-[#161622] border border-fuchsia-700/40 text-white"
                  : "bg-white border border-gray-400"
              }`}
          >
            <motion.span
              className="text-4xl mb-2"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, delay: i * 0.3 }}
            >
              {tile.icon}
            </motion.span>
            <p className="font-semibold">{tile.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
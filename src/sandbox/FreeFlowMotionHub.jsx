import React from "react";
import { motion } from "framer-motion";
import bgImg from "../assets/Background.png";
import logo from "../assets/Freeflowlogo.png";

export default function FreeFlowMotionHub() {
  const tiles = [
    { id: 1, label: "Jedzenie", icon: "🍕", color: "#ff007f", bgColor: "from-pink-600 to-fuchsia-700" },
    { id: 2, label: "Taxi", icon: "🚖", color: "#00ffff", bgColor: "from-cyan-500 to-blue-600" },
    { id: 3, label: "Hotel", icon: "🏨", color: "#ff9900", bgColor: "from-orange-500 to-yellow-600" },
  ];

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.25, type: "spring", stiffness: 220 },
    }),
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: `url(${bgImg})` }}
    >
      {/* Blur Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

      {/* Logo */}
      <motion.img
        src={logo}
        alt="FreeFlow logo"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 w-64 md:w-72 mb-10 drop-shadow-[0_0_25px_rgba(255,100,0,0.8)]"
      />

      {/* Kafelki */}
      <div className="relative z-10 flex gap-6">
        {tiles.map((tile, i) => (
          <motion.div
            key={tile.id}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            whileHover={{
              scale: 1.08,
              boxShadow: `0 0 20px ${tile.color}`,
            }}
            className={`w-36 h-36 rounded-2xl bg-gradient-to-br ${tile.bgColor} border border-white/20 
                       text-white flex flex-col items-center justify-center backdrop-blur-md 
                       cursor-pointer transition-all duration-200 shadow-lg`}
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

      {/* Subtext */}
      <p className="relative z-10 text-gray-400 mt-10 text-sm">
        Powiedz lub wybierz opcję, aby rozpocząć ✨
      </p>
    </div>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function MotionPlayground() {
  const [showBox, setShowBox] = useState(true);
  const [currentAnimation, setCurrentAnimation] = useState(0);

  const animations = [
    { name: "Bounce", animate: { y: [0, -50, 0] } },
    { name: "Rotate", animate: { rotate: [0, 360] } },
    { name: "Scale", animate: { scale: [1, 1.5, 1] } },
    { name: "Pulse", animate: { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } },
    { name: "Shake", animate: { x: [0, -10, 10, -10, 10, 0] } },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0D0D1A, #1a0933, #2D1B69)",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        padding: "20px",
      }}
    >
      <h1 style={{ marginBottom: "40px", fontSize: "2.5rem" }}>
        🎬 Motion Playground
      </h1>

      {/* Animation Controls */}
      <div style={{ marginBottom: "30px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {animations.map((anim, index) => (
          <button
            key={index}
            onClick={() => setCurrentAnimation(index)}
            style={{
              padding: "10px 20px",
              background: currentAnimation === index ? "#ff00ff" : "#333",
              color: "#fff",
              border: "none",
              borderRadius: "20px",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            {anim.name}
          </button>
        ))}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setShowBox(!showBox)}
        style={{
          padding: "15px 30px",
          background: "linear-gradient(135deg, #ff00ff, #8A2BE2)",
          color: "#fff",
          border: "none",
          borderRadius: "25px",
          cursor: "pointer",
          fontSize: "16px",
          marginBottom: "30px",
          boxShadow: "0 4px 15px rgba(255, 0, 255, 0.3)",
        }}
      >
        {showBox ? "Hide" : "Show"} Box
      </button>

      {/* Animated Box */}
      <AnimatePresence>
        {showBox && (
          <motion.div
            key="animated-box"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              ...animations[currentAnimation].animate,
              opacity: 1,
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              width: 150,
              height: 150,
              borderRadius: "20px",
              background: "linear-gradient(135deg, #ff00ff, #8A2BE2, #00ffff)",
              boxShadow: "0 0 30px #ff00ff88",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: "bold",
            }}
          >
            {animations[currentAnimation].name}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Equalizer */}
      <div style={{ marginTop: "40px", display: "flex", alignItems: "end", gap: "5px" }}>
        {[...Array(7)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              height: [20, 60, 30, 80, 40, 70, 25][i],
              opacity: [0.6, 1, 0.8, 1, 0.7, 1, 0.6],
            }}
            transition={{
              repeat: Infinity,
              repeatType: "reverse",
              duration: 0.8 + i * 0.1,
            }}
            style={{
              width: "8px",
              background: "linear-gradient(to top, #ff00ff, #8A2BE2)",
              borderRadius: "4px",
              boxShadow: "0 0 10px #ff00ff88",
            }}
          />
        ))}
      </div>

      <p style={{ marginTop: "30px", opacity: 0.7 }}>
        Current: {animations[currentAnimation].name} | Framer Motion v12.23.22
      </p>
    </div>
  );
}


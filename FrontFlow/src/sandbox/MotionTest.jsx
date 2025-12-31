import { motion } from "framer-motion";

export default function MotionTest() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #0D0D1A, #1a0933)",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #ff00ff, #8A2BE2)",
          boxShadow: "0 0 20px #ff00ff88",
        }}
      />
      <h2 style={{ marginTop: "30px" }}>Motion działa! 🚀</h2>
    </div>
  );
}


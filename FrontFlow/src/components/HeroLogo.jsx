import { motion, useMotionValue, useTransform } from "framer-motion";
import React from "react";
import "../styles/hero.css";

export default function HeroLogo() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [0, 500], [10, -10]);
  const rotateY = useTransform(x, [0, 500], [-10, 10]);
  const glowOpacity = useTransform(y, [0, 500], [0.4, 1]);
  const glowScale = useTransform(x, [0, 500], [1, 1.2]);

  const handleMouseMove = (event) => {
    const { left, top, width, height } =
      event.currentTarget.getBoundingClientRect();
    const posX = event.clientX - left;
    const posY = event.clientY - top;
    x.set(posX);
    y.set(posY);
  };

  return (
    <div className="hero-container" onMouseMove={handleMouseMove}>
      <motion.div
        className="neon-glow"
        style={{
          opacity: glowOpacity,
          scale: glowScale,
          x: "-50%",
          y: "-50%",
        }}
      />
      <motion.img
        src="/src/assets/FreeFlow.png"
        alt="FreeFlow Logo"
        className="hero-logo"
        style={{
          rotateX,
          rotateY,
        }}
      />
    </div>
  );
}

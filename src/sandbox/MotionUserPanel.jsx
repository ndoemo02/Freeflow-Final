import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MotionUserPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const menuVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: -20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: -20,
      transition: { duration: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.1 }
    })
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Animated Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white p-3 rounded-full shadow-lg"
      >
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          👤
        </motion.span>
      </motion.button>

      {/* Animated Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-16 right-0 bg-black/80 backdrop-blur-xl text-white p-4 rounded-xl shadow-2xl border border-cyan-500/30 min-w-48"
          >
            <div className="space-y-2">
              {["Profil", "Ustawienia", "Wyloguj"].map((item, i) => (
                <motion.div
                  key={item}
                  custom={i}
                  variants={itemVariants}
                  whileHover={{ 
                    x: 5,
                    backgroundColor: "rgba(0, 255, 255, 0.1)"
                  }}
                  className="p-3 rounded-lg cursor-pointer transition-colors"
                >
                  {item}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


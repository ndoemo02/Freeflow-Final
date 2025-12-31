import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  Plus, 
  ShoppingCart, 
  Settings, 
  User, 
  Package,
  X,
  Mic,
  Bell
} from "lucide-react";

const fabItems = [
  { 
    icon: <ShoppingCart size={20} />, 
    label: "Koszyk", 
    color: "from-orange-500 to-red-400",
    delay: 0.1
  },
  { 
    icon: <Package size={20} />, 
    label: "Zamówienia", 
    color: "from-purple-500 to-pink-400",
    delay: 0.2
  },
  { 
    icon: <Mic size={20} />, 
    label: "Voice", 
    color: "from-cyan-500 to-blue-400",
    delay: 0.3
  },
  { 
    icon: <Settings size={20} />, 
    label: "Ustawienia", 
    color: "from-gray-500 to-slate-400",
    delay: 0.4
  },
];

export default function FreeFlowFAB() {
  const [isOpen, setIsOpen] = useState(false);

  const fabVariants = {
    closed: { 
      scale: 1,
      rotate: 0,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    },
    open: { 
      scale: 1.1,
      rotate: 45,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  };

  const menuVariants = {
    closed: {
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.2,
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    },
    open: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    closed: {
      opacity: 0,
      scale: 0,
      x: 0,
      y: 0
    },
    open: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Menu Items */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute bottom-16 right-0 flex flex-col gap-3"
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            {fabItems.map((item, index) => (
              <motion.div
                key={item.label}
                variants={itemVariants}
                style={{
                  y: (index + 1) * -70,
                  x: Math.sin(index * 0.5) * 20
                }}
              >
                <motion.button
                  whileHover={{ 
                    scale: 1.1,
                    y: -5,
                    transition: { type: "spring", stiffness: 400 }
                  }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-14 h-14 rounded-full bg-gradient-to-br ${item.color} shadow-lg flex items-center justify-center text-white relative group`}
                >
                  {/* Ripple effect */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-white/20"
                    initial={{ scale: 0, opacity: 0 }}
                    whileHover={{ 
                      scale: 1.5, 
                      opacity: [0, 0.3, 0],
                      transition: { duration: 0.6 }
                    }}
                  />
                  
                  {item.icon}
                  
                  {/* Tooltip */}
                  <motion.div
                    className="absolute right-16 top-1/2 -translate-y-1/2 bg-[#0d0d1a] text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={{ x: 10, opacity: 0 }}
                    whileHover={{ x: 0, opacity: 1 }}
                  >
                    {item.label}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-[#0d0d1a] border-t-4 border-t-transparent border-b-4 border-b-transparent" />
                  </motion.div>
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        variants={fabVariants}
        animate={isOpen ? "open" : "closed"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-2xl flex items-center justify-center text-white relative overflow-hidden"
      >
        {/* Animated background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-fuchsia-400 to-purple-500"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Icon */}
        <motion.div
          className="relative z-10"
          animate={isOpen ? { rotate: 45 } : { rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {isOpen ? <X size={24} /> : <Plus size={24} />}
        </motion.div>

        {/* Pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-fuchsia-400"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.8, 0, 0.8]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


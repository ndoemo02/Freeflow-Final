import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  ShoppingCart, 
  Settings, 
  User, 
  UserPlus, 
  Package, 
  Bell,
  Shield,
  Palette,
  Mic,
  Eye,
  ChevronRight,
  Sparkles
} from "lucide-react";

const menuItems = [
  { 
    id: "login",
    icon: <User size={20} />, 
    label: "Zaloguj", 
    route: "/login",
    type: "auth",
    color: "from-blue-500 to-cyan-400",
    glowColor: "shadow-blue-500/50"
  },
  { 
    id: "register",
    icon: <UserPlus size={20} />, 
    label: "Zarejestruj", 
    route: "/register",
    type: "auth",
    color: "from-green-500 to-emerald-400",
    glowColor: "shadow-green-500/50"
  },
  { 
    id: "cart",
    icon: <ShoppingCart size={20} />, 
    label: "Koszyk", 
    route: "/cart",
    type: "orders",
    color: "from-orange-500 to-red-400",
    glowColor: "shadow-orange-500/50",
    badge: true,
    pulse: true
  },
  { 
    id: "orders",
    icon: <Package size={20} />, 
    label: "Zamówienia", 
    route: "/orders",
    type: "orders",
    color: "from-purple-500 to-pink-400",
    glowColor: "shadow-purple-500/50"
  },
  { 
    id: "settings",
    icon: <Settings size={20} />, 
    label: "Ustawienia", 
    route: "/settings",
    type: "system",
    color: "from-gray-500 to-slate-400",
    glowColor: "shadow-gray-500/50"
  },
];

export default function FreeFlowMenuAdvanced() {
  const [activeItem, setActiveItem] = useState(null);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  
  // Motion values for advanced effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  const handleItemClick = (item) => {
    if (item.type === "system" || item.type === "orders") {
      setActiveItem(item);
      setShowSubMenu(true);
    } else {
      console.log(`Navigating to: ${item.route}`);
    }
  };

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left - rect.width / 2);
    mouseY.set(event.clientY - rect.top - rect.height / 2);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 100, scale: 0.8 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.8 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { 
        type: "spring", 
        stiffness: 200,
        damping: 20
      }
    },
    hover: {
      scale: 1.15,
      y: -8,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    }
  };

  const subMenuVariants = {
    hidden: { 
      opacity: 0, 
      height: 0,
      y: -30,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      height: "auto",
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    exit: {
      opacity: 0,
      height: 0,
      y: -30,
      scale: 0.9,
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full z-50">
      {/* Main Menu */}
      <motion.div
        className="bg-[#0d0d1a]/90 backdrop-blur-xl text-white flex justify-around py-4 border-t border-fuchsia-500/20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onMouseMove={handleMouseMove}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d"
        }}
      >
        {menuItems.map((item, index) => (
          <motion.div
            key={item.id}
            variants={itemVariants}
            whileHover="hover"
            onHoverStart={() => setHoveredItem(item.id)}
            onHoverEnd={() => setHoveredItem(null)}
            className="relative"
          >
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => handleItemClick(item)}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl bg-gradient-to-br ${item.color} ${item.glowColor} shadow-lg transition-all duration-300 relative overflow-hidden`}
              style={{
                transformStyle: "preserve-3d"
              }}
            >
              {/* Pulse effect for cart */}
              {item.pulse && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-fuchsia-400/20 to-purple-400/20 rounded-2xl"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}

              {/* Badge */}
              {item.badge && (
                <motion.div
                  className="absolute -top-1 -right-1 w-4 h-4 bg-fuchsia-500 rounded-full flex items-center justify-center"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Sparkles size={8} className="text-white" />
                </motion.div>
              )}

              {/* Hover glow effect */}
              <AnimatePresence>
                {hoveredItem === item.id && (
                  <motion.div
                    className="absolute inset-0 bg-white/20 rounded-2xl"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </AnimatePresence>

              <motion.div
                animate={hoveredItem === item.id ? { 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1]
                } : {}}
                transition={{ duration: 0.5 }}
              >
                {item.icon}
              </motion.div>
              
              <motion.span 
                className="text-xs font-semibold text-white"
                animate={hoveredItem === item.id ? { 
                  y: [-2, 2, -2],
                  color: ["#ffffff", "#f0f0f0", "#ffffff"]
                } : {}}
                transition={{ duration: 0.3 }}
              >
                {item.label}
              </motion.span>
            </motion.button>
          </motion.div>
        ))}
      </motion.div>

      {/* Sub Menu with 3D effect */}
      <AnimatePresence>
        {showSubMenu && activeItem && (
          <motion.div
            className="bg-[#0d0d1a]/95 backdrop-blur-xl border-t border-fuchsia-500/30"
            variants={subMenuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              transformStyle: "preserve-3d"
            }}
          >
            <div className="p-6">
              <motion.div
                className="flex items-center gap-3 mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${activeItem.color}`}>
                  {activeItem.icon}
                </div>
                <h3 className="text-fuchsia-400 text-lg font-semibold">
                  {activeItem.label}
                </h3>
              </motion.div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { icon: <User size={16} />, label: "Profil użytkownika", desc: "Nazwa, język, preferencje" },
                  { icon: <Mic size={16} />, label: "Asystent głosowy", desc: "Voice Mode, TTS/STT" },
                  { icon: <Palette size={16} />, label: "Motyw / UI", desc: "Jasny/ciemny, akcent" },
                  { icon: <Bell size={16} />, label: "Powiadomienia", desc: "Push, SMS, e-mail" },
                  { icon: <Shield size={16} />, label: "Prywatność", desc: "Brak profilowania ❤️" },
                ].map((subItem, index) => (
                  <motion.button
                    key={subItem.label}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileHover={{ 
                      scale: 1.02, 
                      x: 10,
                      transition: { type: "spring", stiffness: 400 }
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                  >
                    <motion.div
                      className="p-2 rounded-lg bg-fuchsia-500/20 group-hover:bg-fuchsia-500/30 transition-colors"
                      whileHover={{ rotate: 5 }}
                    >
                      {subItem.icon}
                    </motion.div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{subItem.label}</p>
                      <p className="text-gray-400 text-sm">{subItem.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-fuchsia-400 transition-colors" />
                  </motion.button>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSubMenu(false)}
                className="mt-6 w-full py-3 text-fuchsia-400 text-sm font-semibold bg-fuchsia-500/10 hover:bg-fuchsia-500/20 rounded-xl transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Zamknij
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


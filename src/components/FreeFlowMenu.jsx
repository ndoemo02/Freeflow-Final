import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingCart, 
  Settings, 
  User, 
  UserPlus, 
  Package, 
  LogOut,
  Bell,
  Shield,
  Palette,
  Mic,
  Eye
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  { 
    icon: <User size={20} />, 
    label: "Zaloguj", 
    route: "/login",
    type: "auth",
    color: "text-blue-400",
    hoverColor: "hover:text-blue-300"
  },
  { 
    icon: <UserPlus size={20} />, 
    label: "Zarejestruj", 
    route: "/register",
    type: "auth",
    color: "text-green-400",
    hoverColor: "hover:text-green-300"
  },
  { 
    icon: <ShoppingCart size={20} />, 
    label: "Koszyk", 
    route: "/cart",
    type: "orders",
    color: "text-orange-400",
    hoverColor: "hover:text-orange-300",
    badge: true
  },
  { 
    icon: <Package size={20} />, 
    label: "Zamówienia", 
    route: "/orders",
    type: "orders",
    color: "text-purple-400",
    hoverColor: "hover:text-purple-300"
  },
  { 
    icon: <Settings size={20} />, 
    label: "Ustawienia", 
    route: "/settings",
    type: "system",
    color: "text-gray-400",
    hoverColor: "hover:text-gray-300"
  },
];

const subMenuItems = {
  settings: [
    { icon: <User size={16} />, label: "Profil", route: "/profile" },
    { icon: <Mic size={16} />, label: "Asystent głosowy", route: "/voice-settings" },
    { icon: <Palette size={16} />, label: "Motyw", route: "/theme" },
    { icon: <Bell size={16} />, label: "Powiadomienia", route: "/notifications" },
    { icon: <Shield size={16} />, label: "Prywatność", route: "/privacy" },
  ],
  orders: [
    { icon: <ShoppingCart size={16} />, label: "Mój koszyk", route: "/cart" },
    { icon: <Package size={16} />, label: "Historia", route: "/orders" },
    { icon: <Eye size={16} />, label: "Status", route: "/order-status" },
  ]
};

export default function FreeFlowMenu({ variant = "bottom" }) {
  const [activeItem, setActiveItem] = useState(null);
  const [showSubMenu, setShowSubMenu] = useState(false);

  const handleItemClick = (item) => {
    if (item.type === "system" || item.type === "orders") {
      setActiveItem(item);
      setShowSubMenu(true);
    } else {
      // Navigate to route
      console.log(`Navigating to: ${item.route}`);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 80 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 200 }
    }
  };

  const subMenuVariants = {
    hidden: { 
      opacity: 0, 
      height: 0,
      y: -20
    },
    visible: {
      opacity: 1,
      height: "auto",
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      opacity: 0,
      height: 0,
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  };

  if (variant === "bottom") {
    return (
      <>
        <motion.div
          className="fixed bottom-0 left-0 w-full bg-[#0d0d1a]/90 backdrop-blur-lg text-white flex justify-around py-4 border-t border-fuchsia-500/20 z-50"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {menuItems.map((item, index) => (
            <motion.button
              key={item.label}
              variants={itemVariants}
              whileTap={{ scale: 0.85 }}
              whileHover={{ 
                scale: 1.1,
                y: -2
              }}
              onClick={() => handleItemClick(item)}
              className={`flex flex-col items-center gap-1 text-sm ${item.color} ${item.hoverColor} transition-all duration-200 relative`}
            >
              {item.badge && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-fuchsia-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Sub Menu */}
        <AnimatePresence>
          {showSubMenu && activeItem && (
            <motion.div
              className="fixed bottom-20 left-0 w-full bg-[#0d0d1a]/95 backdrop-blur-xl border-t border-fuchsia-500/30 z-40"
              variants={subMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="p-4">
                <h3 className="text-fuchsia-400 text-sm font-semibold mb-3">
                  {activeItem.label}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {subMenuItems[activeItem.type]?.map((subItem) => (
                    <motion.button
                      key={subItem.label}
                      whileHover={{ scale: 1.05, x: 5 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                    >
                      {subItem.icon}
                      <span className="text-sm text-gray-300">{subItem.label}</span>
                    </motion.button>
                  ))}
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSubMenu(false)}
                  className="mt-3 w-full py-2 text-fuchsia-400 text-sm font-medium"
                >
                  Zamknij
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Side Menu Variant
  return (
    <motion.div
      className="fixed left-0 top-0 h-full w-80 bg-[#0d0d1a]/95 backdrop-blur-xl text-white border-r border-fuchsia-500/20 z-50"
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
    >
      <div className="p-6">
        <motion.h2 
          className="text-2xl font-bold bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          FreeFlow
        </motion.h2>
        
        <div className="space-y-2">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ x: 10, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl ${item.color} ${item.hoverColor} transition-all duration-200 hover:bg-white/5`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <motion.div
                  className="ml-auto w-2 h-2 bg-fuchsia-500 rounded-full"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}


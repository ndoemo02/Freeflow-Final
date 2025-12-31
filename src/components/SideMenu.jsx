import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, 
  X, 
  Home, 
  ShoppingCart, 
  Settings, 
  User, 
  Mic,
  History,
  Bell
} from "lucide-react";

export default function SideMenu({ 
  isOpen, 
  onClose, 
  onNavigate,
  currentPage = "home",
  className = ""
}) {
  const menuItems = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "orders", label: "Orders", icon: ShoppingCart, path: "/orders" },
    { id: "voice", label: "Voice Assistant", icon: Mic, path: "/voice" },
    { id: "history", label: "History", icon: History, path: "/history" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  const handleItemClick = (item) => {
    onNavigate(item.path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          
          {/* Side Menu */}
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed left-0 top-0 h-full w-80 bg-gray-900 shadow-2xl z-50 ${className}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">FreeFlow</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  
                  return (
                    <motion.li
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <button
                        onClick={() => handleItemClick(item)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          isActive
                            ? "bg-fuchsia-600 text-white shadow-lg"
                            : "text-gray-300 hover:bg-gray-700 hover:text-white"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                        {isActive && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="ml-auto w-2 h-2 bg-white rounded-full"
                          />
                        )}
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
              <div className="text-center text-sm text-gray-400">
                <p>FreeFlow v1.0</p>
                <p className="mt-1">Voice-to-Action System</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}



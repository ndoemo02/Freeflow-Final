import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Transition } from "@headlessui/react";
import { User, Settings, LogOut, ChevronDown, Bell, Shield } from "lucide-react";
import { create } from "zustand";

// Zustand Store
const useUserStore = create((set) => ({
  user: {
    name: "Jan Kowalski",
    email: "jan@example.com",
    avatar: null,
    isOnline: true
  },
  notifications: 3,
  isMenuOpen: false,
  setMenuOpen: (isOpen) => set({ isMenuOpen: isOpen }),
  updateUser: (userData) => set((state) => ({ 
    user: { ...state.user, ...userData } 
  })),
  clearNotifications: () => set({ notifications: 0 }),
}));

export default function StateUserPanel() {
  const { 
    user, 
    notifications, 
    isMenuOpen, 
    setMenuOpen, 
    clearNotifications 
  } = useUserStore();

  const menuItems = [
    { 
      icon: <User size={16} />, 
      label: "Profil", 
      color: "text-cyan-400",
      action: () => console.log("Profil clicked")
    },
    { 
      icon: <Settings size={16} />, 
      label: "Ustawienia", 
      color: "text-emerald-400",
      action: () => console.log("Ustawienia clicked")
    },
    { 
      icon: <Bell size={16} />, 
      label: "Powiadomienia", 
      color: "text-yellow-400",
      badge: notifications,
      action: clearNotifications
    },
    { 
      icon: <Shield size={16} />, 
      label: "Bezpieczeństwo", 
      color: "text-red-400",
      action: () => console.log("Bezpieczeństwo clicked")
    },
    { 
      icon: <LogOut size={16} />, 
      label: "Wyloguj", 
      color: "text-gray-400",
      action: () => console.log("Wyloguj clicked")
    },
  ];

  return (
    <div className="fixed top-4 right-4 z-50">
      <Menu as="div" className="relative">
        {({ open }) => (
          <>
            {/* Button with State */}
            <Menu.Button as={motion.button}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMenuOpen(open)}
              className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white p-3 rounded-full shadow-lg flex items-center gap-2 relative"
            >
              <User size={20} />
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown size={16} />
              </motion.div>
              
              {/* Online Status */}
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </Menu.Button>

            {/* Dropdown */}
            <Transition
              as={React.Fragment}
              enter="transition ease-out duration-200"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute top-16 right-0 bg-black/90 backdrop-blur-xl text-white p-4 rounded-xl shadow-2xl border border-cyan-500/30 min-w-56 focus:outline-none">
                {/* User Info with State */}
                <div className="flex items-center gap-3 p-3 border-b border-gray-700 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center relative">
                    <User size={20} />
                    <motion.div
                      className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                    <p className="text-xs text-green-400">Online</p>
                  </div>
                </div>

                {/* Menu Items with Actions */}
                <div className="space-y-1">
                  {menuItems.map((item, i) => (
                    <Menu.Item key={item.label}>
                      {({ active }) => (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={item.action}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all relative ${
                            active ? 'bg-cyan-500/20' : ''
                          }`}
                        >
                          <span className={item.color}>{item.icon}</span>
                          <span>{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                            >
                              {item.badge}
                            </motion.span>
                          )}
                        </motion.div>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </Menu.Items>
            </Transition>
          </>
        )}
      </Menu>
    </div>
  );
}


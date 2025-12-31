import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Transition } from "@headlessui/react";
import { User, Settings, LogOut, ChevronDown, Bell, Shield } from "lucide-react";

export default function HeadlessUserPanel() {
  const menuItems = [
    { icon: <User size={16} />, label: "Profil", color: "text-cyan-400" },
    { icon: <Settings size={16} />, label: "Ustawienia", color: "text-emerald-400" },
    { icon: <Bell size={16} />, label: "Powiadomienia", color: "text-yellow-400" },
    { icon: <Shield size={16} />, label: "Bezpieczeństwo", color: "text-red-400" },
    { icon: <LogOut size={16} />, label: "Wyloguj", color: "text-gray-400" },
  ];

  return (
    <div className="fixed top-4 right-4 z-50">
      <Menu as="div" className="relative">
        {({ open }) => (
          <>
            {/* Button */}
            <Menu.Button as={motion.button}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white p-3 rounded-full shadow-lg flex items-center gap-2"
            >
              <User size={20} />
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown size={16} />
              </motion.div>
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
                {/* User Info */}
                <div className="flex items-center gap-3 p-3 border-b border-gray-700 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">Jan Kowalski</p>
                    <p className="text-sm text-gray-400">jan@example.com</p>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="space-y-1">
                  {menuItems.map((item, i) => (
                    <Menu.Item key={item.label}>
                      {({ active }) => (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            active ? 'bg-cyan-500/20' : ''
                          }`}
                        >
                          <span className={item.color}>{item.icon}</span>
                          <span>{item.label}</span>
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


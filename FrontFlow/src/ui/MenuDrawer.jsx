import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useUI } from "../state/ui"
import { useAuth } from "../state/auth"

import { getUserRole } from "../lib/menuBuilder"

export default function MenuDrawer() {
  const isOpen = useUI((s) => s.drawerOpen)
  const close = useUI((s) => s.closeDrawer)
  const openAuth = useUI((s) => s.openAuth)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [expandedSections, setExpandedSections] = useState({})

  // Określ rolę użytkownika
  const userRole = getUserRole(user)

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && isOpen && close()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, close])

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const MenuItem = ({ icon, text, onClick, isSubItem = false, isDanger = false, route = null, requiresAuth = false }) => {
    const handleClick = () => {
      if (route) {
        // Wymagaj zalogowania dla paneli
        if ((requiresAuth || route.startsWith('/panel')) && !user?.id) {
          openAuth();
          return;
        }
        navigate(route);
        close();
      } else if (onClick) {
        onClick();
      }
    };

    return (
      <motion.li
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer ${isSubItem ? 'ml-6 text-sm' : 'text-base'
          } ${isDanger ? 'text-red-400 hover:bg-red-500/20' : 'text-white hover:bg-white/10'
          }`}
        onClick={handleClick}
      >
        <span className="text-lg">{icon}</span>
        <span className="flex-1">{text}</span>
      </motion.li>
    );
  };

  const ExpandableSection = ({ title, icon, children, isExpanded }) => (
    <>
      <motion.button
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => toggleSection(title)}
        className="w-full flex items-center justify-between p-4 rounded-xl bg-black/30 backdrop-blur-xl border border-white/20 hover:bg-black/50 transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <span className="text-white font-semibold">{title}</span>
        </div>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/60"
        >
          ▼
        </motion.span>
      </motion.button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={close}
          />

          {/* Menu Panel */}
          <motion.aside
            role="dialog"
            aria-label="Menu"
            className="fixed top-4 right-4 z-50 w-80 h-[calc(100vh-2rem)] bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.8, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20 bg-gradient-to-r from-white/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400/20 to-pink-500/20 backdrop-blur-sm border border-orange-400/30 flex items-center justify-center shadow-lg">
                  <span className="text-orange-300 font-bold text-lg">FF</span>
                </div>
                <h2 className="text-white font-bold text-lg bg-gradient-to-r from-orange-300 to-pink-300 bg-clip-text text-transparent">FreeFlow</h2>
              </div>
              <button
                onClick={close}
                className="w-10 h-10 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/20 text-white/70 hover:text-white hover:bg-black/60 transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-white/10"
                aria-label="Zamknij menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {/* Główne sekcje */}
                <MenuItem icon="🏠" text="Główne" onClick={close} />
                <MenuItem icon="🍽️" text="Odkrywaj Jedzenie" route="/restaurants" />
                <MenuItem icon="📅" text="Rezerwacje Stolików" route="/reservations" />

                {/* Separator */}
                <div className="my-4 h-px bg-white/20"></div>

                {/* Panele */}
                <ExpandableSection
                  title="Panele"
                  icon="📂"
                  isExpanded={expandedSections['Panele']}
                >
                  <MenuItem icon="🙍" text="Panel Klienta" route="/panel/customer" isSubItem requiresAuth />
                  <MenuItem icon="🏢" text="Panel Biznesowy" route="/panel/business" isSubItem requiresAuth />
                  <MenuItem icon="🆕" text="Panel Biznesowy v2" route="/panel/business-v2" isSubItem requiresAuth />
                  <MenuItem icon="📈" text="Analytics" route="/admin" isSubItem requiresAuth />
                </ExpandableSection>

                {/* Moja Aktywność */}
                <ExpandableSection
                  title="Moja Aktywność"
                  icon="📊"
                  isExpanded={expandedSections['Moja Aktywność']}
                >
                  <MenuItem icon="🛒" text="Koszyk" onClick={() => {/* TODO: otwórz koszyk */ }} isSubItem />
                  <MenuItem icon="📜" text="Historia" route="/order-history" isSubItem />
                  <MenuItem icon="❤️" text="Ulubione" route="/favorites" isSubItem />
                  <MenuItem icon="🚕" text="Moje Taksówki" route="/my-taxis" isSubItem />
                  <MenuItem icon="🏨" text="Moje Hotele" route="/my-hotels" isSubItem />
                </ExpandableSection>

                {/* Ustawienia i Pomoc */}
                <ExpandableSection
                  title="Ustawienia i Pomoc"
                  icon="⚙️"
                  isExpanded={expandedSections['Ustawienia i Pomoc']}
                >
                  <MenuItem icon="👤" text="Profil" route="/profile" isSubItem />
                  <MenuItem icon="🎤" text="Ustawienia Głosu" route="/voice-settings" isSubItem />
                  <MenuItem icon="🔔" text="Powiadomienia" route="/notifications" isSubItem />
                  <MenuItem icon="❓" text="FAQ" route="/faq" isSubItem />
                  <MenuItem icon="📞" text="Kontakt" route="/contact" isSubItem />
                </ExpandableSection>

                {/* Separator */}
                <div className="my-4 h-px bg-white/20"></div>

                {/* User Info */}
                <div className="p-4 rounded-xl bg-black/30 backdrop-blur-xl border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400/20 to-purple-500/20 backdrop-blur-sm border border-blue-400/30 flex items-center justify-center shadow-lg">
                      <span className="text-blue-300 font-bold text-sm">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">
                        {user?.email || 'Gość'}
                      </p>
                      <p className="text-white/60 text-xs">
                        {user?.id ? (userRole === 'admin' ? 'Administrator' : userRole === 'business' ? 'Właściciel' : 'Użytkownik') : 'Niezalogowany'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div className="my-4 h-px bg-white/20"></div>

                {/* Zarządzanie - tylko dla admin/business */}
                {(userRole === 'admin' || userRole === 'business') && (
                  <ExpandableSection
                    title="Zarządzanie"
                    icon="🔧"
                    isExpanded={expandedSections['Zarządzanie']}
                  >
                    <MenuItem icon="📈" text="Panel Biznesowy" route="/business-panel" isSubItem />
                    <MenuItem icon="🔑" text="Panel Admina" route="/admin-panel" isSubItem />
                  </ExpandableSection>
                )}

                {/* Labs - tylko dla admin */}
                {userRole === 'admin' && (
                  <ExpandableSection
                    title="Labs (DEV)"
                    icon="🚀"
                    isExpanded={expandedSections['Labs (DEV)']}
                  >
                    <MenuItem icon="🧪" text="Testy API" route="/dev/api-tests" isSubItem />
                    <MenuItem icon="📊" text="Analytics" route="/dev/analytics" isSubItem />
                    <MenuItem icon="🔧" text="Debug Tools" route="/dev/debug" isSubItem />
                    <MenuItem icon="🗄️" text="Database" route="/dev/database" isSubItem />
                    <MenuItem icon="📝" text="Logs" route="/dev/logs" isSubItem />
                  </ExpandableSection>
                )}

                {/* Auth action */}
                {user?.id ? (
                  <MenuItem icon="🚪" text="Wyloguj się" onClick={() => { signOut(); close(); }} isDanger />
                ) : (
                  <MenuItem icon="🔐" text="Zaloguj się" onClick={() => { openAuth(); }} />
                )}
              </ul>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
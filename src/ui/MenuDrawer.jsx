import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useUI } from "../state/ui"
import { useAuth } from "../state/auth"

import { getUserRole } from "../lib/menuBuilder"
import { ROUTES, FEATURE_FLAGS, isRouteEnabled } from "../app/routeConfig"

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
          } ${isDanger ? 'text-red-400 hover:bg-red-500/20' : 'text-white/90 hover:bg-white/[0.08] hover:backdrop-blur-sm'
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
        className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] hover:bg-white/[0.12] transition-all duration-200 group"
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
          {/* Backdrop - frosted overlay */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={close}
          />

          {/* Menu Panel - glassmorphism */}
          <motion.aside
            role="dialog"
            aria-label="Menu"
            className="fixed top-4 right-4 z-50 w-80 h-[calc(100vh-2rem)] bg-white/[0.08] backdrop-blur-3xl rounded-2xl border border-white/[0.18] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' }}
            initial={{ scale: 0.95, opacity: 0, x: 20 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0.95, opacity: 0, x: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - glass layer */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.12] bg-white/[0.05] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.15] backdrop-blur-md border border-white/[0.2] flex items-center justify-center shadow-lg">
                  <span className="text-orange-300 font-bold text-lg">FF</span>
                </div>
                <h2 className="text-white font-bold text-lg">FreeFlow</h2>
              </div>
              <button
                onClick={close}
                className="w-10 h-10 rounded-xl bg-white/[0.1] backdrop-blur-md border border-white/[0.15] text-white/80 hover:text-white hover:bg-white/[0.2] transition-all duration-300 flex items-center justify-center"
                aria-label="Zamknij menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/[0.2] scrollbar-track-transparent hover:scrollbar-thumb-white/30">
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {/* Główne sekcje */}
                <MenuItem icon="🏠" text="Główne" onClick={close} />
                <MenuItem icon="🍽️" text="Odkrywaj Jedzenie" route={ROUTES.PANEL_CLIENT} />
                {isRouteEnabled('/reservations') && (
                  <MenuItem icon="📅" text="Rezerwacje Stolików" route="/reservations" />
                )}

                {/* Separator */}
                <div className="my-4 h-px bg-white/[0.12]"></div>

                {/* Panele */}
                <ExpandableSection
                  title="Panele"
                  icon="📂"
                  isExpanded={expandedSections['Panele']}
                >
                  <MenuItem icon="🙍" text="Panel Klienta" route={ROUTES.PANEL_CLIENT} isSubItem requiresAuth />
                  <MenuItem icon="💼" text="Panel Właściciela (Read-only)" route={ROUTES.BUSINESS_READONLY} isSubItem requiresAuth />
                  <MenuItem icon="🍳" text="Kitchen Display (KDS)" route={ROUTES.PANEL_BUSINESS_KDS} isSubItem requiresAuth />
                  <MenuItem icon="🏢" text="Panel Biznesowy (Legacy)" route={ROUTES.PANEL_BUSINESS} isSubItem requiresAuth />
                  <MenuItem icon="🆕" text="Panel Biznesowy v2 (Legacy)" route={ROUTES.PANEL_BUSINESS_V2} isSubItem requiresAuth />
                  <MenuItem icon="🚗" text="Panel Kierowcy" route={ROUTES.PANEL_DRIVER} isSubItem requiresAuth />
                  <MenuItem icon="📈" text="Analytics" route={ROUTES.PANEL_ADMIN} isSubItem requiresAuth />
                </ExpandableSection>

                {/* Moja Aktywność */}
                <ExpandableSection
                  title="Moja Aktywność"
                  icon="📊"
                  isExpanded={expandedSections['Moja Aktywność']}
                >
                  <MenuItem icon="🛒" text="Koszyk" onClick={() => {/* TODO: otwórz koszyk */ }} isSubItem />
                  {isRouteEnabled('/order-history') && <MenuItem icon="📜" text="Historia" route="/order-history" isSubItem />}
                  {isRouteEnabled('/favorites') && <MenuItem icon="❤️" text="Ulubione" route="/favorites" isSubItem />}
                  {isRouteEnabled('/my-taxis') && <MenuItem icon="🚕" text="Moje Taksówki" route="/my-taxis" isSubItem />}
                  {isRouteEnabled('/my-hotels') && <MenuItem icon="🏨" text="Moje Hotele" route="/my-hotels" isSubItem />}
                </ExpandableSection>

                {/* Ustawienia i Pomoc */}
                <ExpandableSection
                  title="Ustawienia i Pomoc"
                  icon="⚙️"
                  isExpanded={expandedSections['Ustawienia i Pomoc']}
                >
                  {isRouteEnabled('/profile') && <MenuItem icon="👤" text="Profil" route="/profile" isSubItem />}
                  {isRouteEnabled('/voice-settings') && <MenuItem icon="🎤" text="Ustawienia Głosu" route="/voice-settings" isSubItem />}
                  {isRouteEnabled('/notifications') && <MenuItem icon="🔔" text="Powiadomienia" route="/notifications" isSubItem />}
                  {isRouteEnabled('/faq') && <MenuItem icon="❓" text="FAQ" route="/faq" isSubItem />}
                  {isRouteEnabled('/contact') && <MenuItem icon="📞" text="Kontakt" route="/contact" isSubItem />}
                </ExpandableSection>

                {/* Separator */}
                <div className="my-4 h-px bg-white/[0.12]"></div>

                {/* User Info - glass card */}
                <div className="p-4 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.12]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.12] backdrop-blur-md border border-white/[0.18] flex items-center justify-center">
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
                <div className="my-4 h-px bg-white/[0.12]"></div>

                {/* Zarządzanie - tylko dla admin/business */}
                {(userRole === 'admin' || userRole === 'business') && (
                  <ExpandableSection
                    title="Zarządzanie"
                    icon="🔧"
                    isExpanded={expandedSections['Zarządzanie']}
                  >
                    <MenuItem icon="📈" text="Panel Biznesowy" route={ROUTES.PANEL_BUSINESS} isSubItem />
                    <MenuItem icon="🔑" text="Panel Admina" route={ROUTES.PANEL_ADMIN} isSubItem />
                  </ExpandableSection>
                )}

                {/* Labs - tylko dla admin */}
                {userRole === 'admin' && FEATURE_FLAGS.DEV_LABS && (
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

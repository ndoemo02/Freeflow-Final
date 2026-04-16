import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ROUTES } from '../app/routeConfig'
import { useUI } from '../state/ui'

const HIDDEN_ON: string[] = [
  ROUTES.PANEL_CLIENT,
  ROUTES.PANEL_BUSINESS_KDS,
  ROUTES.PANEL_BUSINESS,
  ROUTES.PANEL_MANAGE,
  ROUTES.PANEL_RESTAURANT_MANAGER,
  ROUTES.PANEL_ADMIN,
  ROUTES.PANEL_DRIVER,
  ROUTES.BUSINESS_READONLY,
  ROUTES.UI_LAB,
  ROUTES.LEGACY_PANEL_CUSTOMER,
]

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12L12 3l9 9M5 10v9h4v-5h6v5h4V10" />
  </svg>
)

const FoodIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C8 2 5 5 5 9c0 3.9 2.7 7.2 6.4 8.7L12 22l.6-4.3C16.3 16.2 19 12.9 19 9c0-4-3-7-7-7z" />
  </svg>
)

const OrdersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </svg>
)

const ProfileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
  </svg>
)

const MicIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8" />
  </svg>
)

const StopIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
)

type TabSection = 'food' | 'orders' | 'profile'
type TabConfig = {
  id: 'home' | 'food' | 'orders' | 'profile'
  label: string
  Icon: () => React.JSX.Element
  to: string
  activeSection?: TabSection
}

const TABS: Array<TabConfig | null> = [
  { id: 'home', label: 'Home', Icon: HomeIcon, to: ROUTES.HOME },
  { id: 'food', label: 'Jedzenie', Icon: FoodIcon, to: `${ROUTES.PANEL_CLIENT}?section=food`, activeSection: 'food' },
  null,
  { id: 'orders', label: 'Zamowienia', Icon: OrdersIcon, to: ROUTES.ORDERS, activeSection: 'orders' },
  { id: 'profile', label: 'Profil', Icon: ProfileIcon, to: ROUTES.PROFILE, activeSection: 'profile' },
]

export default function BottomTabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const voiceActive = useUI((s) => s.voiceActive)
  const [islandExpanded, setIslandExpanded] = useState(false)

  useEffect(() => {
    const attach = () => {
      const target = document.querySelector('.freeflow')
      if (!target) return null
      const obs = new MutationObserver(() => {
        setIslandExpanded(target.classList.contains('island-full-list'))
      })
      obs.observe(target, { attributes: true, attributeFilter: ['class'] })
      return obs
    }

    const obs = attach()
    return () => obs?.disconnect()
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname === ROUTES.PANEL_CLIENT) {
      console.log('[NAV_FIX] hidden bottom tab on /panel/client')
    }
  }, [location.pathname])

  if (HIDDEN_ON.includes(location.pathname)) return null

  const handleVoiceFAB = () => {
    window.dispatchEvent(new CustomEvent('freeflow:voice:trigger'))
  }

  const currentSection = new URLSearchParams(location.search).get('section')
  const isTabActive = (tab: TabConfig) => {
    if (!tab.activeSection) {
      if (tab.to === ROUTES.HOME) return location.pathname === ROUTES.HOME
      return location.pathname.startsWith(tab.to)
    }

    if (location.pathname === ROUTES.PANEL_CLIENT && currentSection === tab.activeSection) {
      return true
    }

    return location.pathname === tab.to
  }

  const dimmed = islandExpanded
  const fabActive = voiceActive

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="mx-3 mb-3 flex items-center justify-around relative transition-opacity duration-300"
        style={{
          height: 60,
          borderRadius: 'var(--radius)',
          background: 'rgba(10, 10, 14, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.4), 0 2px 0 rgba(255,255,255,0.03)',
          opacity: dimmed ? 0.45 : 1,
        }}
      >
        {TABS.map((tab) => {
          if (tab === null) {
            return <div key="fab-slot" style={{ width: 64 }} />
          }

          const active = isTabActive(tab)
          const { Icon, label, to } = tab

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.88 }}
              onClick={() => navigate(to)}
              className="flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={{
                minWidth: 44,
                minHeight: 44,
                flex: 1,
                color: active ? 'var(--ff-orange)' : 'rgba(255,255,255,0.38)',
              }}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <span style={{
                filter: active ? 'drop-shadow(0 0 6px rgba(249,115,22,0.6))' : 'none',
                transition: 'filter 0.2s',
              }}>
                <Icon />
              </span>
              <span className="text-[10px] font-medium tracking-wide" style={{ opacity: active ? 1 : 0.7 }}>
                {label}
              </span>
            </motion.button>
          )
        })}
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleVoiceFAB}
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-[65]"
        style={{
          bottom: `calc(env(safe-area-inset-bottom) + 24px)`,
          width: 52,
          height: 52,
          borderRadius: 'var(--radius-pill)',
          background: fabActive
            ? 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))'
            : 'linear-gradient(135deg, rgba(249,115,22,0.9), rgba(234,88,12,0.95))',
          boxShadow: fabActive
            ? '0 4px 20px rgba(239,68,68,0.5), 0 0 0 1px rgba(239,68,68,0.3)'
            : '0 4px 20px rgba(249,115,22,0.45), 0 0 0 1px rgba(249,115,22,0.3)',
          color: '#fff',
          opacity: dimmed ? 0.45 : 1,
          transition: 'background 0.2s, box-shadow 0.2s, opacity 0.3s',
        }}
        animate={fabActive ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={fabActive ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : {}}
        aria-label={fabActive ? 'Zatrzymaj nasluchiwanie' : 'Aktywuj glos'}
        aria-pressed={fabActive}
      >
        <AnimatePresence mode="wait" initial={false}>
          {fabActive ? (
            <motion.span key="stop" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.15 }}>
              <StopIcon />
            </motion.span>
          ) : (
            <motion.span key="mic" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MicIcon />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}

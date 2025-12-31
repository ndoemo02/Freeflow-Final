import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUI } from '../state/ui'

export default function Drawer({ children, title = 'FreeFlow' }) {
  const drawerOpen = useUI((s) => s.drawerOpen)
  const closeDrawer = useUI((s) => s.closeDrawer)
  const firstFocus = useRef(null)

  useEffect(() => {
    document.documentElement.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.documentElement.style.overflow = '' }
  }, [drawerOpen])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeDrawer()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeDrawer])

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.button
            aria-label="Zamknij menu"
            className="ff-overlay"
            onClick={closeDrawer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            aria-label="Menu"
            className="ff-drawer"
            role="dialog"
            aria-modal="true"
            initial={{ x: 360 }}
            animate={{ x: 0 }}
            exit={{ x: 360 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          >
            <header className="ff-drawer__header">
              <h3 className="ff-drawer__title">{title}</h3>
              <button className="ff-close" onClick={closeDrawer} ref={firstFocus} aria-label="Zamknij">
                ✕
              </button>
            </header>
            <nav className="ff-drawer__body">
              {children}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}



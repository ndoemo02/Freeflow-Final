import React from 'react'
import PanelHeader from '../components/PanelHeader'

export default function OrdersPlaceholder() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg0)' }}>
      <PanelHeader title="Zamówienia" showMenuButton />
      <div className="flex flex-col items-center justify-center gap-3 pt-32 text-white/30">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h4" />
        </svg>
        <p className="text-[13px]">Historia zamówień — wkrótce</p>
      </div>
    </div>
  )
}

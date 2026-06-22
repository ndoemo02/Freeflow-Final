import React from 'react'
import PanelHeader from '../components/PanelHeader'

export default function ProfilePlaceholder() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--ff-bg-0)' }}>
      <PanelHeader title="Profil" showMenuButton />
      <div className="flex flex-col items-center justify-center gap-3 pt-32 text-white/30">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </svg>
        <p className="text-[13px]">Profil użytkownika — wkrótce</p>
      </div>
    </div>
  )
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../state/ui';
import { useAuth } from '../state/auth';

const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

const IconMenu = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
)

export default function PanelHeader({ title, subtitle = '', showBackButton = true, showMenuButton = true }) {
  const navigate = useNavigate();
  const openDrawer = useUI((s) => s.openDrawer);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 shrink-0"
      style={{ borderBottom: '1px solid var(--ff-stroke)' }}
    >
      {/* Back */}
      {showBackButton && (
        <button
          onClick={() => {
            sessionStorage.setItem('skipIntro', 'true');
            navigate('/');
          }}
          className="flex items-center justify-center text-white/40 hover:text-white/80 transition-colors shrink-0"
          style={{
            width: 32, height: 32,
            borderRadius: 'var(--ff-radius-btn)',
            border: '1px solid var(--ff-stroke)',
            background: 'var(--ff-glass)',
          }}
          title="Zamknij panel (ESC)"
          aria-label="Wróć"
        >
          <IconClose />
        </button>
      )}

      {/* Title block */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-semibold text-white/90 truncate leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-[12px] text-white/40 truncate leading-tight mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Menu / Drawer */}
      {showMenuButton && (
        <button
          onClick={openDrawer}
          className="flex items-center justify-center text-white/40 hover:text-white/80 transition-colors shrink-0"
          style={{
            width: 32, height: 32,
            borderRadius: 'var(--ff-radius-btn)',
            border: '1px solid var(--ff-stroke)',
            background: 'var(--ff-glass)',
          }}
          aria-label="Menu"
        >
          <IconMenu />
        </button>
      )}
    </div>
  );
}

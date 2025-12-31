import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../state/ui';
import { useAuth } from '../state/auth';

export default function PanelHeader({ title, subtitle, showBackButton = true, showMenuButton = true, showLogoutButton = true }) {
  const navigate = useNavigate();
  const openDrawer = useUI((s) => s.openDrawer);
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="mb-8 text-center relative">
      {/* Back Button - Left */}
      {showBackButton && (
        <button
          onClick={() => {
            sessionStorage.setItem('skipIntro', 'true');
            navigate('/');
          }}
          className="absolute top-0 left-0 w-10 h-10 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 flex items-center justify-center transition-colors"
          title="Zamknij panel (ESC)"
        >
          ✕
        </button>
      )}


      {/* Title */}
      <h1 className="mb-2 text-4xl font-bold text-white">{title}</h1>
      {subtitle && (
        <p className="text-lg text-slate-400">{subtitle}</p>
      )}
      
    </div>
  );
}

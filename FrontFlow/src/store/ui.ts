import { create } from 'zustand'

type UIState = {
  menuOpen: boolean
  toggleMenu: (open?: boolean) => void
}

export const useUI = create<UIState>((set) => ({
  menuOpen: false,
  toggleMenu: (open) => set((s) => ({ menuOpen: open ?? !s.menuOpen })),
}))



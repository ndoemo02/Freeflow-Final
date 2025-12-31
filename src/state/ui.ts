import { create } from 'zustand'
import { UIMode } from '../lib/llmContract'

export interface CardData {
  id: string;
  name: string;
  [key: string]: any;
}

type UIState = {
  drawerOpen: boolean;
  authOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  openAuth: () => void;
  closeAuth: () => void;

  // Presentation State
  mode: UIMode;
  presentationItems: CardData[];
  highlightedCardId: string | null;

  setMode: (mode: UIMode) => void;
  setPresentationItems: (items: CardData[]) => void;
  setHighlightedCardId: (id: string | null) => void;

  // Helpers
  clearPresentation: () => void;
}

export const useUI = create<UIState>((set) => ({
  drawerOpen: false,
  authOpen: false,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  openAuth: () => set({ authOpen: true }),
  closeAuth: () => set({ authOpen: false }),

  // Presentation Defaults
  mode: 'standard_chat',
  presentationItems: [],
  highlightedCardId: null,

  setMode: (mode) => set({ mode }),
  setPresentationItems: (items) => set({ presentationItems: items }),
  setHighlightedCardId: (id) => set({ highlightedCardId: id }),

  clearPresentation: () => set({
    mode: 'standard_chat',
    presentationItems: [],
    highlightedCardId: null
  }),
}))



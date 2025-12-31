import { create } from 'zustand'

type ToastItem = { id: number; type: 'success' | 'error' | 'info'; message: string }

type ToastState = {
  items: ToastItem[]
  push: (t: Omit<ToastItem, 'id'>) => void
  remove: (id: number) => void
}

let counter = 1

export const useToast = create<ToastState>((set) => ({
  items: [],
  push: (t) => set((s) => ({ items: [...s.items, { id: counter++, ...t }] })),
  remove: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id) })),
}))

export const toast = {
  success(msg: string){ useToast.getState().push({ type: 'success', message: msg }) },
  error(msg: string){ useToast.getState().push({ type: 'error', message: msg }) },
  info(msg: string){ useToast.getState().push({ type: 'info', message: msg }) },
}



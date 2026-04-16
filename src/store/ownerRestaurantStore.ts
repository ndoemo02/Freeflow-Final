/**
 * ownerRestaurantStore — shared selected restaurant for owner panels
 *
 * Persists selectedId to localStorage so the selection survives
 * navigation between /panel/business, /panel/manage, /panel/business-kds.
 *
 * Restaurants list is also cached here so Supabase is queried once
 * per user session, not once per panel mount.
 */

import { create } from 'zustand'

const STORAGE_KEY = 'ff_owner_restaurant'

export interface OwnerRestaurant {
  id: string
  name: string
  city?: string | null
}

interface OwnerRestaurantStore {
  // Persisted selection
  selectedId: string
  setSelectedId: (id: string) => void

  // Cached restaurant list (avoids multiple Supabase queries)
  restaurants: OwnerRestaurant[]
  loadedForUserId: string | null
  loading: boolean
  setRestaurantList: (list: OwnerRestaurant[], userId: string) => void
  setLoading: (v: boolean) => void
}

export const useOwnerRestaurantStore = create<OwnerRestaurantStore>((set) => ({
  selectedId: localStorage.getItem(STORAGE_KEY) ?? '',

  setSelectedId: (id: string) => {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
    set({ selectedId: id })
  },

  restaurants: [],
  loadedForUserId: null,
  loading: false,

  setRestaurantList: (list, userId) =>
    set((state) => {
      // Keep current selection if still valid, else default to first
      const stored = state.selectedId
      const validId = stored && list.find(r => r.id === stored)
        ? stored
        : (list[0]?.id ?? '')
      if (validId !== state.selectedId) {
        if (validId) localStorage.setItem(STORAGE_KEY, validId)
        else localStorage.removeItem(STORAGE_KEY)
      }
      return {
        restaurants: list,
        loadedForUserId: userId,
        loading: false,
        selectedId: validId,
      }
    }),

  setLoading: (v) => set({ loading: v }),
}))

/**
 * useOwnerRestaurant — shared hook for owner panel restaurant selection
 *
 * - Fetches restaurant list from Supabase once per user session (cached in store)
 * - selectedId is persisted in localStorage via ownerRestaurantStore
 * - All three owner panels (business, manage, kds) share the same selectedId
 */

import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { useOwnerRestaurantStore, OwnerRestaurant } from '../store/ownerRestaurantStore'

export type { OwnerRestaurant }

export function useOwnerRestaurant() {
  const { user } = useAuth()
  const {
    restaurants,
    selectedId,
    setSelectedId,
    loadedForUserId,
    loading,
    setRestaurantList,
    setLoading,
  } = useOwnerRestaurantStore()

  useEffect(() => {
    if (!user?.id) return
    // Skip if already loaded for this user
    if (loadedForUserId === user.id) return

    let alive = true
    setLoading(true)

    supabase
      .from('restaurants')
      .select('id,name,city')
      .eq('owner_id', user.id)
      .order('name')
      .then(({ data }: { data: OwnerRestaurant[] | null }) => {
        if (!alive) return
        setRestaurantList(data || [], user.id)
      })

    return () => { alive = false }
  }, [user?.id, loadedForUserId])

  const selectedRestaurant = restaurants.find(r => r.id === selectedId) ?? null

  return {
    restaurants,
    selectedId,
    setSelectedId,
    selectedRestaurant,
    loading,
  }
}

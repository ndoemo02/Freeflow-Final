/**
 * useOwnerRestaurant — shared hook for owner panel restaurant selection
 *
 * - Fetches restaurant list from GET /api/owner/restaurants (Bearer JWT) once
 *   per user session (cached in store). Ownership is resolved server-side
 *   from the JWT (auth.getUser) — never from a client-supplied owner_id.
 * - selectedId is persisted in localStorage via ownerRestaurantStore
 * - All three owner panels (business, manage, kds) share the same selectedId
 */

import { useEffect } from 'react'
import { getAccessToken } from '../lib/supabase'
import { getApiUrl } from '../lib/config'
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

    ;(async () => {
      try {
        const token = await getAccessToken()
        if (!token) {
          if (alive) setRestaurantList([], user.id) // also clears loading (see store)
          return
        }
        const res = await fetch(getApiUrl('/api/owner/restaurants'), {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json().catch(() => null)
        if (!alive) return
        const data: OwnerRestaurant[] = res.ok && json?.ok ? (json.data || []) : []
        setRestaurantList(data, user.id)
      } catch (err) {
        console.error('[useOwnerRestaurant] fetch error:', err)
        if (alive) setRestaurantList([], user.id)
      }
    })()

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

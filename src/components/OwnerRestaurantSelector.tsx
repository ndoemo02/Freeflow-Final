/**
 * OwnerRestaurantSelector — shared restaurant picker for owner panels
 *
 * Reads from / writes to ownerRestaurantStore (localStorage-persisted).
 * Drop into any panel header — selection is shared across all panels.
 */

import React from 'react'
import { useOwnerRestaurant } from '../hooks/useOwnerRestaurant'

interface Props {
  /** 'dark' = panel/business-kds dark bg, 'bp' = BusinessClientPanel bg */
  variant?: 'dark' | 'bp'
  className?: string
}

export function OwnerRestaurantSelector({ variant = 'dark', className }: Props) {
  const { restaurants, selectedId, setSelectedId, loading } = useOwnerRestaurant()

  const base: React.CSSProperties =
    variant === 'bp'
      ? {
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 10,
          color: 'rgba(255,255,255,0.82)',
          fontSize: 13,
          fontWeight: 500,
          padding: '5px 12px',
          cursor: 'pointer',
          outline: 'none',
          maxWidth: 220,
        }
      : {
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 8,
          color: 'rgba(255,255,255,0.82)',
          fontSize: 13,
          fontWeight: 500,
          padding: '4px 10px',
          cursor: 'pointer',
          outline: 'none',
          maxWidth: 200,
        }

  if (loading) {
    return (
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', ...base, cursor: 'default' }}>
        Ładowanie…
      </span>
    )
  }

  if (restaurants.length === 0) {
    return (
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>
        Brak restauracji
      </span>
    )
  }

  return (
    <select
      value={selectedId}
      onChange={e => setSelectedId(e.target.value)}
      className={className}
      style={base}
    >
      {restaurants.map(r => (
        <option key={r.id} value={r.id} style={{ background: '#0d1117', color: 'white' }}>
          {r.name}{r.city ? ` · ${r.city}` : ''}
        </option>
      ))}
    </select>
  )
}

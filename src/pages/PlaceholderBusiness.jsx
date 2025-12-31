import React from 'react'
// Placeholder został usunięty – pokażmy prosty komunikat demo

export default function PlaceholderBusiness(){
  // demo: przekazujemy obiekt użytkownika z id
  const user = { id: 'demo-owner-id' }
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Placeholder: Panel Biznesu</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        Placeholder został usunięty. Ten ekran służy jedynie do podglądu routingu.
      </div>
    </div>
  )
}



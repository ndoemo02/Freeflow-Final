import React from 'react'

export default function Hero({ onMic }) {
  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center text-center text-white bg-hero">
      <div className="max-w-xl">
        <h2 className="text-4xl font-bold mb-3">Voice to order — Złóż zamówienie</h2>
        <div className="mt-6 card-glass p-4 rounded-xl">
          <input className="w-full p-3 rounded-md bg-transparent border border-white/6 text-white" placeholder="Powiedz lub wpisz..." />
          <div className="mt-4 flex justify-end">
            <button onClick={onMic} className="px-4 py-2 rounded-md bg-brand-500 text-white">🎤</button>
          </div>
        </div>
      </div>
    </section>
  )
}



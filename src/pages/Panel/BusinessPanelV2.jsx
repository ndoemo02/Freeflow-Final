import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../state/auth'

export default function BusinessPanelV2() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({ todayOrders: 0, todayRevenue: 0, avgTime: 0, rating: 4.7 })

  useEffect(() => {
    if (!user?.id) {
      try { sessionStorage.setItem('skipIntro', 'true') } catch {}
      navigate('/')
      return
    }

    const load = async () => {
      // mock when DB not ready
      const now = Date.now()
      setOrders([
        { id: '1247', time: new Date(now - 3*60*1000).toISOString(), items: 'Pizza Margherita ×2, Cola 0.5 ×2, Sos ×1', total_cents: 6800, status: 'new' },
        { id: '1246', time: new Date(now - 7*60*1000).toISOString(), items: 'Pizza Pepperoni ×1, Sałatka Cezar ×1', total_cents: 4200, status: 'preparing' },
        { id: '1245', time: new Date(now - 20*60*1000).toISOString(), items: 'Quattro Stagioni ×1, Frytki ×1, Sprite 0.33 ×1', total_cents: 5600, status: 'ready' },
        { id: '1244', time: new Date(now - 40*60*1000).toISOString(), items: 'Kebab w picie ×2, Frytki ×2', total_cents: 3800, status: 'delivered' },
      ])
      setStats({ todayOrders: 247, todayRevenue: 384000, avgTime: 18, rating: 4.7 })
    }
    load()
  }, [user?.id])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return orders
    return orders.filter(o => o.status === statusFilter)
  }, [orders, statusFilter])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] to-[#111827] text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center">
              <span className="text-xl">🥘</span>
            </div>
            <div>
              <div className="text-xl font-bold">FreeFlow Business v2</div>
              <div className="text-slate-400 text-xs">Pizzeria Calzone — Otwarte</div>
            </div>
          </div>
          <button
            onClick={() => { sessionStorage.setItem('skipIntro','true'); navigate('/') }}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
          >
            ← Wróć
          </button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Stat title="Zamówienia dziś" value={stats.todayOrders} color="from-orange-500/20" icon="📦" />
          <Stat title="Przychód dziś" value={(stats.todayRevenue/100).toLocaleString('pl-PL', { style:'currency', currency:'PLN' })} color="from-emerald-500/20" icon="💰" />
          <Stat title="Średni czas" value={`${stats.avgTime} min`} color="from-cyan-500/20" icon="⏱️" />
          <Stat title="Ocena" value={`${stats.rating} ⭐`} color="from-purple-500/20" icon="⭐" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Orders */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/30">
              <div className="font-semibold">Aktualne zamówienia</div>
              <div className="flex gap-2 text-xs">
                {[
                  {id:'all',label:'Wszystkie'},
                  {id:'new',label:'Nowe'},
                  {id:'preparing',label:'W przygotowaniu'},
                  {id:'ready',label:'Gotowe'},
                  {id:'delivered',label:'Dostarczone'}
                ].map(b => (
                  <button key={b.id} onClick={()=>setStatusFilter(b.id)} className={`px-3 py-1 rounded-full border ${statusFilter===b.id? 'bg-indigo-500/30 border-indigo-400/40':'bg-white/5 border-white/10 hover:bg-white/10'}`}>{b.label}</button>
                ))}
              </div>
            </div>
            <div className="max-h-[560px] overflow-y-auto divide-y divide-white/5">
              {filtered.map(o => (
                <div key={o.id} className="p-4 hover:bg-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold">#{o.id}</div>
                    <div className="text-xs text-slate-400">{new Date(o.time).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  <div className="text-sm text-slate-300 mb-2">{o.items}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Suma: {(o.total_cents/100).toFixed(2)} zł</div>
                    <span className={`px-2 py-1 rounded-full text-xs border ${statusBadge(o.status)}`}>{statusText(o.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-4">
            <Card title="Szybkie akcje">
              <div className="grid gap-2">
                <ActionButton>📊 Sprawdź Analitykę</ActionButton>
                <ActionButton>⚙️ Ustawienia Restauracji</ActionButton>
                <ActionButton>🔔 Powiadomienia</ActionButton>
                <ActionButton>📱 Pobierz Aplikację</ActionButton>
              </div>
            </Card>
            <Card title="Dostępność Menu">
              {[
                {name:'Pizza Margherita', price:'od 28 zł', on:true},
                {name:'Pizza Pepperoni', price:'od 32 zł', on:true},
                {name:'Quattro Stagioni', price:'od 38 zł', on:false},
                {name:'Sałatka Cezar', price:'24 zł', on:true},
              ].map((m)=> (
                <div key={m.name} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-cyan-300">{m.price}</div>
                  </div>
                  <Toggle on={m.on} />
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ title, value, color, icon }) {
  return (
    <motion.div className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl relative overflow-hidden`}
      whileHover={{ scale: 1.03, y: -4 }}>
      <div className={`absolute -inset-0.5 bg-gradient-to-br ${color} to-transparent opacity-20`} />
      <div className="relative z-10">
        <div className="text-sm text-slate-300 mb-1">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </motion.div>
  )
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
      <div className="font-semibold mb-3">{title}</div>
      {children}
    </div>
  )
}

function ActionButton({ children }) {
  return (
    <button className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500/30 to-purple-500/30 border border-white/10 hover:from-indigo-500/40 hover:to-purple-500/40">
      {children}
    </button>
  )
}

function Toggle({ on }) {
  return (
    <div className={`relative w-12 h-6 rounded-full cursor-pointer ${on ? 'bg-emerald-500/60':'bg-slate-600'}`}>
      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${on ? 'translate-x-6':''}`} />
    </div>
  )
}

function statusText(s){
  return s==='new'?'Nowe':s==='preparing'?'W przygotowaniu':s==='ready'?'Gotowe':'Dostarczone'
}
function statusBadge(s){
  return s==='new'?'border-yellow-400/30 text-yellow-300':s==='preparing'?'border-cyan-400/30 text-cyan-300':s==='ready'?'border-emerald-400/30 text-emerald-300':'border-slate-400/30 text-slate-300'
}





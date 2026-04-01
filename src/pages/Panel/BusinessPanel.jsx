import React, { useEffect, useMemo, useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/auth'
import { supabase } from '../../lib/supabase'
import { Dialog, Transition } from '@headlessui/react'
import { getApiUrl } from '../../lib/config'

// ─── Surface token overrides for business mode ───────────────────────────────
// Business = functional: flat cards, structural borders (0.09–0.12), no glow,
// --radius-sm (12px) max, semantic colors at reduced opacity (status only).
const BP = {
  cardBg:     'rgba(255,255,255,0.04)',        // flat — no blur on content
  cardBorder: '1px solid rgba(255,255,255,0.09)',  // structural (vs consumer 0.06)
  divider:    'rgba(255,255,255,0.08)',
  textPrimary:'rgba(255,255,255,0.84)',
  textMid:    'rgba(255,255,255,0.52)',
  textLow:    'rgba(255,255,255,0.28)',
}

// ─── Status helpers ────────────────────────────────────────────────────────────
// Reduced opacity vs consumer: status indicators, not brand accents
const STATUS_META = {
  pending:   { label: 'Nowe',        color: 'rgba(251,191,36,0.80)',  bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.18)' },
  preparing: { label: 'W realizacji',color: 'rgba(96,165,250,0.80)',  bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.18)' },
  completed: { label: 'Gotowe',      color: 'rgba(52,211,153,0.80)',  bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.18)' },
  delivered: { label: 'Dostarczone', color: 'rgba(148,163,184,0.50)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)' },
  cancelled: { label: 'Anulowane',   color: 'rgba(248,113,113,0.48)', bg: 'rgba(248,113,113,0.05)', border: 'rgba(248,113,113,0.12)' },
}
const statusMeta = (s) => STATUS_META[s] || STATUS_META.pending

// ─── Compact inline components ────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = statusMeta(status)
  return (
    <span
      className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}
    >
      {m.label}
    </span>
  )
}

function ActionBtn({ onClick, variant = 'neutral', children }) {
  const styles = {
    confirm: { color: 'rgba(52,211,153,0.90)', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.22)' },
    reject:  { color: 'rgba(248,113,113,0.80)', bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.18)' },
    neutral: { color: 'rgba(148,163,184,0.80)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)' },
  }
  const s = styles[variant]
  return (
    <button
      onClick={onClick}
      className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-opacity hover:opacity-80 active:scale-95"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {children}
    </button>
  )
}

function SectionLabel({ children, count }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-5 pb-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: BP.textLow }}>
        {children}
      </span>
      {count != null && (
        <span
          className="text-[10px] font-semibold px-1.5 py-px rounded-full"
          style={{ background: 'rgba(255,255,255,0.07)', color: BP.textMid }}
        >
          {count}
        </span>
      )}
    </div>
  )
}

function Hairline() {
  return <div className="mx-4 h-px" style={{ background: BP.divider }} />
}

// ─── Modal primitives ─────────────────────────────────────────────────────────
function ModalShell({ show, onClose, title, children }) {
  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.64)', backdropFilter: 'blur(4px)' }} />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-150" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-100" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className="w-full max-w-sm overflow-hidden p-5 text-left"
                style={{
                  borderRadius: 'var(--radius-md, 16px)',
                  background: 'rgba(10,13,22,0.97)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  boxShadow: '0 24px 56px rgba(0,0,0,0.60)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <Dialog.Title className="text-[15px] font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.88)' }}>
                  {title}
                </Dialog.Title>
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

function FieldInput({ label, value, onChange, placeholder }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.44)' }}>{label}</label>
      <input
        className="w-full px-3 py-2 text-[13px] rounded-md outline-none focus:ring-1 focus:ring-white/20"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.88)' }}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}

function ModalFooter({ onCancel, onConfirm, confirmLabel, busy, confirmDanger }) {
  return (
    <div className="flex gap-2 justify-end mt-5">
      <button
        className="px-3 py-2 text-[12px] rounded-md"
        style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.56)' }}
        onClick={onCancel}
      >
        Anuluj
      </button>
      <button
        disabled={busy}
        className="px-3 py-2 text-[12px] font-medium rounded-md transition-opacity disabled:opacity-50"
        style={{
          background: confirmDanger ? 'rgba(239,68,68,0.85)' : 'rgba(249,115,22,0.85)',
          color: 'white',
        }}
        onClick={onConfirm}
      >
        {busy ? '…' : confirmLabel}
      </button>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function BusinessPanel() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [restaurants, setRestaurants] = useState([])
  const [restaurantId, setRestaurantId] = useState('')
  const [loadingRests, setLoadingRests] = useState(false)

  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)

  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [busyAdd, setBusyAdd] = useState(false)
  const [err, setErr] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [restName, setRestName] = useState('')
  const [restCity, setRestCity] = useState('')
  const [busyCreate, setBusyCreate] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [restaurantToDelete, setRestaurantToDelete] = useState(null)
  const [busyDelete, setBusyDelete] = useState(false)

  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  const [menuExpanded, setMenuExpanded] = useState(false)

  // Apply business-theme body class — flat surface, no radial gradients
  useEffect(() => {
    document.body.classList.add('business-theme')
    return () => document.body.classList.remove('business-theme')
  }, [])

  useEffect(() => {
    if (!user?.id) { navigate('/'); return }
  }, [user, navigate])

  useEffect(() => {
    if (!user?.id) { setRestaurants([]); setRestaurantId(''); return }
    let alive = true
    const load = async () => {
      setLoadingRests(true)
      const { data: restaurants, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('id,name,created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      if (!alive) return
      if (restaurantsError) { setRestaurants([]) }
      else {
        setRestaurants(restaurants || [])
        if ((restaurants?.length || 0) > 0 && !restaurantId) setRestaurantId(restaurants[0].id)
      }
      setLoadingRests(false)
    }
    load()
    return () => { alive = false }
  }, [user?.id])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') { sessionStorage.setItem('skipIntro', 'true'); navigate('/') }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [navigate])

  useEffect(() => {
    if (!restaurantId) { setItems([]); return }
    let alive = true
    const load = async () => {
      setLoadingItems(true)
      const { data, error } = await supabase.from('menu_items').select('id,name,price').eq('restaurant_id', restaurantId).order('name')
      if (!alive) return
      setItems(error ? [] : (data || []))
      setLoadingItems(false)
    }
    load()
    return () => { alive = false }
  }, [restaurantId])

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!restaurantId) { setOrders([]); return }
      setLoadingOrders(true)
      try {
        const response = await fetch(getApiUrl(`/api/orders?restaurant_id=${restaurantId}`))
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const data = await response.json()
        if (!alive) return
        setOrders(data.orders || [])
      } catch (error) {
        console.error('Error loading orders:', error)
        if (!alive) return
        setOrders([])
      } finally { setLoadingOrders(false) }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => { alive = false; clearInterval(interval) }
  }, [restaurantId])

  const addItem = async () => {
    try {
      setBusyAdd(true); setErr('')
      const price = parseFloat(String(newPrice).replace(',', '.'))
      if (!newName || isNaN(price)) throw new Error('Podaj nazwę i cenę')
      const { error } = await supabase.from('menu_items').insert({
        restaurant_id: restaurantId, name: newName, price,
        description: 'Dodane przez właściciela'
      })
      if (error) throw error
      setNewName(''); setNewPrice(''); setAddOpen(false)
      const { data } = await supabase.from('menu_items').select('id,name,price').eq('restaurant_id', restaurantId).order('name')
      setItems(data || [])
    } catch (e) { setErr(e.message || 'Błąd dodawania') } finally { setBusyAdd(false) }
  }

  const deleteRestaurant = async () => {
    if (!restaurantToDelete) return
    try {
      setBusyDelete(true); setErr('')
      await supabase.from('menu_items').delete().eq('restaurant_id', restaurantToDelete.id)
      const { error } = await supabase.from('restaurants').delete().eq('id', restaurantToDelete.id)
      if (error) throw error
      const { data: restaurantsData } = await supabase.from('restaurants').select('id,name').eq('owner_id', user.id).order('name')
      setRestaurants(restaurantsData || [])
      if (restaurantsData?.length > 0) setRestaurantId(restaurantsData[0].id)
      else setRestaurantId('')
      setDeleteOpen(false); setRestaurantToDelete(null)
    } catch (e) { setErr(e.message) } finally { setBusyDelete(false) }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(getApiUrl(`/api/orders/${orderId}`), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const ordersResponse = await fetch(getApiUrl(`/api/orders?restaurant_id=${restaurantId}`))
      if (ordersResponse.ok) { const data = await ordersResponse.json(); setOrders(data.orders || []) }
    } catch (e) { console.error('Error updating order status:', e) }
  }

  const stats = useMemo(() => ({
    restaurants: restaurants.length,
    openOrders: orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length,
  }), [restaurants, orders])

  const activeOrders = useMemo(() =>
    orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled'),
    [orders])

  const closedOrders = useMemo(() =>
    orders.filter(o => o.status === 'delivered' || o.status === 'cancelled'),
    [orders])

  const selectedRestaurantName = restaurants.find(r => r.id === restaurantId)?.name || ''

  // ─── Layout ─────────────────────────────────────────────────────────────────
  return (
    <Fragment>
      <div
        className="min-h-screen flex flex-col"
        style={{
          background: 'var(--op-surface)',   // #0d1020 — flat, no texture
          color: BP.textPrimary,
          // Explicit coverage: ensures no wallpaper bleeds through if
          // body has a transparent ancestor. isolation creates new stacking context.
          isolation: 'isolate',
        }}
      >
        {/* ── Operational header ─────────────────────────────────────────── */}
        <div
          className="shrink-0 sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
          style={{
            background: 'rgba(13,16,32,0.98)',
            backdropFilter: 'blur(var(--blur-sm))',   // 8px — functional, not ambient
            WebkitBackdropFilter: 'blur(var(--blur-sm))',
            borderBottom: `1px solid ${BP.divider}`,
          }}
        >
          {/* Brand mark */}
          <div
            className="flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{
              width: 26, height: 26, borderRadius: '6px',
              background: 'linear-gradient(135deg, rgba(249,115,22,0.22), rgba(249,115,22,0.08))',
              border: '1px solid rgba(249,115,22,0.24)',
              color: 'var(--ff-orange, #f97316)',
            }}
          >
            FF
          </div>

          {/* Restaurant selector */}
          <div className="flex-1 min-w-0">
            {loadingRests ? (
              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.30)' }}>Ładowanie…</span>
            ) : restaurants.length === 0 ? (
              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.30)' }}>Brak restauracji</span>
            ) : (
              <select
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                className="w-full text-[13px] font-medium bg-transparent outline-none cursor-pointer"
                style={{ color: 'rgba(255,255,255,0.82)', border: 'none', padding: 0 }}
              >
                {restaurants.map(r => (
                  <option key={r.id} value={r.id} className="bg-[#0d1117] text-white">{r.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)' }}
              title="Strona główna"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Strona główna
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-opacity hover:opacity-80"
              style={{ background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.22)', color: 'rgba(249,115,22,0.90)' }}
            >
              + Nowa
            </button>
            {restaurantId && (
              <button
                onClick={() => {
                  const r = restaurants.find(r => r.id === restaurantId)
                  if (r) { setRestaurantToDelete(r); setDeleteOpen(true) }
                }}
                className="text-[11px] font-medium px-2 py-1.5 rounded-md transition-opacity hover:opacity-80"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.16)', color: 'rgba(248,113,113,0.70)' }}
              >
                Usuń
              </button>
            )}
          </div>
        </div>

        {/* ── KPI strip ──────────────────────────────────────────────────── */}
        <div className="flex gap-3 px-4 pt-4 pb-1">
          {[
            { label: 'Restauracje', value: stats.restaurants },
            { label: 'Aktywne zamówienia', value: stats.openOrders },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-3 py-2"
              style={{
                borderRadius: 'var(--radius-sm)',   // 12px — business max
                background: BP.cardBg,
                border: BP.cardBorder,
                // no glow, no shadow — pure flat surface
              }}
            >
              <span className="text-[18px] font-bold tabular-nums" style={{ color: BP.textPrimary, lineHeight: 1 }}>{value}</span>
              <span className="text-[11px]" style={{ color: BP.textLow }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Orders (primary) ───────────────────────────────────────────── */}
        <SectionLabel count={activeOrders.length}>Aktywne zamówienia</SectionLabel>

        <div className="px-4 space-y-2">
          {loadingOrders && (
            <div className="text-[12px] py-6 text-center" style={{ color: BP.textLow }}>Ładowanie…</div>
          )}
          {!loadingOrders && activeOrders.length === 0 && (
            <div
              className="text-[12px] py-8 text-center"
              style={{
                borderRadius: 'var(--radius-sm)',
                color: BP.textLow,
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid rgba(255,255,255,0.06)`,
              }}
            >
              Brak aktywnych zamówień
            </div>
          )}
          {activeOrders.map(o => <OrderRow key={o.id} order={o} onDetails={() => { setSelectedOrder(o); setOrderDetailsOpen(true) }} onAction={updateOrderStatus} />)}
        </div>

        {/* ── Closed orders (compact) ────────────────────────────────────── */}
        {closedOrders.length > 0 && (
          <>
            <SectionLabel count={closedOrders.length}>Zakończone</SectionLabel>
            <div className="px-4 space-y-1.5">
              {closedOrders.map(o => <OrderRow key={o.id} order={o} onDetails={() => { setSelectedOrder(o); setOrderDetailsOpen(true) }} onAction={updateOrderStatus} compact />)}
            </div>
          </>
        )}

        <Hairline />

        {/* ── Menu items (secondary) ─────────────────────────────────────── */}
        <div>
          <button
            className="w-full flex items-center justify-between px-4 pt-4 pb-2"
            onClick={() => setMenuExpanded(v => !v)}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: BP.textLow }}>
                Menu
              </span>
              <span
                className="text-[10px] font-semibold px-1.5 py-px rounded-full"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.42)' }}
              >
                {items.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {restaurantId && (
                <button
                  onClick={(e) => { e.stopPropagation(); setAddOpen(true) }}
                  className="text-[11px] px-2 py-1 rounded-md"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.56)' }}
                >
                  + Dodaj
                </button>
              )}
              <svg
                width={14} height={14}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                style={{
                  color: 'rgba(255,255,255,0.28)',
                  transform: menuExpanded ? 'rotate(180deg)' : 'none',
                  transition: 'transform 200ms',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          {menuExpanded && (
            <div className="px-4 pb-4">
              {loadingItems && (
                <div className="text-[12px] py-4 text-center" style={{ color: BP.textLow }}>Ładowanie…</div>
              )}
              {!loadingItems && items.length === 0 && (
                <div className="text-[12px] py-4 text-center" style={{ color: BP.textLow }}>Brak pozycji w menu.</div>
              )}
              {!loadingItems && items.length > 0 && (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ color: BP.textLow }}>
                      <th className="text-left pb-2 font-medium">Nazwa</th>
                      <th className="text-right pb-2 font-medium tabular-nums">Cena</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr
                        key={it.id}
                        style={{ borderTop: i > 0 ? `1px solid ${BP.divider}` : 'none' }}
                      >
                        <td className="py-2" style={{ color: BP.textMid }}>{it.name}</td>
                        <td className="py-2 text-right tabular-nums" style={{ color: BP.textLow }}>{Number(it.price).toFixed(2)} zł</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Bottom safe area */}
        <div style={{ height: 'calc(env(safe-area-inset-bottom) + 24px)' }} />
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Add menu item */}
      <ModalShell show={addOpen} onClose={() => setAddOpen(false)} title="Dodaj pozycję">
        {err && <div className="text-[12px] mb-3" style={{ color: 'rgba(248,113,113,0.90)' }}>{err}</div>}
        <FieldInput label="Nazwa" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="np. Pizza Margherita" />
        <FieldInput label="Cena (PLN)" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="12.99" />
        <ModalFooter onCancel={() => setAddOpen(false)} onConfirm={addItem} confirmLabel="Dodaj" busy={busyAdd} />
      </ModalShell>

      {/* Create restaurant */}
      <ModalShell show={createOpen} onClose={() => setCreateOpen(false)} title="Nowa restauracja">
        <FieldInput label="Nazwa" value={restName} onChange={(e) => setRestName(e.target.value)} placeholder="Nazwa lokalu" />
        <FieldInput label="Miasto" value={restCity} onChange={(e) => setRestCity(e.target.value)} placeholder="np. Piekary Śląskie" />
        <ModalFooter
          onCancel={() => setCreateOpen(false)}
          confirmLabel="Utwórz"
          busy={busyCreate}
          onConfirm={async () => {
            if (!restName) return
            try {
              setBusyCreate(true)
              let data = null; let error = null
              { const res = await supabase.from('restaurants').insert({ name: restName, city: restCity || null, owner: user?.id }).select('id,name'); data = res.data; error = res.error }
              if (error) { const res2 = await supabase.from('restaurants').insert({ name: restName, city: restCity || null, owner_id: user?.id }).select('id,name'); data = res2.data; error = res2.error; if (error) throw error }
              const { data: list } = await supabase.from('restaurants').select('id,name').or(`owner.eq.${user?.id},owner_id.eq.${user?.id}`).order('name')
              setRestaurants(list || [])
              const createdId = data?.[0]?.id
              if (createdId) setRestaurantId(createdId)
              setCreateOpen(false); setRestName(''); setRestCity('')
            } finally { setBusyCreate(false) }
          }}
        />
      </ModalShell>

      {/* Delete restaurant */}
      <ModalShell show={deleteOpen} onClose={() => setDeleteOpen(false)} title="Usuń restaurację">
        {err && <div className="text-[12px] mb-3" style={{ color: 'rgba(248,113,113,0.90)' }}>{err}</div>}
        <p className="text-[13px] mb-1" style={{ color: 'rgba(255,255,255,0.62)' }}>
          Czy na pewno chcesz usunąć <strong style={{ color: 'rgba(255,255,255,0.88)' }}>{restaurantToDelete?.name}</strong>?
        </p>
        <p className="text-[11px]" style={{ color: 'rgba(248,113,113,0.70)' }}>
          Usunie to również wszystkie pozycje menu. Operacja jest nieodwracalna.
        </p>
        <ModalFooter onCancel={() => setDeleteOpen(false)} onConfirm={deleteRestaurant} confirmLabel="Usuń" busy={busyDelete} confirmDanger />
      </ModalShell>

      {/* Order details */}
      <ModalShell show={orderDetailsOpen} onClose={() => setOrderDetailsOpen(false)} title="Szczegóły zamówienia">
        {selectedOrder && (
          <div className="space-y-3 text-[12px]">
            <div>
              <span style={{ color: BP.textLow }}>ID</span>
              <p className="font-mono text-[11px] mt-0.5 px-2 py-1" style={{ borderRadius: 'var(--radius-sm)', background: BP.cardBg, border: BP.cardBorder, color: BP.textMid }}>{selectedOrder.id}</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span style={{ color: BP.textLow }}>Klient</span>
                <p className="font-medium mt-0.5" style={{ color: BP.textPrimary }}>{selectedOrder.customer_name || 'Klient'}</p>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>
            {selectedOrder.customer_phone && <p style={{ color: BP.textMid }}>Tel: {selectedOrder.customer_phone}</p>}
            {selectedOrder.delivery_address && <p style={{ color: BP.textMid }}>Adres: {selectedOrder.delivery_address}</p>}
            {selectedOrder.notes && <p style={{ color: BP.textMid }}>Uwagi: {selectedOrder.notes}</p>}
            <div className="flex items-center justify-between pt-1 tabular-nums" style={{ borderTop: `1px solid ${BP.divider}` }}>
              <span style={{ color: BP.textLow }}>{new Date(selectedOrder.created_at).toLocaleString('pl-PL')}</span>
              <span className="font-semibold" style={{ color: BP.textPrimary }}>{(selectedOrder.total_price ?? 0).toFixed(2)} zł</span>
            </div>
            {selectedOrder.items && (
              <div style={{ borderTop: `1px solid ${BP.divider}`, paddingTop: 8 }}>
                <p className="mb-2" style={{ color: BP.textLow }}>Pozycje</p>
                {(typeof selectedOrder.items === 'string' ? JSON.parse(selectedOrder.items) : selectedOrder.items).map((item, index) => (
                  <div key={index} className="flex justify-between py-1 tabular-nums">
                    <span style={{ color: BP.textMid }}>{item.name} ×{item.quantity}</span>
                    <span style={{ color: BP.textLow }}>{((item.price * item.quantity) / 100).toFixed(2)} zł</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end mt-5">
          <button
            className="px-3 py-2 text-[12px] rounded-md"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.56)' }}
            onClick={() => setOrderDetailsOpen(false)}
          >
            Zamknij
          </button>
        </div>
      </ModalShell>
    </Fragment>
  )
}

// ─── OrderRow ─────────────────────────────────────────────────────────────────
// Flat card — no blur, no glow. Structural border at 0.09 (functional surface rule).
// Action strip separated by a hairline divider, not a shadow/elevation effect.
function OrderRow({ order: o, onDetails, onAction, compact = false }) {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-sm)',    // 12px max for business surfaces
        overflow: 'hidden',
        background: BP.cardBg,
        border: BP.cardBorder,
        // no boxShadow glow — elevation is expressed through border contrast only
      }}
    >
      <button
        type="button"
        className="w-full text-left px-3 py-2.5 flex items-start gap-3"
        onClick={onDetails}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[13px] font-medium truncate" style={{ color: BP.textPrimary }}>
              {o.customer_name || `Klient #${o.user_id?.substring(0, 6)}`}
            </span>
            <StatusBadge status={o.status} />
          </div>
          <div className="text-[11px] flex items-center gap-2 tabular-nums" style={{ color: BP.textLow }}>
            <span>#{o.id.substring(0, 8)}</span>
            <span>·</span>
            <span>{(o.total_price ?? 0).toFixed(2)} zł</span>
            {!compact && o.items?.length > 0 && (
              <>
                <span>·</span>
                <span className="truncate" style={{ color: BP.textMid }}>{o.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}</span>
              </>
            )}
          </div>
        </div>
        <span className="text-[10px] shrink-0 mt-0.5 tabular-nums" style={{ color: BP.textLow }}>
          {new Date(o.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </button>

      {/* Action strip — hairline divider, not elevation */}
      {!compact && (o.status === 'pending' || o.status === 'preparing' || o.status === 'completed') && (
        <div
          className="flex gap-2 px-3 pb-2.5"
          style={{ borderTop: `1px solid ${BP.divider}`, paddingTop: 8 }}
        >
          {o.status === 'pending' && (
            <>
              <ActionBtn onClick={() => onAction(o.id, 'preparing')} variant="confirm">Zatwierdź</ActionBtn>
              <ActionBtn onClick={() => onAction(o.id, 'cancelled')} variant="reject">Odrzuć</ActionBtn>
            </>
          )}
          {o.status === 'preparing' && (
            <ActionBtn onClick={() => onAction(o.id, 'completed')} variant="confirm">Gotowe do odbioru</ActionBtn>
          )}
          {o.status === 'completed' && (
            <ActionBtn onClick={() => onAction(o.id, 'delivered')} variant="neutral">Dostarczone</ActionBtn>
          )}
        </div>
      )}
    </div>
  )
}

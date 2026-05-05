/**
 * RestaurantManager — panel zarządzania aktywną restauracją
 * Route: /panel/manage   (alias: /panel/restaurant-manager → redirect)
 * Query params: ?id=<restaurantId>&tab=details|menu
 *
 * Dane restauracji (tab "Dane lokalu"):
 *   name, city, address, phone, description, website, min_order_pln
 *   toggles: is_active, is_open, delivery_available
 *   read-only: cuisine_type, maps_rating, ID
 *
 * Menu (tab "Menu"):
 *   CRUD na menu_items_v2 (price_pln, category, available)
 */
import React, { useEffect, useState, Fragment, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../state/auth'
import { supabase } from '../../lib/supabase'
import { Dialog, Transition } from '@headlessui/react'
import { ROUTES } from '../../app/routeConfig'
import { useOwnerRestaurant } from '../../hooks/useOwnerRestaurant'
import { useOwnerRestaurantStore } from '../../store/ownerRestaurantStore'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  surface:    'var(--op-surface, #0b0e1a)',
  card:       'rgba(255,255,255,0.04)',
  cardBorder: '1px solid rgba(255,255,255,0.09)',
  divider:    'rgba(255,255,255,0.08)',
  fg0:        'rgba(255,255,255,0.84)',
  fg1:        'rgba(255,255,255,0.52)',
  fg2:        'rgba(255,255,255,0.28)',
  orange:     'rgba(249,115,22,0.90)',
  orangeBg:   'rgba(249,115,22,0.10)',
  orangeBorder:'rgba(249,115,22,0.22)',
  green:      'rgba(52,211,153,0.90)',
  greenBg:    'rgba(52,211,153,0.07)',
  greenBorder:'rgba(52,211,153,0.18)',
  red:        'rgba(248,113,113,0.90)',
  redBg:      'rgba(248,113,113,0.07)',
  redBorder:  'rgba(248,113,113,0.16)',
}

const COMMON_CATEGORIES = [
  'Przystawki','Zupy','Sałatki','Dania główne','Burgery','Kebaby',
  'Pizza','Makarony','Ryby','Wegetariańskie','Desery','Napoje','Alkohole',
]

// ─── Primitives ───────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text', hint }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-medium mb-1" style={{ color: T.fg2 }}>
        {label}
      </label>
      <input
        type={type}
        className="w-full px-3 py-2 text-[13px] rounded-md outline-none"
        style={{ background: T.card, border: T.cardBorder, color: T.fg0 }}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      {hint && <p className="text-[11px] mt-1" style={{ color: T.fg2 }}>{hint}</p>}
    </div>
  )
}

function TextareaField({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-medium mb-1" style={{ color: T.fg2 }}>{label}</label>
      <textarea
        rows={rows}
        className="w-full px-3 py-2 text-[13px] rounded-md outline-none resize-none"
        style={{ background: T.card, border: T.cardBorder, color: T.fg0 }}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}

function CategoryField({ label, value, onChange }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-medium mb-1" style={{ color: T.fg2 }}>{label}</label>
      <input
        list="rm-categories"
        className="w-full px-3 py-2 text-[13px] rounded-md outline-none"
        style={{ background: T.card, border: T.cardBorder, color: T.fg0 }}
        value={value}
        onChange={onChange}
        placeholder="np. Dania główne"
      />
      <datalist id="rm-categories">
        {COMMON_CATEGORIES.map(c => <option key={c} value={c} />)}
      </datalist>
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 py-2 text-left"
    >
      <span
        className="relative shrink-0 transition-colors duration-200"
        style={{
          width: 36, height: 20, borderRadius: 10,
          background: checked ? 'rgba(249,115,22,0.80)' : 'rgba(255,255,255,0.12)',
          border: checked ? '1px solid rgba(249,115,22,0.50)' : '1px solid rgba(255,255,255,0.14)',
          display: 'inline-block',
        }}
      >
        <span
          className="absolute top-0.5 transition-transform duration-200"
          style={{
            left: 2, width: 14, height: 14, borderRadius: '50%',
            background: 'white',
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </span>
      <span className="text-[12px]" style={{ color: checked ? T.fg0 : T.fg1 }}>{label}</span>
    </button>
  )
}

function SuccessMsg({ msg }) {
  if (!msg) return null
  return (
    <div className="text-[12px] mb-3 px-3 py-2 rounded-md"
      style={{ color: T.green, background: T.greenBg, border: `1px solid ${T.greenBorder}` }}>
      {msg}
    </div>
  )
}

function ErrorMsg({ msg }) {
  if (!msg) return null
  return (
    <div className="text-[12px] mb-3 px-3 py-2 rounded-md"
      style={{ color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}` }}>
      {msg}
    </div>
  )
}

function Hairline() {
  return <div className="my-4" style={{ height: 1, background: T.divider }} />
}

function SectionTitle({ children }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: T.fg2 }}>
      {children}
    </div>
  )
}

function Skeleton({ lines = 3 }) {
  return (
    <div className="px-4 pt-6 space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="rounded-md h-9" style={{ background: 'rgba(255,255,255,0.05)', width: i % 2 === 0 ? '100%' : '72%' }} />
      ))}
    </div>
  )
}

// ─── Modal primitives ─────────────────────────────────────────────────────────

function ModalShell({ show, onClose, title, children }) {
  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child as={Fragment}
          enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.64)', backdropFilter: 'blur(4px)' }} />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment}
              enter="ease-out duration-150" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-100" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm overflow-hidden p-5 text-left"
                style={{
                  borderRadius: 'var(--radius-md, 16px)',
                  background: 'rgba(10,13,22,0.98)',
                  border: T.cardBorder,
                  boxShadow: '0 24px 56px rgba(0,0,0,0.60)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <Dialog.Title className="text-[15px] font-semibold mb-4" style={{ color: T.fg0 }}>
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

function ModalFooter({ onCancel, onConfirm, confirmLabel, busy, danger = false }) {
  return (
    <div className="flex gap-2 justify-end mt-5">
      <button
        className="px-3 py-2 text-[12px] rounded-md"
        style={{ background: 'rgba(255,255,255,0.07)', color: T.fg1 }}
        onClick={onCancel}
      >
        Anuluj
      </button>
      <button
        disabled={busy}
        onClick={onConfirm}
        className="px-3 py-2 text-[12px] font-medium rounded-md transition-opacity disabled:opacity-50"
        style={{ background: danger ? 'rgba(239,68,68,0.85)' : 'rgba(249,115,22,0.85)', color: 'white' }}
      >
        {busy ? '…' : confirmLabel}
      </button>
    </div>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'details', label: 'Dane lokalu' },
  { id: 'menu',    label: 'Menu' },
]

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 px-4 pt-4 pb-0">
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
          style={active === t.id
            ? { background: T.orangeBg, color: T.orange, border: `1px solid ${T.orangeBorder}` }
            : { background: T.card, color: T.fg1, border: `1px solid rgba(255,255,255,0.07)` }
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Details tab ─────────────────────────────────────────────────────────────

function DetailsTab({ restaurantId, userId }) {
  const EMPTY_FORM = {
    name: '', city: '', address: '', phone: '',
    description: '', website: '', min_order_pln: '',
    is_active: true, is_open: false, delivery_available: false,
    image_url: '',
  }
  const [form, setForm] = useState(EMPTY_FORM)
  const [meta, setMeta] = useState({ id: '', cuisine_type: '', maps_rating: null, photo_gallery: [] })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Load full restaurant details
  useEffect(() => {
    if (!restaurantId) return
    let alive = true
    setLoading(true)
    setSuccessMsg('')
    setErrorMsg('')
    // NOTE: description / min_order_pln / is_open require migration before they can be included:
    //   ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS description TEXT,
    //     ADD COLUMN IF NOT EXISTS min_order_pln NUMERIC,
    //     ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT false;
    supabase
      .from('restaurants')
      .select('id,name,city,address,phone,website,is_active,delivery_available,cuisine_type,maps_rating,image_url')
      .eq('id', restaurantId)
      .eq('owner_id', userId)
      .single()
      .then(({ data, error }) => {
        if (!alive) return
        setLoading(false)
        if (error || !data) {
          console.error('[RestaurantManager] load error:', error)
          setErrorMsg('Nie udało się załadować danych restauracji.')
          return
        }
        setForm(prev => ({
          ...prev,
          name:               data.name             ?? '',
          city:               data.city             ?? '',
          address:            data.address          ?? '',
          phone:              data.phone            ?? '',
          website:            data.website          ?? '',
          is_active:          data.is_active        ?? true,
          delivery_available: data.delivery_available ?? false,
          image_url:          data.image_url        ?? '',
          // description / min_order_pln / is_open: loaded only after migration
          ...(data.description    != null && { description:    data.description }),
          ...(data.min_order_pln  != null && { min_order_pln:  String(data.min_order_pln) }),
          ...(data.is_open        != null && { is_open:        data.is_open }),
        }))
        setMeta({
          id:           data.id,
          cuisine_type: data.cuisine_type ?? '',
          maps_rating:  data.maps_rating,
          photo_gallery: [],
        })

        // Fetch photo_gallery separately — JSONB column, may require extra grants
        supabase
          .from('restaurants')
          .select('photo_gallery')
          .eq('id', restaurantId)
          .single()
          .then(({ data: gd }) => {
            if (!alive || !gd) return
            setMeta(m => ({ ...m, photo_gallery: Array.isArray(gd.photo_gallery) ? gd.photo_gallery : [] }))
          })
      })
    return () => { alive = false }
  }, [restaurantId])

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))
  const t = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }))

  const save = async () => {
    if (!restaurantId) return
    try {
      setSaving(true); setErrorMsg(''); setSuccessMsg('')
      const minOrder = form.min_order_pln !== '' ? parseFloat(String(form.min_order_pln).replace(',', '.')) : null
      const patch = {
        name:               form.name             || undefined,
        city:               form.city             || null,
        address:            form.address          || null,
        phone:              form.phone            || null,
        website:            form.website          || null,
        is_active:          form.is_active,
        delivery_available: form.delivery_available,
        image_url:          form.image_url.trim() || null,
        // Include only after migration:
        ...(form.description   !== '' && { description:    form.description   || null }),
        ...(!isNaN(minOrder)          && { min_order_pln:  minOrder }),
        ...(form.is_open       != null && { is_open:        form.is_open }),
      }
      const { error } = await supabase
        .from('restaurants')
        .update(patch)
        .eq('id', restaurantId)
        .eq('owner_id', userId)
      if (error) throw error
      // Patch shared store (name/city shown in selector)
      const store = useOwnerRestaurantStore.getState()
      store.setRestaurantList(
        store.restaurants.map(r =>
          r.id === restaurantId ? { ...r, name: form.name || r.name, city: form.city || r.city } : r
        ),
        userId
      )
      setSuccessMsg('Zapisano.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (e) {
      setErrorMsg(e.message || 'Błąd zapisu.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton lines={6} />

  return (
    <div className="px-4 pt-5 pb-10 max-w-lg">
      <ErrorMsg msg={errorMsg} />
      <SuccessMsg msg={successMsg} />

      {/* Status toggles */}
      <SectionTitle>Status</SectionTitle>
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 px-1">
        <Toggle checked={form.is_active}          onChange={t('is_active')}          label="Lokal aktywny" />
        <Toggle checked={form.is_open}            onChange={t('is_open')}            label="Teraz otwarty" />
        <Toggle checked={form.delivery_available} onChange={t('delivery_available')} label="Dostawa dostępna" />
      </div>

      <Hairline />

      {/* Basic fields */}
      <SectionTitle>Dane podstawowe</SectionTitle>
      <Field label="Nazwa restauracji" value={form.name}
        onChange={f('name')} placeholder="Nazwa lokalu" />
      <Field label="Miasto" value={form.city}
        onChange={f('city')} placeholder="np. Piekary Śląskie" />
      <Field label="Adres" value={form.address}
        onChange={f('address')} placeholder="ul. Przykładowa 1" />
      <Field label="Telefon" value={form.phone}
        onChange={f('phone')} placeholder="+48 123 456 789" type="tel" />
      <Field label="Strona www" value={form.website}
        onChange={f('website')} placeholder="https://restauracja.pl" type="url" />

      <Hairline />

      {/* Extended */}
      <SectionTitle>Szczegóły</SectionTitle>
      <TextareaField label="Opis" value={form.description}
        onChange={f('description')} placeholder="Krótki opis lokalu widoczny dla klientów" />
      <Field label="Min. zamówienie (PLN)" value={form.min_order_pln}
        onChange={f('min_order_pln')} placeholder="np. 30" type="text"
        hint="Minimalna wartość zamówienia przy dostawie" />

      <Hairline />

      {/* Image */}
      <SectionTitle>Zdjęcie restauracji</SectionTitle>
      {/* Preview: image_url → first photo_gallery item → placeholder */}
      {(() => {
        const previewSrc = form.image_url.trim() || meta.photo_gallery[0] || null
        return previewSrc ? (
          <div className="mb-3 rounded-xl overflow-hidden" style={{ height: 140, background: 'rgba(255,255,255,0.03)' }}>
            <img
              src={previewSrc}
              alt="Zdjęcie restauracji"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        ) : (
          <div className="mb-3 rounded-xl flex items-center justify-center"
            style={{ height: 100, background: 'rgba(255,255,255,0.02)', border: `1px dashed rgba(255,255,255,0.10)` }}>
            <span className="text-[11px]" style={{ color: T.fg2 }}>Brak zdjęcia</span>
          </div>
        )
      })()}
      <Field label="URL zdjęcia głównego (image_url)" value={form.image_url}
        onChange={f('image_url')} placeholder="https://…/photo.jpg"
        hint={meta.photo_gallery.length > 0 ? `Galeria: ${meta.photo_gallery.length} zdjęć (podgląd z galerii gdy brak image_url)` : undefined} />

      <button
        disabled={saving}
        onClick={save}
        className="w-full py-2.5 text-[13px] font-semibold rounded-xl mt-2 transition-opacity disabled:opacity-50"
        style={{ background: 'rgba(249,115,22,0.85)', color: 'white' }}
      >
        {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
      </button>

      {/* Meta read-only */}
      <div className="mt-5 px-3 py-3 rounded-lg text-[11px] space-y-1"
        style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.divider}` }}>
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: T.fg2 }}>
          Informacje systemowe
        </div>
        <div style={{ color: T.fg1 }}>
          <span style={{ color: T.fg2 }}>ID: </span>
          <span className="font-mono">{meta.id ? meta.id.substring(0, 16) + '…' : restaurantId.substring(0, 16) + '…'}</span>
        </div>
        {meta.cuisine_type && (
          <div style={{ color: T.fg1 }}>
            <span style={{ color: T.fg2 }}>Typ kuchni: </span>{meta.cuisine_type}
          </div>
        )}
        {meta.maps_rating != null && (
          <div style={{ color: T.fg1 }}>
            <span style={{ color: T.fg2 }}>Ocena Google: </span>⭐ {meta.maps_rating}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Menu tab ─────────────────────────────────────────────────────────────────

const EMPTY_ITEM_FORM = { name: '', price_pln: '', description: '', category: '', available: true, image_url: '' }

function MenuTab({ restaurantId }) {
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [globalErr, setGlobalErr]   = useState('')
  const [filterCat, setFilterCat]   = useState('all')

  // Add
  const [addOpen, setAddOpen]       = useState(false)
  const [addForm, setAddForm]       = useState(EMPTY_ITEM_FORM)
  const [busyAdd, setBusyAdd]       = useState(false)
  const [addErr, setAddErr]         = useState('')

  // Edit
  const [editOpen, setEditOpen]     = useState(false)
  const [editItem, setEditItem]     = useState(null)
  const [editForm, setEditForm]     = useState(EMPTY_ITEM_FORM)
  const [busyEdit, setBusyEdit]     = useState(false)
  const [editErr, setEditErr]       = useState('')

  // Delete
  const [delOpen, setDelOpen]       = useState(false)
  const [delItem, setDelItem]       = useState(null)
  const [busyDel, setBusyDel]       = useState(false)

  const reload = useCallback(async (id = restaurantId) => {
    if (!id) { setItems([]); return }
    setLoading(true); setGlobalErr('')

    // Try with image_url first; if that column doesn't exist yet, fall back
    let { data, error } = await supabase
      .from('menu_items_v2')
      .select('id,name,price_pln,description,category,available,image_url,section_order')
      .eq('restaurant_id', id)
      .order('section_order', { ascending: true })
      .order('category', { nullsFirst: false })
      .order('name')

    if (error && /image_url/.test(error.message)) {
      // Column doesn't exist yet → fetch without it
      const fb = await supabase
        .from('menu_items_v2')
        .select('id,name,price_pln,description,category,available,section_order')
        .eq('restaurant_id', id)
        .order('section_order', { ascending: true })
        .order('category', { nullsFirst: false })
        .order('name')
      data = fb.data; error = fb.error
    }

    setItems(error ? [] : (data || []))
    if (error) { console.error('[MenuTab] reload error:', error); setGlobalErr(error.message) }
    setLoading(false)
  }, [restaurantId])

  useEffect(() => { reload(restaurantId) }, [restaurantId])

  const parsePrice = (s) => parseFloat(String(s).replace(',', '.'))

  const addItem = async () => {
    try {
      setBusyAdd(true); setAddErr('')
      const price = parsePrice(addForm.price_pln)
      if (!addForm.name.trim()) throw new Error('Nazwa jest wymagana')
      if (isNaN(price) || price < 0) throw new Error('Podaj poprawną cenę')
      const { error } = await supabase.from('menu_items_v2').insert({
        restaurant_id: restaurantId,
        name:          addForm.name.trim(),
        price_pln:     price,
        description:   addForm.description.trim() || null,
        category:      addForm.category.trim()    || null,
        available:     addForm.available,
        image_url:     addForm.image_url.trim()   || null,
      })
      if (error) throw error
      setAddForm(EMPTY_ITEM_FORM); setAddOpen(false)
      await reload()
    } catch (e) { setAddErr(e.message) } finally { setBusyAdd(false) }
  }

  const openEdit = (item) => {
    setEditItem(item)
    setEditForm({
      name:        item.name,
      price_pln:   String(item.price_pln ?? ''),
      description: item.description || '',
      category:    item.category    || '',
      available:   item.available   ?? true,
      image_url:   item.image_url   || '',
    })
    setEditErr(''); setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editItem) return
    try {
      setBusyEdit(true); setEditErr('')
      const price = parsePrice(editForm.price_pln)
      if (!editForm.name.trim()) throw new Error('Nazwa jest wymagana')
      if (isNaN(price) || price < 0) throw new Error('Podaj poprawną cenę')
      const { error } = await supabase.from('menu_items_v2').update({
        name:        editForm.name.trim(),
        price_pln:   price,
        description: editForm.description.trim() || null,
        category:    editForm.category.trim()    || null,
        available:   editForm.available,
        image_url:   editForm.image_url.trim()   || null,
      }).eq('id', editItem.id)
      if (error) throw error
      setEditOpen(false); setEditItem(null)
      await reload()
    } catch (e) { setEditErr(e.message) } finally { setBusyEdit(false) }
  }

  const deleteItem = async () => {
    if (!delItem) return
    try {
      setBusyDel(true)
      const { error } = await supabase.from('menu_items_v2').delete().eq('id', delItem.id)
      if (error) throw error
      setDelOpen(false); setDelItem(null)
      await reload()
    } catch (e) { setGlobalErr(e.message) } finally { setBusyDel(false) }
  }

  // Category filter values
  const categories = ['all', ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))]
  const filtered = filterCat === 'all' ? items : items.filter(i => i.category === filterCat)

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-5 pb-0">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: T.fg2 }}>
          Menu ({items.length})
        </span>
        <button
          onClick={() => { setAddForm(EMPTY_ITEM_FORM); setAddErr(''); setAddOpen(true) }}
          className="text-[11px] font-medium px-3 py-1.5 rounded-md"
          style={{ background: T.orangeBg, border: `1px solid ${T.orangeBorder}`, color: T.orange }}
        >
          + Dodaj pozycję
        </button>
      </div>

      {/* Category filter pills */}
      {categories.length > 1 && (
        <div className="flex gap-1.5 px-4 pt-3 pb-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className="shrink-0 text-[11px] px-2.5 py-1 rounded-full transition-colors"
              style={filterCat === cat
                ? { background: T.orangeBg, color: T.orange, border: `1px solid ${T.orangeBorder}` }
                : { background: T.card, color: T.fg1, border: `1px solid rgba(255,255,255,0.07)` }
              }
            >
              {cat === 'all' ? 'Wszystkie' : cat}
            </button>
          ))}
        </div>
      )}

      {globalErr && <div className="mx-4 mt-3"><ErrorMsg msg={globalErr} /></div>}

      {/* Loading */}
      {loading && <Skeleton lines={4} />}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="mx-4 mt-4 py-12 text-center rounded-xl"
          style={{ color: T.fg2, background: 'rgba(255,255,255,0.02)', border: `1px dashed rgba(255,255,255,0.08)` }}>
          <div className="text-[13px] mb-1" style={{ color: T.fg1 }}>Brak pozycji w menu</div>
          <div className="text-[11px]">Kliknij "+ Dodaj pozycję" aby zacząć</div>
        </div>
      )}

      {/* Items */}
      {!loading && filtered.length > 0 && (
        <div className="mx-4 mt-3 pb-10 space-y-1.5">
          {filtered.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: T.card, border: T.cardBorder }}
            >
              {/* Thumbnail */}
              <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.05)', border: T.cardBorder }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.currentTarget.style.display = 'none' }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[14px]">🍽</div>
                )}
              </div>

              {/* Available dot */}
              <div
                className="shrink-0 w-2 h-2 rounded-full"
                style={{ background: item.available ? 'rgba(52,211,153,0.70)' : 'rgba(255,255,255,0.18)' }}
                title={item.available ? 'Dostępne' : 'Niedostępne'}
              />

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium" style={{ color: T.fg0 }}>{item.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.category && (
                    <span className="text-[10px] px-1.5 py-px rounded-full"
                      style={{ background: 'rgba(255,255,255,0.06)', color: T.fg2, border: '1px solid rgba(255,255,255,0.08)' }}>
                      {item.category}
                    </span>
                  )}
                  {item.description && (
                    <span className="text-[11px] truncate" style={{ color: T.fg2 }}>{item.description}</span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="text-[13px] tabular-nums shrink-0 font-medium" style={{ color: T.fg1 }}>
                {Number(item.price_pln).toFixed(2)} zł
              </div>

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => openEdit(item)}
                  className="text-[11px] px-2 py-1 rounded-md"
                  style={{ background: 'rgba(255,255,255,0.05)', border: T.cardBorder, color: T.fg1 }}
                >Edytuj</button>
                <button
                  onClick={() => { setDelItem(item); setDelOpen(true) }}
                  className="text-[11px] px-2 py-1 rounded-md"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.14)', color: 'rgba(248,113,113,0.70)' }}
                >Usuń</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add */}
      <ModalShell show={addOpen} onClose={() => setAddOpen(false)} title="Dodaj pozycję">
        <ErrorMsg msg={addErr} />
        <Field label="Nazwa *" value={addForm.name}
          onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="np. Pizza Margherita" />
        <Field label="Cena (PLN) *" value={addForm.price_pln}
          onChange={e => setAddForm(f => ({ ...f, price_pln: e.target.value }))} placeholder="12.99" />
        <CategoryField label="Kategoria" value={addForm.category}
          onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} />
        <TextareaField label="Opis (opcjonalny)" value={addForm.description} rows={2}
          onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder="Krótki opis dania" />
        <Field label="URL zdjęcia" value={addForm.image_url}
          onChange={e => setAddForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://…/dish.jpg" />
        {addForm.image_url.trim() && (
          <div className="mb-3 rounded-lg overflow-hidden" style={{ height: 80 }}>
            <img src={addForm.image_url.trim()} alt="podgląd"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none' }} />
          </div>
        )}
        <Toggle checked={addForm.available}
          onChange={v => setAddForm(f => ({ ...f, available: v }))} label="Pozycja dostępna" />
        <ModalFooter onCancel={() => setAddOpen(false)} onConfirm={addItem} confirmLabel="Dodaj" busy={busyAdd} />
      </ModalShell>

      {/* Modal: Edit */}
      <ModalShell show={editOpen} onClose={() => setEditOpen(false)} title="Edytuj pozycję">
        <ErrorMsg msg={editErr} />
        <Field label="Nazwa *" value={editForm.name}
          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Nazwa dania" />
        <Field label="Cena (PLN) *" value={editForm.price_pln}
          onChange={e => setEditForm(f => ({ ...f, price_pln: e.target.value }))} placeholder="12.99" />
        <CategoryField label="Kategoria" value={editForm.category}
          onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} />
        <TextareaField label="Opis" value={editForm.description} rows={2}
          onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Krótki opis dania" />
        <Field label="URL zdjęcia" value={editForm.image_url}
          onChange={e => setEditForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://…/dish.jpg" />
        {editForm.image_url.trim() && (
          <div className="mb-3 rounded-lg overflow-hidden" style={{ height: 80 }}>
            <img src={editForm.image_url.trim()} alt="podgląd"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none' }} />
          </div>
        )}
        <Toggle checked={editForm.available}
          onChange={v => setEditForm(f => ({ ...f, available: v }))} label="Pozycja dostępna" />
        <ModalFooter onCancel={() => setEditOpen(false)} onConfirm={saveEdit} confirmLabel="Zapisz" busy={busyEdit} />
      </ModalShell>

      {/* Modal: Delete */}
      <ModalShell show={delOpen} onClose={() => setDelOpen(false)} title="Usuń pozycję">
        <p className="text-[13px] mb-4" style={{ color: T.fg1 }}>
          Czy na pewno chcesz usunąć{' '}
          <strong style={{ color: T.fg0 }}>{delItem?.name}</strong>?
        </p>
        <ModalFooter onCancel={() => setDelOpen(false)} onConfirm={deleteItem} confirmLabel="Usuń" busy={busyDel} danger />
      </ModalShell>
    </>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function RestaurantManager() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    restaurants,
    selectedId: restaurantId,
    setSelectedId: setRestaurantId,
    loading: loadingRests,
  } = useOwnerRestaurant()

  const [tab, setTab] = useState(searchParams.get('tab') || 'details')

  useEffect(() => {
    document.body.classList.add('business-theme')
    return () => document.body.classList.remove('business-theme')
  }, [])

  useEffect(() => {
    if (!user?.id) { navigate('/'); return }
  }, [user, navigate])

  // URL ?id= → store sync (deep links)
  useEffect(() => {
    if (!restaurants.length) return
    const paramId = searchParams.get('id')
    if (paramId && restaurants.find(r => r.id === paramId) && paramId !== restaurantId) {
      setRestaurantId(paramId)
    }
  }, [restaurants])

  // Keep URL in sync
  useEffect(() => {
    const params = {}
    if (restaurantId) params.id = restaurantId
    if (tab !== 'details') params.tab = tab
    setSearchParams(params, { replace: true })
  }, [restaurantId, tab])

  const selectedRestaurant = restaurants.find(r => r.id === restaurantId)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.surface, color: T.fg0, isolation: 'isolate' }}>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div
        className="shrink-0 sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
        style={{
          background: 'rgba(13,16,32,0.98)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${T.divider}`,
        }}
      >
        {/* Back */}
        <button
          onClick={() => navigate(ROUTES.PANEL_BUSINESS)}
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded-md shrink-0"
          style={{ background: T.card, border: T.cardBorder, color: T.fg1 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Panel Biznesowy
        </button>

        {/* Restaurant selector */}
        <div className="flex-1 min-w-0">
          {loadingRests ? (
            <span className="text-[12px]" style={{ color: T.fg2 }}>Ładowanie…</span>
          ) : restaurants.length === 0 ? (
            <span className="text-[12px]" style={{ color: T.fg2 }}>Brak restauracji</span>
          ) : (
            <select
              value={restaurantId}
              onChange={e => setRestaurantId(e.target.value)}
              className="w-full text-[13px] font-medium bg-transparent outline-none cursor-pointer"
              style={{ color: T.fg0, border: 'none', padding: 0 }}
            >
              {restaurants.map(r => (
                <option key={r.id} value={r.id} className="bg-[#0d1117] text-white">{r.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Status indicator */}
        {selectedRestaurant && (
          <span className="text-[10px] shrink-0" style={{ color: T.fg2 }}>
            Zarządzanie
          </span>
        )}
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loadingRests && restaurants.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-16">
          <div className="text-[14px] font-medium" style={{ color: T.fg1 }}>
            Nie masz jeszcze żadnej restauracji
          </div>
          <div className="text-[12px] text-center" style={{ color: T.fg2 }}>
            Wróć do Panelu Właściciela i utwórz swoją pierwszą restaurację.
          </div>
          <button
            onClick={() => navigate(ROUTES.PANEL_BUSINESS)}
            className="px-4 py-2 text-[12px] font-medium rounded-lg mt-2"
            style={{ background: T.orangeBg, border: `1px solid ${T.orangeBorder}`, color: T.orange }}
          >
            ← Wróć do dashboardu
          </button>
        </div>
      )}

      {/* ── Restaurant loading skeleton ───────────────────────────────────── */}
      {loadingRests && <Skeleton lines={5} />}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {!loadingRests && selectedRestaurant && (
        <>
          <TabBar active={tab} onChange={setTab} />
          {tab === 'details' && <DetailsTab restaurantId={restaurantId} userId={user?.id} />}
          {tab === 'menu'    && <MenuTab    restaurantId={restaurantId} />}
        </>
      )}

      <div style={{ height: 'calc(env(safe-area-inset-bottom) + 24px)' }} />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/auth'
import api from '../../lib/api'

export default function Leads() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [err, setErr] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Redirect if not logged in
  useEffect(() => {
    if (!user?.id) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  async function load() {
    setErr('')
    const qs = new URLSearchParams()
    qs.set('limit', '50')
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    try {
      const r = await api(`/api/business/leads?${qs.toString()}`)
      setItems(r.results || [])
    } catch (e) {
      setErr('Nie udało się wczytać leadów')
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="grid gap-3">
      <div className="flex items-end gap-2">
        <label className="grid gap-1">
          <span className="text-sm opacity-80">Od</span>
          <input type="date" className="ff-input" value={from} onChange={e=>setFrom(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm opacity-80">Do</span>
          <input type="date" className="ff-input" value={to} onChange={e=>setTo(e.target.value)} />
        </label>
        <button className="ff-btn ff-btn--primary" onClick={load}>Filtruj</button>
      </div>

      {err && <div className="ff-alert" style={{ background:'rgba(255,0,0,.10)', border:'1px solid rgba(255,0,0,.35)' }}>{err}</div>}

      {items.length === 0 ? (
        <div className="opacity-80">Brak danych</div>
      ) : (
        <div className="ff-card p-0 overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Nazwa</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Telefon</th>
                <th className="px-3 py-2">Miasto</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id} className="border-b border-white/5">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(x.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{x.name}</td>
                  <td className="px-3 py-2">{x.email}</td>
                  <td className="px-3 py-2">{x.phone || '-'}</td>
                  <td className="px-3 py-2">{x.city || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}



import { useState } from 'react'
import { useToast } from '../components/Toast'
import api from '../lib/api'

const emailRe = /[^\s@]+@[^\s@]+\.[^\s@]+/

export default function RegisterBusiness() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', nip: '', note: '' })
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const { push: toast } = useToast()

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true); setMsg(''); setErr('')
    // walidacja
    if (!form.name || form.name.trim().length < 2) { setBusy(false); setErr('Nazwa firmy powinna mieć co najmniej 2 znaki.'); return }
    if (!emailRe.test(form.email)) { setBusy(false); setErr('Podaj poprawny adres e‑mail.'); return }
    try {
      await api('/api/business/register', { method: 'POST', body: JSON.stringify(form) })
      setMsg('Zgłoszenie przyjęte. Skontaktujemy się wkrótce.')
      toast('Zgłoszenie wysłane ✅', 'success')
      setForm({ name: '', email: '', phone: '', city: '', nip: '', note: '' })
    } catch (e) {
      setErr('Nie udało się wysłać. Spróbuj ponownie.')
      toast('Nie udało się wysłać zgłoszenia', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto mt-24 max-w-2xl px-4 pb-20">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white">Rejestracja firmy</h1>
        <p className="mt-2 text-slate-300">Wypełnij formularz, aby dołączyć do naszej platformy.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <Field label="Nazwa firmy *" name="name" value={form.name} onChange={onChange} autoComplete="organization" aria-describedby={err.includes('firmy') ? 'form-error' : undefined} />
        <Field label="E-mail *" name="email" type="email" value={form.email} onChange={onChange} autoComplete="email" aria-describedby={err.includes('e-mail') ? 'form-error' : undefined} />
        <Field label="Telefon" name="phone" value={form.phone} onChange={onChange} autoComplete="tel" />
        <Field label="Miasto" name="city" value={form.city} onChange={onChange} autoComplete="address-level2" />
        <Field label="NIP (opcjonalne)" name="nip" value={form.nip} onChange={onChange} placeholder="możesz zostawić puste" />

        <div>
          <label className="block text-sm text-slate-300 mb-1">Notatka (opcjonalne)</label>
          <textarea name="note" value={form.note} onChange={onChange} className="w-full rounded-xl bg-slate-800/70 px-3 py-2 text-slate-100 ring-1 ring-white/10" rows="3" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 rounded-xl bg-orange-500 px-4 py-2 font-medium text-slate-900 disabled:opacity-50" disabled={busy}>{busy ? 'Wysyłanie…' : 'Wyślij zgłoszenie'}</button>
          <button type="button" className="rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-200 ring-1 ring-white/10 hover:bg-white/10" onClick={() => setForm({ name: '', email: '', phone: '', city: '', nip: '', note: '' })}>Wyczyść</button>
        </div>
        {msg && <div id="form-success" role="status" aria-live="polite" className="mt-2 rounded-lg bg-emerald-500/20 p-3 text-center text-sm text-emerald-200">{msg}</div>}
        {err && <div id="form-error" role="alert" aria-live="assertive" className="mt-2 rounded-lg bg-red-500/20 p-3 text-center text-sm text-red-200">{err}</div>}
      </form>
    </div>
  )
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <input {...props} className="w-full rounded-xl bg-slate-800/70 px-3 py-2 text-slate-100 ring-1 ring-white/10" />
    </div>
  )
}

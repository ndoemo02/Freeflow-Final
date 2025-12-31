import React, { useState } from 'react';
import { getApiUrl } from '../lib/config';

export default function FreeFunNearby() {
  const [city, setCity] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fetchEvents = async () => {
    setLoading(true); setErr('');
    try {
      const qs = city ? `?city=${encodeURIComponent(city)}` : '';
      const res = await fetch(getApiUrl(`/api/freefun/list${qs}`));
      const j = await res.json();
      if (!res.ok || j.ok === false) throw new Error(j.error || `HTTP ${res.status}`);
      setEvents(j.data || []);
    } catch (e) {
      setErr(e.message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="p-4 bg-slate-900 rounded-xl text-white mt-4 border border-slate-700">
      <h3 className="text-lg font-semibold mb-2">🎉 FreeFun w Twojej okolicy</h3>
      <div className="flex gap-2 mb-2">
        <input className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white" placeholder="Miasto..." value={city} onChange={e=>setCity(e.target.value)} />
        <button onClick={fetchEvents} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white">Szukaj</button>
      </div>
      {loading && <div className="text-gray-300 text-sm">Ładowanie...</div>}
      {err && <div className="text-red-400 text-sm">{err}</div>}
      {(events||[]).map(e => (
        <div key={e.id} className="mt-3 p-3 bg-slate-800 rounded-xl border border-slate-700">
          <h4 className="text-md font-semibold">{e.title}</h4>
          <p className="text-sm text-gray-300">{String(e.date).slice(0,10)} • {e.city}</p>
          <p className="text-slate-400 text-sm">{e.description}</p>
          {e.link && <a href={e.link} target="_blank" rel="noreferrer" className="text-blue-400 underline text-sm">Więcej</a>}
        </div>
      ))}
      {!loading && (!events || events.length === 0) && <div className="text-gray-400 text-sm">Brak wydarzeń</div>}
    </section>
  );
}









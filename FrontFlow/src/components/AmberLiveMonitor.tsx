import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../lib/config';

type LiveEvent = {
  intent?: string;
  nlu_ms?: number;
  db_ms?: number;
  tts_ms?: number;
  duration_ms?: number;
  created_at?: string;
};

export default function AmberLiveMonitor() {
  const [event, setEvent] = useState<LiveEvent | null>(null);

  useEffect(() => {
    try {
      const es = new EventSource(getApiUrl('/api/amber/live'));
      es.onmessage = (e) => {
        try { setEvent(JSON.parse(e.data || '{}')); } catch {}
      };
      return () => es.close();
    } catch {
      return () => {};
    }
  }, []);

  return (
    <div className="p-4 bg-slate-900 rounded-2xl text-white border border-slate-700">
      {event ? (
        <>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold">🧠 {event.intent || '—'}</h3>
            <div className="text-xs text-gray-400">{event.created_at ? new Date(event.created_at).toLocaleTimeString() : ''}</div>
          </div>
          <div className="text-sm text-gray-200">NLU: {Math.round(event.nlu_ms ?? 0)} ms</div>
          <div className="text-sm text-gray-200">DB: {Math.round(event.db_ms ?? 0)} ms</div>
          <div className="text-sm text-gray-200">TTS: {Math.round(event.tts_ms ?? 0)} ms</div>
          <div className="text-sm text-gray-400 mt-1">Total: {Math.round(event.duration_ms ?? 0)} ms</div>
        </>
      ) : (
        <p className="text-sm text-gray-300">Ładowanie...</p>
      )}
    </div>
  );
}









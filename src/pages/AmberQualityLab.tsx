import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiUrl } from '../lib/config';
import { getAccessToken } from '../lib/supabase';

type QualitySession = {
  id: string;
  runtime_session_id: string;
  status: string;
  started_at: string;
  ended_at?: string | null;
};

type QualityTurn = {
  id: string;
  turn_id: string;
  input_text?: string | null;
  understood_intent?: unknown;
  response_text?: string | null;
  integrity_status: string;
};

type QualityStep = {
  id: string;
  quality_turn_id?: string | null;
  parent_step_id?: string | null;
  sequence: number;
  event_type: string;
  source_component: string;
  status: string;
  payload_redacted?: Record<string, unknown>;
  integrity_status: string;
  occurred_at: string;
};

async function qualityFetch(path: string) {
  const token = await getAccessToken();
  if (!token) throw new Error('Zaloguj się ponownie, aby otworzyć Quality Lab.');
  const response = await fetch(getApiUrl(`/api/quality${path}`), {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-access-reason': 'post_hoc_quality_review',
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403) throw new Error('Quality Lab wymaga roli internal_admin.');
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }
  return payload;
}

function formatIntent(value: unknown): string {
  if (!value) return 'missing / not captured';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return 'unavailable'; }
}

function traceSummary(payload: Record<string, unknown> | undefined): string | null {
  if (!payload) return null;
  const guards = Array.isArray(payload.guards) ? payload.guards : [];
  const pipeline = Array.isArray(payload.pipeline_trace) ? payload.pipeline_trace : [];
  const values = [...guards, ...pipeline]
    .filter((value) => typeof value === 'string' && value.trim())
    .slice(0, 4);
  return values.length ? values.join(' → ') : null;
}

export default function AmberQualityLab() {
  const [sessions, setSessions] = useState<QualitySession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [turns, setTurns] = useState<QualityTurn[]>([]);
  const [steps, setSteps] = useState<QualityStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await qualityFetch('/sessions?limit=50');
      setSessions(payload.data || []);
      setSelectedId((current) => current || payload.data?.[0]?.runtime_session_id || null);
    } catch (loadError: any) {
      setError(loadError?.message || 'Quality Lab unavailable');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  useEffect(() => {
    if (!selectedId) {
      setTurns([]);
      setSteps([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    qualityFetch(`/sessions/${encodeURIComponent(selectedId)}`)
      .then((payload) => {
        if (cancelled) return;
        setTurns(payload.turns || []);
        setSteps(payload.steps || []);
      })
      .catch((loadError: any) => {
        if (!cancelled) {
          setTurns([]);
          setSteps([]);
          setError(loadError?.message || 'Session unavailable');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  const stepsByTurn = useMemo(() => {
    const map = new Map<string, QualityStep[]>();
    for (const step of steps) {
      if (!step.quality_turn_id) continue;
      const list = map.get(step.quality_turn_id) || [];
      list.push(step);
      map.set(step.quality_turn_id, list);
    }
    return map;
  }, [steps]);

  return (
    <section className="grid min-h-[650px] grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
      <aside className="glass rounded-xl border border-[var(--ff-stroke)] p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ff-text-1)]">Amber Quality Lab</h2>
            <p className="text-[11px] text-[var(--ff-text-2)]">Post-hoc, tylko sesje z opt-in</p>
          </div>
          <button className="rounded-lg border border-[var(--ff-stroke)] px-2 py-1 text-xs" onClick={() => void loadSessions()}>
            Odśwież
          </button>
        </div>
        <div className="space-y-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setSelectedId(session.runtime_session_id)}
              className={`w-full rounded-lg border p-3 text-left ${selectedId === session.runtime_session_id ? 'border-orange-400/60 bg-orange-400/10' : 'border-[var(--ff-stroke)] bg-white/[.02]'}`}
            >
              <div className="truncate font-mono text-[11px] text-[var(--ff-text-1)]">{session.runtime_session_id}</div>
              <div className="mt-1 flex justify-between text-[10px] text-[var(--ff-text-2)]">
                <span>{session.status}</span>
                <span>{new Date(session.started_at).toLocaleString('pl-PL')}</span>
              </div>
            </button>
          ))}
          {!loading && sessions.length === 0 && !error && (
            <p className="rounded-lg border border-dashed border-[var(--ff-stroke)] p-4 text-xs text-[var(--ff-text-2)]">Brak consented sessions.</p>
          )}
        </div>
      </aside>

      <div className="glass rounded-xl border border-[var(--ff-stroke)] p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--ff-text-1)]">Mapa decyzji</h3>
          <p className="text-[11px] text-[var(--ff-text-2)]">Użytkownik → interpretacja Amber → bramki i wykonanie → odpowiedź</p>
        </div>
        {error && <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {loading && <div className="py-8 text-center text-xs text-[var(--ff-text-2)]">Ładowanie…</div>}
        {!loading && !error && turns.length === 0 && selectedId && (
          <div className="rounded-lg border border-dashed border-[var(--ff-stroke)] p-6 text-center text-sm text-[var(--ff-text-2)]">missing / not captured</div>
        )}
        <div className="space-y-5">
          {turns.map((turn) => {
            const turnSteps = stepsByTurn.get(turn.id) || [];
            return (
              <article key={turn.id} className="rounded-xl border border-[var(--ff-stroke)] bg-black/20 p-4">
                <div className="mb-3 flex items-center justify-between text-[10px] text-[var(--ff-text-2)]">
                  <span className="font-mono">{turn.turn_id}</span>
                  <span>integrity: {turn.integrity_status || 'not_run'}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
                  <div className="rounded-lg border border-cyan-400/25 bg-cyan-400/5 p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">Co użytkownik powiedział</div>
                    <p className="whitespace-pre-wrap text-sm text-[var(--ff-text-1)]">{turn.input_text || 'missing / not captured'}</p>
                  </div>
                  <div className="rounded-lg border border-violet-400/25 bg-violet-400/5 p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-violet-300">Co Amber zrozumiała</div>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--ff-text-1)]">{formatIntent(turn.understood_intent)}</pre>
                  </div>
                  <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/5 p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Co Amber odpowiedziała</div>
                    <p className="whitespace-pre-wrap text-sm text-[var(--ff-text-1)]">{turn.response_text || 'missing / not captured'}</p>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto pb-2">
                  <div className="flex min-w-max items-stretch gap-2">
                    {turnSteps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2">
                        {index > 0 && <span className="text-orange-300/70">→</span>}
                        <div className="w-44 rounded-lg border border-[var(--ff-stroke)] bg-white/[.03] p-3">
                          <div className="text-[10px] text-orange-300">{step.event_type}</div>
                          <div className="mt-1 truncate text-xs text-[var(--ff-text-1)]">{step.source_component}</div>
                          {traceSummary(step.payload_redacted) && (
                            <div className="mt-2 line-clamp-3 text-[10px] leading-4 text-[var(--ff-text-2)]">
                              {traceSummary(step.payload_redacted)}
                            </div>
                          )}
                          <div className="mt-2 text-[10px] text-[var(--ff-text-2)]">{step.status} · #{step.sequence}</div>
                        </div>
                      </div>
                    ))}
                    {turnSteps.length === 0 && <span className="text-xs text-[var(--ff-text-2)]">Brak zarejestrowanych kroków.</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

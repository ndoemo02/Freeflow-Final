// Two isolated gates: the unchanged Phase B env-window capture and an authenticated,
// allowlisted QA run created by the bounded Playwright runner. Both remain opt-in.
import { fetchPersistedTraceRun, queueTraceEventPersistence, waitForTracePersistence } from './tracelabPersistence';
function allowed(runId: string, sessionId: string, recording = true): boolean {
  const sink = typeof window === 'undefined' ? null : (window as any).__FREEFLOW_CART_AUDIT__;
  if (sink?.mode === 'qa' && sink.run_id === runId && sink.sessionId === sessionId) {
    const expires = Date.parse(sink.capture_expires_at || '');
    return !recording || (Number.isFinite(expires) && Date.now() < expires);
  }
  if (import.meta.env.VITE_FREEFLOW_TRACELAB_DEBUG !== '1' || !runId || !sessionId) return false;
  if (import.meta.env.DEV) return true;
  const start = Date.parse(import.meta.env.VITE_LIVE_CART_AUDIT_START_AT || '');
  const end = Date.parse(import.meta.env.VITE_LIVE_CART_AUDIT_EXPIRES_AT || '');
  return import.meta.env.VITE_FREEFLOW_TRACELAB_PRODUCTION_CAPTURE === '1'
    && runId === import.meta.env.VITE_LIVE_CART_AUDIT_RUN_ID
    && sessionId === import.meta.env.VITE_LIVE_CART_AUDIT_SESSION_ID
    && Number.isFinite(start) && Number.isFinite(end) && end > start && end - start <= 30 * 60 * 1000
    && (!recording || (Date.now() >= start && Date.now() < end));
}
const redact = (key: string, value: any) => /token|authorization|cookie|secret|password|api.?key|access.?key|private.?key|credential|base64|pcm|audio|inlineData/i.test(key) ? '[redacted]'
  : typeof value === 'string' ? value.replace(/Bearer\s+[^\s"']+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]') : value;

export function startLiveCartAuditRun(runId: string, sessionId: string): boolean {
  if (!allowed(runId, sessionId)) return false;
  (window as any).__FREEFLOW_CART_AUDIT__ = { run_id: runId, sessionId, events: [], stopped: false,
    started: true, sequence: 0, collector_id: crypto.randomUUID(), mode: 'phase_b' };
  return true;
}

export async function startQaLiveCartAuditRun(sessionId: string): Promise<{ run_id: string; session_id: string; capture_expires_at: string }> {
  if ((window as any).__FREEFLOW_TRACELAB_QA_RUNNER__ !== 'phase1') throw new Error('tracelab_qa_runner_required');
  const [{ getAccessToken }, { getApiUrl }] = await Promise.all([import('./supabase'), import('./config')]);
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('tracelab_test_account_required');
  const response = await fetch(getApiUrl('/api/voice/live/tracelab-run'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ session_id: sessionId }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.session_id !== sessionId || typeof payload?.run_id !== 'string') {
    throw new Error(payload?.error || 'tracelab_run_unavailable');
  }
  const expires = Date.parse(payload.capture_expires_at || '');
  if (!Number.isFinite(expires) || expires <= Date.now() || expires - Date.now() > 21 * 60 * 1000) {
    throw new Error('invalid_tracelab_capture_window');
  }
  (window as any).__FREEFLOW_CART_AUDIT__ = { run_id: payload.run_id, sessionId, events: [], stopped: false,
    started: true, sequence: 0, collector_id: crypto.randomUUID(), mode: 'qa', capture_expires_at: payload.capture_expires_at };
  return { run_id: payload.run_id, session_id: sessionId, capture_expires_at: payload.capture_expires_at };
}

export function getActiveLiveCartAuditRunId(sessionId: string): string | null {
  const sink = (window as any).__FREEFLOW_CART_AUDIT__;
  return sink?.sessionId === sessionId && allowed(sink.run_id, sessionId) && !sink.stopped ? sink.run_id : null;
}
export function stopLiveCartAuditRun(runId: string): boolean {
  const sink = (window as any).__FREEFLOW_CART_AUDIT__;
  if (sink?.run_id !== runId || !allowed(runId, sink.sessionId, false)) return false;
  sink.stopped = true;
  return true;
}

export function auditCartSnapshot(cart: any) {
  const items = Array.isArray(cart) ? cart : cart?.items;
  return { items: (Array.isArray(items) ? items : []).map((i: any) => ({
    id: i.id || i.menu_item_id || null, name: i.name || null,
    variant: i.size_or_variant ?? i.variant ?? null,
    qty: i.qty ?? i.quantity ?? null, price: i.price_pln ?? i.price ?? null,
    restaurant_id: i.restaurant_id || null,
  })), total: cart?.total ?? null };
}

export function recordLiveCartAudit(sessionId: string | null | undefined, stage: string, data: Record<string, unknown>) {
  try {
    const sink = (window as any).__FREEFLOW_CART_AUDIT__;
    if (!sessionId || !allowed(sink?.run_id, sessionId) || sink?.sessionId !== sessionId || !Array.isArray(sink.events)
      || sink.stopped || (!import.meta.env.DEV && sink.started !== true)) return;
    let { turn_id = null, request_id = null, ...payload } = data;
    if (!request_id && ['conversation_store_applied', 'cart_sync_attempt', 'ui_cart_committed'].includes(stage)) {
      // Correlate only an exact, unique snapshot already observed in this run.
      // Never attach the most recent request merely because it happened last.
      const key = (cart: any) => JSON.stringify(auditCartSnapshot(cart).items.map((i: any) =>
        [i.id, i.qty, i.variant, i.price]).sort((a: any, b: any) => String(a[0]).localeCompare(String(b[0]))));
      const target = key(data.incoming || data.cart);
      const links = new Map<string, any>();
      for (const previous of sink.events) {
        const cart = previous.event === 'conversation_store_applied' ? previous.payload.cart
          : previous.event === 'tool_execution_result' ? previous.payload.response?.cart : null;
        if (cart && previous.run_id === sink.run_id && previous.session_id === sessionId
          && previous.request_id && key(cart) === target) links.set(`${previous.turn_id}/${previous.request_id}`, previous);
      }
      if (links.size === 1) {
        const link = [...links.values()][0];
        turn_id = link.turn_id; request_id = link.request_id;
        payload = { ...payload, trace_correlation: 'unique_cart_snapshot' };
      }
    }
    sink.collector_id ||= crypto.randomUUID();
    sink.sequence = (sink.sequence || 0) + 1;
    const event = JSON.parse(JSON.stringify({ run_id: sink.run_id, session_id: sessionId, turn_id, request_id,
      source: 'frontend', event: stage, timestamp: Date.now(),
      payload: { ...payload, collector_id: sink.collector_id, sequence: sink.sequence } }, redact));
    sink.events.push(event);
    if (sink.events.length > 300) { sink.events.shift(); sink.truncated = true; }
    if (sink.mode === 'qa' || import.meta.env.VITE_FREEFLOW_TRACELAB_PERSIST === '1') queueTraceEventPersistence(event);
  } catch { /* diagnostics must never affect ordering */ }
}

export async function exportPersistedQaTraceRun(runId: string): Promise<string> {
  const sink = (window as any).__FREEFLOW_CART_AUDIT__;
  if (sink?.mode !== 'qa' || sink.run_id !== runId || !allowed(runId, sink.sessionId, false)) throw new Error('tracelab_run_not_active');
  await waitForTracePersistence();
  const events = await fetchPersistedTraceRun(runId, sink.sessionId);
  return JSON.stringify({ schema: 'freeflow.tracelab.v1', run_id: runId, truncated: false,
    memory_collector_truncated: !!sink.truncated, events }, redact, 2);
}

export function exportLiveCartAuditRun(runId: string): string | null {
  const sink = (window as any).__FREEFLOW_CART_AUDIT__;
  if (!runId || sink?.run_id !== runId || !allowed(runId, sink.sessionId, false) || !Array.isArray(sink.events)) return null;
  return JSON.stringify({ schema: 'freeflow.tracelab.v1', run_id: runId, truncated: !!sink.truncated,
    events: sink.events.filter((e: any) => e.run_id === runId && e.session_id === sink.sessionId) },
    redact, 2);
}

export function installLiveCartAuditControls(): void {
  if (typeof window === 'undefined') return;
  if ((window as any).__FREEFLOW_TRACELAB_QA_RUNNER__ === 'phase1') {
    (window as any).__FREEFLOW_TRACELAB_QA__ = Object.freeze({
      start: startQaLiveCartAuditRun, stop: stopLiveCartAuditRun,
      exportRun: exportPersistedQaTraceRun,
      exportMemory: exportLiveCartAuditRun,
      status: () => {
        const sink = (window as any).__FREEFLOW_CART_AUDIT__;
        return sink?.mode === 'qa' ? { run_id: sink.run_id, session_id: sink.sessionId, capture_expires_at: sink.capture_expires_at } : null;
      },
    });
  }
  const runId = import.meta.env.VITE_LIVE_CART_AUDIT_RUN_ID;
  const sessionId = import.meta.env.VITE_LIVE_CART_AUDIT_SESSION_ID;
  if (!(import.meta.env.DEV && import.meta.env.VITE_FREEFLOW_TRACELAB_DEBUG === '1') && !allowed(runId, sessionId, false)) return;
  (window as any).__FREEFLOW_TRACELAB__ = Object.freeze({
    start: startLiveCartAuditRun, stop: stopLiveCartAuditRun, exportRun: exportLiveCartAuditRun,
  });
}
installLiveCartAuditControls();

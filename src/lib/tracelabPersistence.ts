// Uses the existing authenticated browser client; never a privileged key.
// Only the already-gated, already-redacted collector calls this transport.
let pending = 0;
let clientModule: Promise<typeof import('./supabase')> | undefined;
const writes = new Set<Promise<void>>();
export async function persistTraceEvent(event: Record<string, unknown>): Promise<void> {
  if (pending >= 8) return;
  pending++;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const { supabase } = await (clientModule ||= import('./supabase'));
    await supabase.from('tracelab_events').upsert(event, {
      onConflict: 'run_id,source,collector_id,sequence', ignoreDuplicates: true,
    }).abortSignal(controller.signal);
  } catch { /* diagnostics must never affect Live, auth or ordering */ }
  finally { clearTimeout(timeout); pending--; }
}

export async function waitForTracePersistence(timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (writes.size > 0 && Date.now() < deadline) {
    await Promise.race([Promise.allSettled([...writes]), new Promise(resolve => setTimeout(resolve, 50))]);
  }
}

export function queueTraceEventPersistence(event: Record<string, unknown>): void {
  const write = persistTraceEvent(event);
  writes.add(write);
  void write.finally(() => writes.delete(write));
}

export async function fetchPersistedTraceRun(runId: string, sessionId: string): Promise<Record<string, unknown>[]> {
  const { supabase } = await (clientModule ||= import('./supabase'));
  const pageSize = 1000;
  const maxPages = 100;
  const events: Record<string, unknown>[] = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const { data, error } = await supabase.from('tracelab_events')
      .select('run_id,session_id,turn_id,request_id,source,event,timestamp,payload')
      .eq('run_id', runId).eq('session_id', sessionId)
      .order('timestamp', { ascending: true })
      .order('source', { ascending: true })
      .order('collector_id', { ascending: true })
      .order('sequence', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error('tracelab_export_unavailable');
    const rows = Array.isArray(data) ? data : [];
    events.push(...rows);
    if (rows.length < pageSize) return events;
  }
  throw new Error('tracelab_export_page_limit_exceeded');
}

// Uses the existing authenticated browser client; never a privileged key.
// Only the already-gated, already-redacted collector calls this transport.
let pending = 0;
let clientModule: Promise<typeof import('./supabase')> | undefined;
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

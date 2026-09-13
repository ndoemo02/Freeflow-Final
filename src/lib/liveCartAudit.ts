// Local debug build only. Reuses the existing collector; no production consumer endpoint.
// In-memory only, bounded, no audio payloads or credentials.
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
    if (!import.meta.env.DEV || import.meta.env.VITE_FREEFLOW_TRACELAB_DEBUG !== '1'
      || !sessionId || !sink?.run_id || sink?.sessionId !== sessionId || !Array.isArray(sink.events)) return;
    let { turn_id = null, request_id = null, ...payload } = data;
    if (!request_id && ['cart_sync_attempt', 'ui_cart_committed'].includes(stage)) {
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
    const event = JSON.parse(JSON.stringify({ run_id: sink.run_id, session_id: sessionId, turn_id, request_id,
      source: 'frontend', event: stage, timestamp: Date.now(), payload },
      (key, value) => /token|authorization|cookie|secret|password|base64|pcm/i.test(key) ? '[redacted]' : value));
    sink.events.push(event);
    if (sink.events.length > 300) { sink.events.shift(); sink.truncated = true; }
  } catch { /* diagnostics must never affect ordering */ }
}

export function exportLiveCartAuditRun(runId: string): string | null {
  const sink = (window as any).__FREEFLOW_CART_AUDIT__;
  if (!import.meta.env.DEV || import.meta.env.VITE_FREEFLOW_TRACELAB_DEBUG !== '1'
    || !runId || sink?.run_id !== runId || !Array.isArray(sink.events)) return null;
  return JSON.stringify({ schema: 'freeflow.tracelab.v1', run_id: runId, truncated: !!sink.truncated,
    events: sink.events.filter((e: any) => e.run_id === runId && e.session_id === sink.sessionId) },
    (key, value) => /token|authorization|cookie|secret|password|base64|pcm/i.test(key) ? '[redacted]' : value, 2);
}

// Explicit opt-in from DevTools: window.__FREEFLOW_CART_AUDIT__ = { sessionId, events: [] }.
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
    if (!sessionId || sink?.sessionId !== sessionId || !Array.isArray(sink.events)) return;
    const event = JSON.parse(JSON.stringify({ schema: 'live_cart_audit.v1', session_id: sessionId,
      stage, timestamp: Date.now(), ...data },
      (key, value) => /token|authorization|cookie|secret|password|base64|pcm/i.test(key) ? '[redacted]' : value));
    sink.events.push(event);
    if (sink.events.length > 300) { sink.events.shift(); sink.truncated = true; }
  } catch { /* diagnostics must never affect ordering */ }
}

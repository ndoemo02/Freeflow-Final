import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { recordLiveCartAudit, exportLiveCartAuditRun } from './liveCartAudit';
const sink = () => (window as any).__FREEFLOW_CART_AUDIT__;
beforeEach(() => {
  vi.stubEnv('DEV', true); vi.stubEnv('VITE_FREEFLOW_TRACELAB_DEBUG', '1');
  (window as any).__FREEFLOW_CART_AUDIT__ = { run_id: 'run', sessionId: 'session', events: [] };
});
afterEach(() => { delete (window as any).__FREEFLOW_CART_AUDIT__; vi.unstubAllEnvs(); });
it('blocks production and absent debug flag even when a consumer sets the global', () => {
  vi.stubEnv('DEV', false);
  recordLiveCartAudit('session', 'tool_selected', {});
  expect(exportLiveCartAuditRun('run')).toBeNull();
  vi.stubEnv('DEV', true); vi.stubEnv('VITE_FREEFLOW_TRACELAB_DEBUG', '');
  recordLiveCartAudit('session', 'tool_selected', {});
  expect(sink().events).toEqual([]);
});
it('uses the same exact envelope and one-run export with redaction and bounds', () => {
  recordLiveCartAudit('other-session', 'tool_selected', {});
  for (let i = 0; i < 301; i++) recordLiveCartAudit('session', 'tool_selected', { request_id: `r${i}`, turn_id: 'turn', authorization: 'secret' });
  const run = JSON.parse(exportLiveCartAuditRun('run')!);
  expect(run.truncated).toBe(true); expect(run.events).toHaveLength(300);
  expect(Object.keys(run.events[0]).sort()).toEqual(['run_id', 'session_id', 'turn_id', 'request_id', 'source', 'event', 'timestamp', 'payload'].sort());
  expect(run.events[0].payload.authorization).toBe('[redacted]');
  expect(exportLiveCartAuditRun('other')).toBeNull();
});
it('correlates visible cart by a unique canonical snapshot, never the last request', () => {
  const cart = { items: [{ id: 'ravioli', qty: 2, price: 39 }] };
  recordLiveCartAudit('session', 'tool_execution_result', { request_id: 'r1', turn_id: 't1', response: { cart } });
  recordLiveCartAudit('session', 'tool_selected', { request_id: 'unrelated', turn_id: 't2' });
  recordLiveCartAudit('session', 'ui_cart_committed', { cart });
  expect(sink().events.at(-1)).toMatchObject({ request_id: 'r1', turn_id: 't1', payload: { trace_correlation: 'unique_cart_snapshot' } });
  recordLiveCartAudit('session', 'tool_execution_result', { request_id: 'r2', turn_id: 't2', response: { cart } });
  recordLiveCartAudit('session', 'ui_cart_committed', { cart });
  expect(sink().events.at(-1).request_id).toBeNull();
});
it('correlates a rejected draft sync to incoming cart while retaining stale visible evidence', () => {
  const incoming = { items: [{ id: 'new', qty: 1, price: 20 }] };
  recordLiveCartAudit('session', 'conversation_store_applied', { request_id: 'r', turn_id: 't', cart: incoming });
  recordLiveCartAudit('session', 'cart_sync_attempt', { incoming, visible: { items: [] }, draft_active: true });
  expect(sink().events.at(-1)).toMatchObject({ request_id: 'r', payload: { draft_active: true, visible: { items: [] } } });
});

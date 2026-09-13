import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ write: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { from: () => ({ upsert: (event: unknown) => ({ abortSignal: (signal: AbortSignal) => db.write(event, signal) }) }) } }));
import { recordLiveCartAudit, startLiveCartAuditRun, stopLiveCartAuditRun, exportLiveCartAuditRun } from './liveCartAudit';
beforeEach(() => {
  vi.stubEnv('DEV', false); vi.stubEnv('VITE_FREEFLOW_TRACELAB_DEBUG', '1');
  vi.stubEnv('VITE_FREEFLOW_TRACELAB_PRODUCTION_CAPTURE', '1'); vi.stubEnv('VITE_FREEFLOW_TRACELAB_PERSIST', '1');
  vi.stubEnv('VITE_LIVE_CART_AUDIT_RUN_ID', 'persist'); vi.stubEnv('VITE_LIVE_CART_AUDIT_SESSION_ID', 'test');
  vi.stubEnv('VITE_LIVE_CART_AUDIT_START_AT', new Date(Date.now() - 1000).toISOString());
  vi.stubEnv('VITE_LIVE_CART_AUDIT_EXPIRES_AT', new Date(Date.now() + 60000).toISOString());
  delete (window as any).__FREEFLOW_CART_AUDIT__; db.write.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => { vi.unstubAllEnvs(); delete (window as any).__FREEFLOW_CART_AUDIT__; });
it('requires explicit start and persistence flag, correct session and active capture', async () => {
  recordLiveCartAudit('test', 'x', {});
  startLiveCartAuditRun('persist', 'test');
  vi.stubEnv('VITE_FREEFLOW_TRACELAB_PERSIST', ''); recordLiveCartAudit('test', 'x', {});
  vi.stubEnv('VITE_FREEFLOW_TRACELAB_PERSIST', '1'); recordLiveCartAudit('other', 'x', {});
  stopLiveCartAuditRun('persist'); recordLiveCartAudit('test', 'x', {});
  await new Promise(resolve => setTimeout(resolve, 10)); expect(db.write).not.toHaveBeenCalled();
});
it('keeps the export intact when redacted persistence fails', async () => {
  startLiveCartAuditRun('persist', 'test'); db.write.mockRejectedValue(new Error('network unavailable'));
  expect(recordLiveCartAudit('test', 'ui_cart_committed', { token: 'secret', audio: 'PCM' })).toBeUndefined();
  await vi.waitFor(() => expect(db.write).toHaveBeenCalledTimes(1));
  const event = db.write.mock.calls[0][0];
  expect(event.payload).toMatchObject({ token: '[redacted]', audio: '[redacted]' });
  expect(JSON.parse(exportLiveCartAuditRun('persist')!).events[0]).toEqual(event);
});
it('bounds concurrent writes and aborts a stalled database', async () => {
  startLiveCartAuditRun('persist', 'test');
  db.write.mockImplementation((_event, signal) => new Promise(resolve => signal.addEventListener('abort', () => resolve({ error: 'timeout' }))));
  for (let i = 0; i < 20; i++) recordLiveCartAudit('test', 'x', {});
  await vi.waitFor(() => expect(db.write).toHaveBeenCalledTimes(8));
  await vi.waitFor(() => expect(db.write.mock.calls.every(([, signal]) => signal.aborted)).toBe(true), { timeout: 3000 });
  expect(JSON.parse(exportLiveCartAuditRun('persist')!).events).toHaveLength(20);
});

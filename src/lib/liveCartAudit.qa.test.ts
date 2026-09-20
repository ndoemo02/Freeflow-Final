import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ token: vi.fn(), persist: vi.fn(), fetchRun: vi.fn(), wait: vi.fn() }));
vi.mock('./supabase', () => ({ getAccessToken: mocks.token }));
vi.mock('./config', () => ({ getApiUrl: (path: string) => path }));
vi.mock('./tracelabPersistence', () => ({
  queueTraceEventPersistence: mocks.persist,
  fetchPersistedTraceRun: mocks.fetchRun,
  waitForTracePersistence: mocks.wait,
}));

import { getActiveLiveCartAuditRunId, installLiveCartAuditControls, recordLiveCartAudit } from './liveCartAudit';

beforeEach(() => {
  (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__ = 'phase1';
  mocks.token.mockReset().mockResolvedValue('jwt-not-logged');
  mocks.persist.mockReset(); mocks.wait.mockReset().mockResolvedValue(undefined); mocks.fetchRun.mockReset().mockResolvedValue([]);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    ok: true, run_id: 'qa_20260920100000_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', session_id: 'sess_actual',
    capture_expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  }), { status: 201, headers: { 'Content-Type': 'application/json' } })));
  installLiveCartAuditControls();
});
afterEach(() => {
  delete (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__; delete (window as any).__FREEFLOW_TRACELAB_QA__;
  delete (window as any).__FREEFLOW_CART_AUDIT__; vi.unstubAllGlobals(); vi.unstubAllEnvs();
});

it('starts from the actual session, persists redacted events and exports both sources', async () => {
  const started = await (window as any).__FREEFLOW_TRACELAB_QA__.start('sess_actual');
  expect(started.run_id).toMatch(/^qa_/);
  expect(getActiveLiveCartAuditRunId('sess_actual')).toBe(started.run_id);
  recordLiveCartAudit('sess_actual', 'user_transcript', { audio: 'never-store', text: 'Dodaj ravioli' });
  expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({
    run_id: started.run_id, session_id: 'sess_actual', payload: expect.objectContaining({ audio: '[redacted]' }),
  }));
  const memory = JSON.parse((window as any).__FREEFLOW_TRACELAB_QA__.exportMemory(started.run_id));
  expect(memory.events).toHaveLength(1);
  expect(memory.events[0]).toMatchObject({ source: 'frontend', event: 'user_transcript' });
  mocks.fetchRun.mockResolvedValue([{ run_id: started.run_id, session_id: 'sess_actual', source: 'backend', event: 'mutation_result' }]);
  const exported = JSON.parse(await (window as any).__FREEFLOW_TRACELAB_QA__.exportRun(started.run_id));
  expect(exported.events[0]).toMatchObject({ source: 'backend', event: 'mutation_result' });
});

it('does not expose the QA control without the injected runner marker', () => {
  delete (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__; delete (window as any).__FREEFLOW_TRACELAB_QA__;
  installLiveCartAuditControls();
  expect((window as any).__FREEFLOW_TRACELAB_QA__).toBeUndefined();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createTurnLatchStore, installQaTurnLatch } from './turn-latch.mjs';

const event = (stage, sequence, payload = {}) => ({
  run_id: 'run', session_id: 'session', turn_id: 'turn', request_id: null,
  source: 'frontend', event: stage, timestamp: sequence,
  payload: { sequence, ...payload },
});

test('required stages remain latched after thousands of repetitive events', () => {
  const store = createTurnLatchStore();
  store.begin('first-item', ['user_transcript', 'tool_execution_result', 'assistant_transcript']);
  store.observe(event('user_transcript', 1, { text: 'Dodaj ravioli' }));
  for (let i = 0; i < 4000; i++) store.observe(event('cart_sync_attempt', i + 2));
  store.observe(event('tool_execution_result', 4002));
  for (let i = 0; i < 2000; i++) store.observe(event('ui_cart_committed', i + 4003));
  store.observe(event('assistant_transcript', 6003));

  const status = store.status('first-item');
  assert.equal(status.complete, true);
  assert.deepEqual(Object.keys(status.observed).sort(), ['assistant_transcript', 'tool_execution_result', 'user_transcript']);
  assert.equal(status.latest_events.user_transcript.payload.text, 'Dodaj ravioli');
  assert.deepEqual(status.repetitive_event_counts, { cart_sync_attempt: 4000, ui_cart_committed: 2000 });
});

test('timeout snapshot preserves the monotonic set of stages already seen', () => {
  const store = createTurnLatchStore();
  store.begin('timeout', ['user_transcript', 'tool_execution_result', 'assistant_transcript']);
  store.observe(event('user_transcript', 1));
  for (let i = 0; i < 3000; i++) store.observe(event('cart_sync_attempt', i + 2));

  const status = store.status('timeout');
  assert.equal(status.complete, false);
  assert.deepEqual(Object.keys(status.observed), ['user_transcript']);
  assert.equal(status.repetitive_event_counts.cart_sync_attempt, 3000);
});

test('QA array interception survives the real 300-event rolling eviction pattern', () => {
  const previousWindow = globalThis.window;
  const events = [];
  globalThis.window = {
    __FREEFLOW_TRACELAB_QA_RUNNER__: 'phase1',
    __FREEFLOW_CART_AUDIT__: { mode: 'qa', events },
    __FREEFLOW_CREATE_TURN_LATCH_STORE__: createTurnLatchStore,
  };
  try {
    assert.equal(installQaTurnLatch(), true);
    window.__FREEFLOW_TRACELAB_TURN_LATCH__.begin('rolling', ['user_transcript', 'assistant_transcript']);
    events.push(event('user_transcript', 1, { text: 'Dodaj ravioli' }));
    for (let i = 0; i < 5000; i++) {
      events.push(event('cart_sync_attempt', i + 2));
      if (events.length > 300) events.shift();
    }
    assert.equal(events.some(item => item.event === 'user_transcript'), false);
    events.push(event('assistant_transcript', 5002));
    const status = window.__FREEFLOW_TRACELAB_TURN_LATCH__.status('rolling');
    assert.equal(status.complete, true);
    assert.equal(status.latest_events.user_transcript.payload.text, 'Dodaj ravioli');
    assert.equal(status.repetitive_event_counts.cart_sync_attempt, 5000);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

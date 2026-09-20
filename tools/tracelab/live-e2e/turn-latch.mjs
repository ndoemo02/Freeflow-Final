export function createTurnLatchStore() {
  const copy = value => JSON.parse(JSON.stringify(value));
  let active = null;
  const history = new Map();

  const snapshot = turn => turn ? copy({
    turn_id: turn.turn_id,
    required: turn.required,
    started_at: turn.started_at,
    completed_at: turn.completed_at,
    ended_at: turn.ended_at,
    complete: turn.required.every(stage => Boolean(turn.observed[stage])),
    observed: turn.observed,
    latest_events: turn.latest_events,
    event_counts: turn.event_counts,
    repetitive_event_counts: {
      cart_sync_attempt: turn.event_counts.cart_sync_attempt || 0,
      ui_cart_committed: turn.event_counts.ui_cart_committed || 0,
    },
  }) : null;

  return {
    begin(turnId, required) {
      if (!turnId || !Array.isArray(required) || required.length === 0) throw new Error('invalid_turn_latch');
      if (active) throw new Error('turn_latch_already_active');
      active = {
        turn_id: turnId,
        required: [...new Set(required)],
        started_at: Date.now(),
        completed_at: null,
        ended_at: null,
        observed: {},
        latest_events: {},
        event_counts: {},
      };
      return snapshot(active);
    },
    observe(event) {
      if (!active || !event || typeof event.event !== 'string') return;
      const stage = event.event;
      active.event_counts[stage] = (active.event_counts[stage] || 0) + 1;
      if (!active.required.includes(stage)) return;
      const current = active.observed[stage] || {
        first_timestamp: event.timestamp ?? Date.now(),
        first_sequence: event.payload?.sequence ?? null,
        count: 0,
      };
      current.count += 1;
      current.last_timestamp = event.timestamp ?? Date.now();
      current.last_sequence = event.payload?.sequence ?? null;
      active.observed[stage] = current;
      active.latest_events[stage] = copy(event);
      if (!active.completed_at && active.required.every(requiredStage => Boolean(active.observed[requiredStage]))) {
        active.completed_at = Date.now();
      }
    },
    status(turnId) {
      const turn = active?.turn_id === turnId ? active : history.get(turnId);
      return snapshot(turn);
    },
    current() {
      return snapshot(active);
    },
    end(turnId) {
      if (!active || active.turn_id !== turnId) return history.has(turnId) ? snapshot(history.get(turnId)) : null;
      active.ended_at = Date.now();
      history.set(turnId, active);
      const result = snapshot(active);
      active = null;
      return result;
    },
  };
}

export function installQaTurnLatch() {
  const sink = window.__FREEFLOW_CART_AUDIT__;
  const createStore = window.__FREEFLOW_CREATE_TURN_LATCH_STORE__;
  if (window.__FREEFLOW_TRACELAB_QA_RUNNER__ !== 'phase1' || sink?.mode !== 'qa'
    || !Array.isArray(sink.events) || typeof createStore !== 'function') {
    throw new Error('qa_turn_latch_unavailable');
  }
  if (window.__FREEFLOW_TRACELAB_TURN_LATCH__) return true;
  const store = createStore();
  const originalPush = sink.events.push;
  Object.defineProperty(sink.events, 'push', {
    configurable: false,
    writable: false,
    value(...events) {
      for (const event of events) store.observe(event);
      return originalPush.apply(this, events);
    },
  });
  window.__FREEFLOW_TRACELAB_TURN_LATCH__ = Object.freeze({
    begin: store.begin,
    status: store.status,
    current: store.current,
    end: store.end,
  });
  return true;
}

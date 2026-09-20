import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getQaGeminiSessionSnapshot,
  installQaGeminiFixtureControl,
  noteQaGeminiClose,
  noteQaGeminiError,
  noteQaGeminiOpen,
  noteQaGeminiServerMessage,
  qaFixtureBoundary,
  resetQaGeminiSessionDiagnostics,
} from './geminiQaSessionDiagnostics';

describe('Gemini Live QA session diagnostics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__ = 'phase1';
    resetQaGeminiSessionDiagnostics(true);
  });

  afterEach(() => {
    delete (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__;
    resetQaGeminiSessionDiagnostics(true);
    vi.useRealTimers();
  });

  it('selects the Gemini boundary required by automatic activity detection', () => {
    expect(qaFixtureBoundary(true, 'start')).toBeNull();
    expect(qaFixtureBoundary(true, 'end')).toEqual({ audioStreamEnd: true });
    expect(qaFixtureBoundary(false, 'start')).toEqual({ activityStart: {} });
    expect(qaFixtureBoundary(false, 'end')).toEqual({ activityEnd: {} });
  });

  it('sends exactly one audioStreamEnd after one automatic-VAD fixture', () => {
    const send = vi.fn();
    expect(installQaGeminiFixtureControl(send, true)).toBe(true);

    const start = (window as any).__FREEFLOW_GEMINI_QA_DIAGNOSTICS__.startFixture();
    vi.setSystemTime(2_000);
    const end = (window as any).__FREEFLOW_GEMINI_QA_DIAGNOSTICS__.endFixture();

    expect(start.boundary).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ audioStreamEnd: true });
    expect(end.boundary).toMatchObject({ type: 'audioStreamEnd', sent: true, timestamp: 2_000 });
    expect(getQaGeminiSessionSnapshot()?.fixture_open).toBe(false);
  });

  it('captures only event types, timestamps and connection state metadata', () => {
    noteQaGeminiOpen();
    vi.setSystemTime(1_500);
    noteQaGeminiServerMessage({
      serverContent: {
        inputTranscription: { text: 'sensitive user words' },
        outputTranscription: { text: 'sensitive assistant words' },
        turnComplete: true,
      },
      toolCall: { functionCalls: [{ name: 'add_item', args: { secret: 'not retained' } }] },
    });
    noteQaGeminiError({ type: 'error', name: 'NetworkError', message: 'secret details' });
    noteQaGeminiClose({ code: 1006, reason: 'secret reason' });

    const result = getQaGeminiSessionSnapshot();
    expect(result).toMatchObject({
      open_at: 1_000,
      incoming_event_count: 1,
      first_server_event_at: 1_500,
      first_input_transcript_at: 1_500,
      first_tool_call_at: 1_500,
      first_assistant_response_at: 1_500,
      turn_complete_count: 1,
      errors: [{ timestamp: 1_500, type: 'error', name: 'NetworkError', message_present: true }],
      closes: [{ timestamp: 1_500, code: 1006, reason_present: true }],
    });
    expect(JSON.stringify(result)).not.toContain('sensitive');
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('stays unavailable without the QA runner marker', () => {
    delete (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__;
    expect(resetQaGeminiSessionDiagnostics(true)).toBe(false);
    expect((window as any).__FREEFLOW_GEMINI_QA_DIAGNOSTICS__).toBeUndefined();
  });
});

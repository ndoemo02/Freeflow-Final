import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getQaAudioBoundarySnapshot,
  measureFloatSignal,
  noteQaChunkDisposition,
  noteQaPcmChunk,
  noteQaSendRealtimeInputThrow,
  resetQaAudioBoundaryDiagnostics,
} from './audioBoundaryDiagnostics';

describe('QA audio boundary diagnostics', () => {
  beforeEach(() => {
    (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__ = 'phase1';
    resetQaAudioBoundaryDiagnostics();
  });

  afterEach(() => {
    delete (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__;
    resetQaAudioBoundaryDiagnostics();
  });

  it('keeps only aggregate signal metadata before and after PCM16 conversion', () => {
    const float = new Float32Array([0, 0.5, -0.25, 1]);
    const pcm = new Int16Array([0, 16384, -8192, 32767]);
    const input = { ...measureFloatSignal(float), web_audio_callback_count: 2 };

    const snapshot = noteQaPcmChunk(pcm.buffer, input);

    expect(snapshot).toMatchObject({
      pcm_chunk_count: 1,
      pcm_byte_count: 8,
      web_audio_callback_count: 2,
      input_sample_count: 4,
      input_non_zero_sample_count: 3,
      input_peak: 1,
      pcm16_sample_count: 4,
      pcm16_non_zero_sample_count: 3,
      pcm16_peak: 32767,
    });
    expect(snapshot?.input_rms).toBeGreaterThan(0);
    expect(snapshot?.pcm16_rms).toBeGreaterThan(0);
    expect(snapshot).not.toHaveProperty('pcm16');
    expect(snapshot).not.toHaveProperty('samples');
  });

  it('counts session state, rejected chunks and Gemini send attempts without audio payloads', () => {
    const pcm = new Int16Array([1, 2]);
    noteQaPcmChunk(pcm.buffer, { sample_count: 2, non_zero_sample_count: 2, peak: 0.1, square_sum: 0.02 });

    noteQaChunkDisposition(pcm.byteLength, false, false, false);
    noteQaChunkDisposition(pcm.byteLength, true, true, true);
    noteQaSendRealtimeInputThrow();
    const snapshot = getQaAudioBoundarySnapshot();

    expect(snapshot).toMatchObject({
      accepted_chunk_count: 1,
      rejected_inactive_session_chunk_count: 1,
      send_realtime_input_attempt_count: 1,
      send_realtime_input_byte_count: 4,
      send_realtime_input_throw_count: 1,
      chunk_state_counts: {
        session_0_active_0: 1,
        session_1_active_1: 1,
      },
    });
    expect(snapshot?.first_pcm_at).toEqual(expect.any(Number));
    expect(snapshot?.first_send_realtime_input_at).toEqual(expect.any(Number));
  });

  it('does not expose diagnostics without the injected QA runner marker', () => {
    delete (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__;
    expect(resetQaAudioBoundaryDiagnostics()).toBe(false);
    expect((window as any).__FREEFLOW_AUDIO_BOUNDARY_DIAGNOSTICS__).toBeUndefined();
    expect(getQaAudioBoundarySnapshot()).toBeNull();
  });
});

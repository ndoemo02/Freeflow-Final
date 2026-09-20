export type AudioSignalMetrics = {
  sample_count: number;
  non_zero_sample_count: number;
  peak: number;
  square_sum: number;
  web_audio_callback_count?: number;
};

type ChunkStateKey = 'session_0_active_0' | 'session_0_active_1' | 'session_1_active_0' | 'session_1_active_1';

type AudioBoundaryState = {
  started_at: number;
  first_pcm_at: number | null;
  pcm_chunk_count: number;
  pcm_byte_count: number;
  web_audio_callback_count: number;
  input_sample_count: number;
  input_non_zero_sample_count: number;
  input_peak: number;
  input_square_sum: number;
  pcm16_sample_count: number;
  pcm16_non_zero_sample_count: number;
  pcm16_peak: number;
  pcm16_square_sum: number;
  accepted_chunk_count: number;
  rejected_inactive_session_chunk_count: number;
  send_realtime_input_attempt_count: number;
  send_realtime_input_byte_count: number;
  first_send_realtime_input_at: number | null;
  send_realtime_input_throw_count: number;
  chunk_state_counts: Record<ChunkStateKey, number>;
};

export type AudioBoundarySnapshot = Omit<AudioBoundaryState, 'input_square_sum' | 'pcm16_square_sum'> & {
  enabled: true;
  input_rms: number;
  pcm16_rms: number;
};

let state: AudioBoundaryState | null = null;

function qaEnabled(): boolean {
  return typeof window !== 'undefined' && (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__ === 'phase1';
}

function createState(): AudioBoundaryState {
  return {
    started_at: Date.now(),
    first_pcm_at: null,
    pcm_chunk_count: 0,
    pcm_byte_count: 0,
    web_audio_callback_count: 0,
    input_sample_count: 0,
    input_non_zero_sample_count: 0,
    input_peak: 0,
    input_square_sum: 0,
    pcm16_sample_count: 0,
    pcm16_non_zero_sample_count: 0,
    pcm16_peak: 0,
    pcm16_square_sum: 0,
    accepted_chunk_count: 0,
    rejected_inactive_session_chunk_count: 0,
    send_realtime_input_attempt_count: 0,
    send_realtime_input_byte_count: 0,
    first_send_realtime_input_at: null,
    send_realtime_input_throw_count: 0,
    chunk_state_counts: {
      session_0_active_0: 0,
      session_0_active_1: 0,
      session_1_active_0: 0,
      session_1_active_1: 0,
    },
  };
}

function round(value: number): number {
  return Number(value.toFixed(8));
}

export function getQaAudioBoundarySnapshot(): AudioBoundarySnapshot | null {
  if (!state) return null;
  const { input_square_sum, pcm16_square_sum, ...rest } = state;
  return {
    enabled: true,
    ...rest,
    input_peak: round(rest.input_peak),
    pcm16_peak: Math.round(rest.pcm16_peak),
    input_rms: round(rest.input_sample_count ? Math.sqrt(input_square_sum / rest.input_sample_count) : 0),
    pcm16_rms: round(rest.pcm16_sample_count ? Math.sqrt(pcm16_square_sum / rest.pcm16_sample_count) : 0),
    chunk_state_counts: { ...rest.chunk_state_counts },
  };
}

function exposeSnapshot(): void {
  if (typeof window === 'undefined') return;
  (window as any).__FREEFLOW_AUDIO_BOUNDARY_DIAGNOSTICS__ = Object.freeze({
    snapshot: getQaAudioBoundarySnapshot,
  });
}

export function resetQaAudioBoundaryDiagnostics(): boolean {
  if (!qaEnabled()) {
    state = null;
    if (typeof window !== 'undefined') delete (window as any).__FREEFLOW_AUDIO_BOUNDARY_DIAGNOSTICS__;
    return false;
  }
  state = createState();
  exposeSnapshot();
  return true;
}

export function measureFloatSignal(samples: Float32Array): AudioSignalMetrics {
  let nonZero = 0;
  let peak = 0;
  let squareSum = 0;
  for (let index = 0; index < samples.length; index++) {
    const value = samples[index];
    const absolute = Math.abs(value);
    if (value !== 0) nonZero++;
    if (absolute > peak) peak = absolute;
    squareSum += value * value;
  }
  return { sample_count: samples.length, non_zero_sample_count: nonZero, peak, square_sum: squareSum };
}

export function noteQaPcmChunk(pcm16: ArrayBuffer, input: AudioSignalMetrics): AudioBoundarySnapshot | null {
  if (!state) return null;
  const samples = new Int16Array(pcm16);
  let nonZero = 0;
  let peak = 0;
  let squareSum = 0;
  for (let index = 0; index < samples.length; index++) {
    const value = samples[index];
    const absolute = Math.abs(value);
    if (value !== 0) nonZero++;
    if (absolute > peak) peak = absolute;
    const normalized = value / 32768;
    squareSum += normalized * normalized;
  }

  const now = Date.now();
  state.first_pcm_at ??= now;
  state.pcm_chunk_count++;
  state.pcm_byte_count += pcm16.byteLength;
  state.web_audio_callback_count += input.web_audio_callback_count ?? 1;
  state.input_sample_count += input.sample_count;
  state.input_non_zero_sample_count += input.non_zero_sample_count;
  state.input_peak = Math.max(state.input_peak, input.peak);
  state.input_square_sum += input.square_sum;
  state.pcm16_sample_count += samples.length;
  state.pcm16_non_zero_sample_count += nonZero;
  state.pcm16_peak = Math.max(state.pcm16_peak, peak);
  state.pcm16_square_sum += squareSum;
  return getQaAudioBoundarySnapshot();
}

export function noteQaChunkDisposition(
  pcmBytes: number,
  hasSession: boolean,
  active: boolean,
  accepted: boolean,
): AudioBoundarySnapshot | null {
  if (!state) return null;
  const key = `session_${hasSession ? 1 : 0}_active_${active ? 1 : 0}` as ChunkStateKey;
  state.chunk_state_counts[key]++;
  if (!accepted) {
    state.rejected_inactive_session_chunk_count++;
    return getQaAudioBoundarySnapshot();
  }
  state.accepted_chunk_count++;
  state.send_realtime_input_attempt_count++;
  state.send_realtime_input_byte_count += pcmBytes;
  state.first_send_realtime_input_at ??= Date.now();
  return getQaAudioBoundarySnapshot();
}

export function noteQaSendRealtimeInputThrow(): void {
  if (state) state.send_realtime_input_throw_count++;
}

export function isQaAudioBoundaryDiagnosticsEnabled(): boolean {
  return qaEnabled();
}

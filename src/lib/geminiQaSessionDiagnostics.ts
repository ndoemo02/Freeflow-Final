type QaRealtimeBoundary =
  | { audioStreamEnd: true }
  | { activityStart: Record<string, never> }
  | { activityEnd: Record<string, never> };

type IncomingEvent = {
  timestamp: number;
  types: string[];
  turn_complete: boolean;
};

type BoundaryEvent = {
  timestamp: number;
  type: 'audioStreamEnd' | 'activityStart' | 'activityEnd';
  sent: boolean;
  error_name: string | null;
};

type QaGeminiSessionState = {
  started_at: number;
  automatic_activity_detection: boolean;
  open_at: number | null;
  fixture_started_at: number | null;
  fixture_open: boolean;
  outbound_audio_gate_open: boolean;
  audio_send_count_before_boundary: number;
  audio_send_bytes_before_boundary: number;
  audio_send_count_after_boundary: number;
  audio_send_bytes_after_boundary: number;
  pcm_chunk_suppressed_while_gate_closed: number;
  pcm_bytes_suppressed_while_gate_closed: number;
  incoming_event_count: number;
  incoming_events: IncomingEvent[];
  first_server_event_at: number | null;
  first_server_event_after_boundary_at: number | null;
  first_server_event_after_boundary_types: string[] | null;
  first_input_transcript_at: number | null;
  first_tool_call_at: number | null;
  first_assistant_response_at: number | null;
  turn_complete_count: number;
  turn_complete_timestamps: number[];
  boundaries: BoundaryEvent[];
  errors: Array<{ timestamp: number; type: string; name: string | null; message_present: boolean }>;
  closes: Array<{ timestamp: number; code: number | null; reason_present: boolean }>;
};

export type QaGeminiSessionSnapshot = Omit<QaGeminiSessionState, 'fixture_open'> & {
  enabled: true;
  fixture_open: boolean;
};

let state: QaGeminiSessionState | null = null;

function qaEnabled(): boolean {
  return typeof window !== 'undefined' && (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__ === 'phase1';
}

function snapshot(): QaGeminiSessionSnapshot | null {
  if (!state) return null;
  return {
    enabled: true,
    ...state,
    incoming_events: state.incoming_events.map(event => ({ ...event, types: [...event.types] })),
    turn_complete_timestamps: [...state.turn_complete_timestamps],
    boundaries: state.boundaries.map(event => ({ ...event })),
    errors: state.errors.map(event => ({ ...event })),
    closes: state.closes.map(event => ({ ...event })),
  };
}

function exposeSnapshot(): void {
  if (typeof window === 'undefined') return;
  const current = (window as any).__FREEFLOW_GEMINI_QA_DIAGNOSTICS__;
  (window as any).__FREEFLOW_GEMINI_QA_DIAGNOSTICS__ = Object.freeze({
    ...(current || {}),
    snapshot,
  });
}

export function resetQaGeminiSessionDiagnostics(automaticActivityDetection: boolean): boolean {
  if (!qaEnabled()) {
    state = null;
    if (typeof window !== 'undefined') delete (window as any).__FREEFLOW_GEMINI_QA_DIAGNOSTICS__;
    return false;
  }
  state = {
    started_at: Date.now(),
    automatic_activity_detection: automaticActivityDetection,
    open_at: null,
    fixture_started_at: null,
    fixture_open: false,
    outbound_audio_gate_open: false,
    audio_send_count_before_boundary: 0,
    audio_send_bytes_before_boundary: 0,
    audio_send_count_after_boundary: 0,
    audio_send_bytes_after_boundary: 0,
    pcm_chunk_suppressed_while_gate_closed: 0,
    pcm_bytes_suppressed_while_gate_closed: 0,
    incoming_event_count: 0,
    incoming_events: [],
    first_server_event_at: null,
    first_server_event_after_boundary_at: null,
    first_server_event_after_boundary_types: null,
    first_input_transcript_at: null,
    first_tool_call_at: null,
    first_assistant_response_at: null,
    turn_complete_count: 0,
    turn_complete_timestamps: [],
    boundaries: [],
    errors: [],
    closes: [],
  };
  exposeSnapshot();
  return true;
}

function hasText(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return ['text', 'transcript'].some(key => typeof record[key] === 'string' && Boolean((record[key] as string).trim()));
}

export function noteQaGeminiServerMessage(message: unknown): void {
  if (!state || !message || typeof message !== 'object') return;
  const now = Date.now();
  const msg = message as Record<string, any>;
  const content = msg.serverContent as Record<string, any> | undefined;
  const types: string[] = [];

  if (msg.setupComplete) types.push('setupComplete');
  if (content) types.push('serverContent');
  if (content?.inputTranscription || content?.inputTranscript) types.push('inputTranscription');
  if (content?.outputTranscription || content?.outputTranscript) types.push('outputTranscription');
  if (content?.modelTurn) types.push('modelTurn');
  if (content?.turnComplete) types.push('turnComplete');
  if (content?.generationComplete) types.push('generationComplete');
  if (content?.interrupted) types.push('interrupted');
  if (content?.waitingForInput) types.push('waitingForInput');
  if (msg.toolCall) types.push('toolCall');
  if (msg.toolCallCancellation) types.push('toolCallCancellation');
  if (msg.usageMetadata) types.push('usageMetadata');
  if (msg.goAway || content?.goAway) types.push('goAway');
  if (msg.sessionResumptionUpdate || content?.sessionResumptionUpdate) types.push('sessionResumptionUpdate');
  if (msg.voiceActivityDetectionSignal) types.push('voiceActivityDetectionSignal');
  if (msg.voiceActivity) types.push('voiceActivity');
  if (!types.length) types.push('unknown');

  state.incoming_event_count++;
  state.incoming_events.push({ timestamp: now, types, turn_complete: Boolean(content?.turnComplete) });
  state.first_server_event_at ??= now;
  const lastBoundary = state.boundaries[state.boundaries.length - 1];
  if (lastBoundary && now >= lastBoundary.timestamp && state.first_server_event_after_boundary_at === null) {
    state.first_server_event_after_boundary_at = now;
    state.first_server_event_after_boundary_types = [...types];
  }
  if (hasText(content?.inputTranscription) || hasText(content?.inputTranscript)) state.first_input_transcript_at ??= now;
  if (msg.toolCall) state.first_tool_call_at ??= now;
  if (hasText(content?.outputTranscription) || hasText(content?.outputTranscript) || content?.modelTurn) {
    state.first_assistant_response_at ??= now;
  }
  if (content?.turnComplete) {
    state.turn_complete_count++;
    state.turn_complete_timestamps.push(now);
  }
}

export function noteQaGeminiOpen(): void {
  if (state) state.open_at ??= Date.now();
}

export function noteQaGeminiError(event: unknown): void {
  if (!state) return;
  const error = (event && typeof event === 'object' ? event : {}) as Record<string, unknown>;
  state.errors.push({
    timestamp: Date.now(),
    type: typeof error.type === 'string' ? error.type : 'error',
    name: typeof error.name === 'string' ? error.name : null,
    message_present: typeof error.message === 'string' && error.message.length > 0,
  });
}

export function noteQaGeminiClose(event?: { code?: number; reason?: string }): void {
  if (!state) return;
  state.closes.push({
    timestamp: Date.now(),
    code: typeof event?.code === 'number' ? event.code : null,
    reason_present: Boolean(event?.reason),
  });
}

export function qaFixtureBoundary(
  automaticActivityDetection: boolean,
  phase: 'start' | 'end',
): QaRealtimeBoundary | null {
  if (automaticActivityDetection) return phase === 'end' ? { audioStreamEnd: true } : null;
  return phase === 'start' ? { activityStart: {} } : { activityEnd: {} };
}

export function shouldSendQaOutboundAudio(pcmBytes: number): boolean {
  if (!state) return true;
  if (state.outbound_audio_gate_open) return true;
  state.pcm_chunk_suppressed_while_gate_closed++;
  state.pcm_bytes_suppressed_while_gate_closed += pcmBytes;
  return false;
}

export function noteQaOutboundAudioSend(pcmBytes: number): void {
  if (!state) return;
  if (state.outbound_audio_gate_open) {
    state.audio_send_count_before_boundary++;
    state.audio_send_bytes_before_boundary += pcmBytes;
    return;
  }
  state.audio_send_count_after_boundary++;
  state.audio_send_bytes_after_boundary += pcmBytes;
}

export function installQaGeminiFixtureControl(
  sendRealtimeInput: (payload: QaRealtimeBoundary) => void,
  automaticActivityDetection: boolean,
): boolean {
  if (!state || !qaEnabled() || typeof window === 'undefined') return false;

  const sendBoundary = (phase: 'start' | 'end') => {
    if (!state) throw new Error('qa_gemini_diagnostics_unavailable');
    if (phase === 'start') {
      if (state.fixture_open) throw new Error('qa_fixture_already_open');
      state.fixture_open = true;
      state.fixture_started_at = Date.now();
      state.outbound_audio_gate_open = true;
    } else if (!state.fixture_open) {
      throw new Error('qa_fixture_not_open');
    } else {
      state.outbound_audio_gate_open = false;
      state.fixture_open = false;
    }

    const payload = qaFixtureBoundary(automaticActivityDetection, phase);
    if (!payload) {
      return { automatic_activity_detection: automaticActivityDetection, boundary: null, timestamp: Date.now() };
    }

    const type = 'audioStreamEnd' in payload
      ? 'audioStreamEnd'
      : ('activityStart' in payload ? 'activityStart' : 'activityEnd');
    const event: BoundaryEvent = { timestamp: Date.now(), type, sent: false, error_name: null };
    state.boundaries.push(event);
    try {
      sendRealtimeInput(payload);
      event.sent = true;
    } catch (error) {
      event.error_name = error instanceof Error ? error.name : 'unknown';
      throw error;
    } finally {
      if (phase === 'end') state.fixture_open = false;
    }
    return { automatic_activity_detection: automaticActivityDetection, boundary: { ...event } };
  };

  (window as any).__FREEFLOW_GEMINI_QA_DIAGNOSTICS__ = Object.freeze({
    snapshot,
    startFixture: () => sendBoundary('start'),
    endFixture: () => sendBoundary('end'),
  });
  return true;
}

export function getQaGeminiSessionSnapshot(): QaGeminiSessionSnapshot | null {
  return snapshot();
}

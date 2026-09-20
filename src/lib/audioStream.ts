/**
 * PCM16 streaming from microphone at 16kHz.
 *
 * Uses AudioWorklet when available, falls back to ScriptProcessorNode.
 * Gemini Live expects: base64-encoded PCM16 mono at 16 kHz.
 */

import {
  isQaAudioBoundaryDiagnosticsEnabled,
  measureFloatSignal,
  noteQaPcmChunk,
  resetQaAudioBoundaryDiagnostics,
  type AudioSignalMetrics,
} from './audioBoundaryDiagnostics';

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_FRAMES = 4096; // ~256ms at 16kHz
const QA_CHUNK_FRAMES = 1600; // deterministic QA fixtures: exactly 100ms at 16kHz

const WORKLET_CODE = `
class PCM16Processor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = [];
  }
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      this._buf.push(s < 0 ? s * 0x8000 : s * 0x7FFF);
    }
    while (this._buf.length >= ${CHUNK_FRAMES}) {
      const arr = new Int16Array(this._buf.splice(0, ${CHUNK_FRAMES}));
      this.port.postMessage(arr.buffer, [arr.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm16-processor', PCM16Processor);
`;

const QA_WORKLET_CODE = `
class PCM16DiagnosticProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = [];
    this._inputPeak = 0;
    this._inputSquareSum = 0;
    this._inputNonZero = 0;
    this._inputCount = 0;
    this._processCount = 0;
  }
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    this._processCount++;
    for (let i = 0; i < ch.length; i++) {
      const raw = ch[i];
      const absolute = Math.abs(raw);
      if (raw !== 0) this._inputNonZero++;
      if (absolute > this._inputPeak) this._inputPeak = absolute;
      this._inputSquareSum += raw * raw;
      this._inputCount++;
      const s = Math.max(-1, Math.min(1, raw));
      this._buf.push(s < 0 ? s * 0x8000 : s * 0x7FFF);
    }
    while (this._buf.length >= ${QA_CHUNK_FRAMES}) {
      const arr = new Int16Array(this._buf.splice(0, ${QA_CHUNK_FRAMES}));
      const inputMetrics = {
        sample_count: this._inputCount,
        non_zero_sample_count: this._inputNonZero,
        peak: this._inputPeak,
        square_sum: this._inputSquareSum,
        web_audio_callback_count: this._processCount,
      };
      this.port.postMessage({ pcm16: arr.buffer, input_metrics: inputMetrics }, [arr.buffer]);
      this._inputPeak = 0;
      this._inputSquareSum = 0;
      this._inputNonZero = 0;
      this._inputCount = 0;
      this._processCount = 0;
    }
    return true;
  }
}
registerProcessor('pcm16-diagnostic-processor', PCM16DiagnosticProcessor);
`;

function float32ToPcm16(float32: Float32Array): ArrayBuffer {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16.buffer;
}

/**
 * Start streaming PCM16 audio from the microphone.
 *
 * @param onChunk Called with an ArrayBuffer of PCM16 samples (~every 256ms).
 * @returns A stop function that releases the mic and closes the AudioContext.
 */
export async function startPCM16Stream(
  onChunk: (pcm16: ArrayBuffer) => void,
): Promise<() => void> {
  const qaDiagnostics = resetQaAudioBoundaryDiagnostics();
  // Create/resume the context before the first await so it remains associated
  // with the user's Run Live click (required by browser autoplay policies).
  const ctx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  const resumePromise = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: TARGET_SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    await resumePromise;
  } catch (error) {
    await ctx.close().catch(() => {});
    throw error;
  }
  const source = ctx.createMediaStreamSource(stream);

  let cleanup: () => void;

  try {
    // AudioWorklet path (preferred)
    const blob = new Blob([qaDiagnostics ? QA_WORKLET_CODE : WORKLET_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    const processorName = qaDiagnostics ? 'pcm16-diagnostic-processor' : 'pcm16-processor';
    const node = new AudioWorkletNode(ctx, processorName);
    node.port.onmessage = (e: MessageEvent<ArrayBuffer | { pcm16: ArrayBuffer; input_metrics: AudioSignalMetrics }>) => {
      if (qaDiagnostics && !(e.data instanceof ArrayBuffer)) {
        noteQaPcmChunk(e.data.pcm16, e.data.input_metrics);
        onChunk(e.data.pcm16);
        return;
      }
      onChunk(e.data as ArrayBuffer);
    };
    source.connect(node);
    // Connect to destination to keep processing alive (silent output)
    node.connect(ctx.destination);

    cleanup = () => {
      node.port.onmessage = null;
      node.disconnect();
      source.disconnect();
    };
  } catch {
    // Fallback: ScriptProcessorNode (deprecated but universally supported)
    const proc = ctx.createScriptProcessor(CHUNK_FRAMES, 1, 1);
    let qaPending: number[] = [];
    proc.onaudioprocess = (e) => {
      const float32 = e.inputBuffer.getChannelData(0);
      if (qaDiagnostics) {
        for (let index = 0; index < float32.length; index++) qaPending.push(float32[index]);
        while (qaPending.length >= QA_CHUNK_FRAMES) {
          const qaFloat32 = Float32Array.from(qaPending.splice(0, QA_CHUNK_FRAMES));
          const qaPcm16 = float32ToPcm16(qaFloat32);
          if (isQaAudioBoundaryDiagnosticsEnabled()) {
            noteQaPcmChunk(qaPcm16, { ...measureFloatSignal(qaFloat32), web_audio_callback_count: 1 });
          }
          onChunk(qaPcm16);
        }
        return;
      }
      const pcm16 = float32ToPcm16(float32);
      onChunk(pcm16);
    };
    source.connect(proc);
    proc.connect(ctx.destination);

    cleanup = () => {
      proc.onaudioprocess = null;
      proc.disconnect();
      source.disconnect();
    };
  }

  return () => {
    cleanup();
    stream.getTracks().forEach((t) => t.stop());
    ctx.close().catch(() => {});
  };
}

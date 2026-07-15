/**
 * PCM16 streaming from microphone at 16kHz.
 *
 * Uses AudioWorklet when available, falls back to ScriptProcessorNode.
 * Gemini Live expects: base64-encoded PCM16 mono at 16 kHz.
 */

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_FRAMES = 4096; // ~256ms at 16kHz

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
    const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    const node = new AudioWorkletNode(ctx, 'pcm16-processor');
    node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => onChunk(e.data);
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
    proc.onaudioprocess = (e) => {
      onChunk(float32ToPcm16(e.inputBuffer.getChannelData(0)));
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

/**
 * Gapless PCM16 audio playback via AudioContext.
 *
 * Gemini Live outputs 24 kHz mono PCM16, base64-encoded.
 * This player queues chunks and schedules them back-to-back.
 */

const OUTPUT_SAMPLE_RATE = 24000;

export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private nextTime = 0;
  private sources: AudioBufferSourceNode[] = [];

  constructor(private readonly onPlayingChange?: (isPlaying: boolean) => void) {}

  private ensureCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Enqueue a chunk of raw PCM16 bytes for gapless playback. */
  enqueue(pcm16: ArrayBuffer): void {
    const ctx = this.ensureCtx();
    const int16 = new Int16Array(pcm16);
    if (int16.length === 0) return;

    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7FFF);
    }

    const buf = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buf.getChannelData(0).set(float32);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now + 0.01, this.nextTime);
    src.start(startAt);
    this.nextTime = startAt + buf.duration;

    src.onended = () => {
      const idx = this.sources.indexOf(src);
      if (idx !== -1) this.sources.splice(idx, 1);
      if (this.sources.length === 0) this.onPlayingChange?.(false);
    };
    if (this.sources.length === 0) this.onPlayingChange?.(true);
    this.sources.push(src);
  }

  /** Decode a base64 string to ArrayBuffer, then enqueue. */
  enqueueBase64(b64: string): void {
    const bin = atob(b64);
    const buf = new ArrayBuffer(bin.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < bin.length; i++) {
      view[i] = bin.charCodeAt(i);
    }
    this.enqueue(buf);
  }

  /** Stop all queued playback immediately. */
  stop(): void {
    const wasPlaying = this.sources.length > 0;
    for (const src of this.sources) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    this.sources = [];
    this.nextTime = 0;
    if (wasPlaying) this.onPlayingChange?.(false);
  }

  /** Stop and release AudioContext. */
  async close(): Promise<void> {
    this.stop();
    if (this.ctx) {
      await this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

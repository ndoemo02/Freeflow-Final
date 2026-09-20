export function installFreeFlowAudioShim() {
  window.__FREEFLOW_TRACELAB_QA_RUNNER__ = 'phase1';
  const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  let context;
  let destination;
  let activeSource;

  const ensureStream = async () => {
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      context = new AudioContextClass({ sampleRate: 16000 });
      destination = context.createMediaStreamDestination();
    }
    if (context.state === 'suspended') await context.resume();
    return destination.stream;
  };

  window.__FREEFLOW_AUDIO_SHIM__ = Object.freeze({
    ready: () => Boolean(destination && destination.stream.getAudioTracks().some(track => track.readyState === 'live')),
    state: () => ({ context: context?.state || 'uninitialized', active: Boolean(activeSource) }),
    playBase64: async (encoded) => {
      await ensureStream();
      const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
      const buffer = await context.decodeAudioData(bytes.buffer.slice(0));
      if (activeSource) { try { activeSource.stop(); } catch { /* already ended */ } }
      const source = context.createBufferSource();
      activeSource = source;
      source.buffer = buffer;
      source.connect(destination);
      await new Promise((resolve, reject) => {
        source.onended = resolve;
        try { source.start(); } catch (error) { reject(error); }
      });
      activeSource = null;
      return { duration_ms: Math.round(buffer.duration * 1000), sample_rate: buffer.sampleRate };
    },
  });

  navigator.mediaDevices.getUserMedia = async constraints => {
    if (constraints && typeof constraints === 'object' && constraints.audio) return ensureStream();
    return original(constraints);
  };
}

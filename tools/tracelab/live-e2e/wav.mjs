export function parseDeterministicPcmWav(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const readAscii = (offset, length) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  if (bytes.byteLength < 44 || readAscii(0, 4) !== 'RIFF' || readAscii(8, 4) !== 'WAVE') {
    throw new Error('fixture_invalid_wav_container');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let format = null;
  let pcm = null;
  for (let offset = 12; offset + 8 <= bytes.byteLength;) {
    const id = readAscii(offset, 4);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + size > bytes.byteLength) throw new Error('fixture_invalid_wav_chunk');
    if (id === 'fmt ') {
      if (size < 16) throw new Error('fixture_invalid_wav_format_chunk');
      format = {
        audio_format: view.getUint16(start, true),
        channels: view.getUint16(start + 2, true),
        sample_rate: view.getUint32(start + 4, true),
        block_align: view.getUint16(start + 12, true),
        bits_per_sample: view.getUint16(start + 14, true),
      };
    }
    if (id === 'data') pcm = bytes.subarray(start, start + size);
    offset = start + size + (size % 2);
  }

  if (!format || !pcm) throw new Error('fixture_missing_wav_chunks');
  if (format.audio_format !== 1 || format.channels !== 1 || format.sample_rate !== 16000
    || format.bits_per_sample !== 16 || format.block_align !== 2 || pcm.byteLength % 2 !== 0) {
    throw new Error('fixture_must_be_pcm16le_mono_16khz');
  }
  return {
    ...format,
    pcm,
    pcm_byte_count: pcm.byteLength,
    frame_count: pcm.byteLength / 2,
    duration_ms: Math.round((pcm.byteLength / 2 / format.sample_rate) * 1000),
  };
}

export function pcm16Metrics(pcm) {
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let peak = 0;
  let squareSum = 0;
  let nonZeroSampleCount = 0;
  const sampleCount = pcm.byteLength / 2;
  for (let offset = 0; offset < pcm.byteLength; offset += 2) {
    const sample = view.getInt16(offset, true);
    const absolute = Math.abs(sample);
    if (absolute > peak) peak = absolute;
    if (sample !== 0) nonZeroSampleCount++;
    const normalized = sample < 0 ? sample / 32768 : sample / 32767;
    squareSum += normalized * normalized;
  }
  return {
    peak,
    rms: sampleCount ? Math.sqrt(squareSum / sampleCount) : 0,
    non_zero_sample_count: nonZeroSampleCount,
    sample_count: sampleCount,
  };
}

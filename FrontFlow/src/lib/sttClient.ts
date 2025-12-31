// src/lib/sttClient.ts
import { getApiUrl } from './config';

export async function sttFromBlob(blob: Blob, lang = "pl-PL") {
  const buf = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const r = await fetch(getApiUrl('/api/stt'), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64: base64, lang })
  });
  if (!r.ok) throw new Error(`STT HTTP ${r.status}`);
  const { text } = await r.json();
  return text;
}
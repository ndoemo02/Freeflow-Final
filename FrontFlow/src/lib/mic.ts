// src/lib/mic.ts
export async function recordOnce({ seconds = 5 }: { seconds?: number } = {}): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });

  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => e.data?.size && chunks.push(e.data);

  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: rec.mimeType }));
    };
  });

  rec.start();
  setTimeout(() => rec.stop(), seconds * 1000);
  return done;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function getKdsElapsedMs(createdAt: string | number | Date, now = Date.now()): number {
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) return 0;
  return Math.max(0, now - timestamp);
}

export function formatKdsElapsedTime(elapsedMs: number): string {
  const safeMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;

  if (safeMs < HOUR_MS) {
    const minutes = Math.floor(safeMs / MINUTE_MS);
    const seconds = Math.floor((safeMs % MINUTE_MS) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  if (safeMs < DAY_MS) {
    const hours = Math.floor(safeMs / HOUR_MS);
    const minutes = Math.floor((safeMs % HOUR_MS) / MINUTE_MS);
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  const days = Math.floor(safeMs / DAY_MS);
  const hours = Math.floor((safeMs % DAY_MS) / HOUR_MS);
  return `${days}d ${String(hours).padStart(2, '0')}h`;
}

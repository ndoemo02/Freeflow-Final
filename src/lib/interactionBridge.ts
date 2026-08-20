/**
 * interactionBridge.ts — per-turn correlation + console diagnostics
 *
 * Contract:
 * - One turn_id per user input (voicebar text, live audio, future gestures).
 * - Logs [InteractionBridge] <stage> <key=value>... to console.
 *
 * Nie wysyla NICZEGO na siec. Warstwa sieciowa (`postBridgeTelemetry` ->
 * POST /api/live/perf) zostala wycieta w P0.5-D razem z backendowym
 * handlerem i tabela `live_perf_logs`. Telemetrie zdalna odbuduje P7.
 */

let turnSeq = 0;

export function generateTurnId(sessionId: string): string {
  turnSeq += 1;
  return `turn_${String(sessionId).slice(0, 8)}_${turnSeq}_${Date.now()}`;
}

function fmt(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function safeLogValue(key: string, value: unknown): unknown {
  if (/(text|transcript|input|reply|args|body|address|phone|email)/i.test(key)) {
    return `[redacted:length=${typeof value === 'string' ? value.length : 0}]`;
  }
  return value;
}

export function logBridge(stage: string, detail: Record<string, unknown>): void {
  const parts = Object.entries(detail)
    .filter(([, val]) => val !== undefined && val !== null)
    .map(([k, v]) => `${k}=${fmt(safeLogValue(k, v))}`);
  console.log(`[InteractionBridge] ${stage} ${parts.join(' | ')}`);
}

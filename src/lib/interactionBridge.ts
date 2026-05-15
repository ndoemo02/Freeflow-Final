/**
 * interactionBridge.ts — unified per-turn telemetry
 *
 * Contract:
 * - One turn_id per user input (voicebar text, live audio, future gestures).
 * - Logs [InteractionBridge] <stage> <key=value>... to console.
 * - Fire-and-forget POST to /api/live/perf via fetch keepalive.
 * - Fails silently if telemetry write fails.
 */
import { getApiUrl } from './config';

let turnSeq = 0;

export function generateTurnId(sessionId: string): string {
  turnSeq += 1;
  return `turn_${String(sessionId).slice(0, 8)}_${turnSeq}_${Date.now()}`;
}

export interface BridgeTiming {
  stage: string;
  ms: number;
  session_id: string;
  turn_id: string;
  model?: string;
  metadata?: Record<string, unknown>;
}

function fmt(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function logBridge(stage: string, detail: Record<string, unknown>): void {
  const parts = Object.entries(detail)
    .filter(([, val]) => val !== undefined && val !== null)
    .map(([k, v]) => `${k}=${fmt(v)}`);
  console.log(`[InteractionBridge] ${stage} ${parts.join(' | ')}`);
}

/**
 * Fire-and-forget POST. Uses fetch keepalive for reliability.
 * sendBeacon is NOT used because it cannot set Content-Type: application/json.
 * Backend perf.js reads req.body as JSON — fetch handles this correctly.
 */
export function postBridgeTelemetry(timings: BridgeTiming[]): void {
  if (!timings.length) return;
  const url = getApiUrl('/api/live/perf');
  const body = JSON.stringify({ entries: timings });
  try {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // silent — telemetry must never throw
    });
  } catch {
    // silent
  }
}

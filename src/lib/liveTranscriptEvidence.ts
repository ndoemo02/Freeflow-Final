const CART_MUTATION_TOOLS = new Set([
  'add_item_to_cart',
  'add_items_to_cart',
]);

export interface AwaitTurnTranscriptEvidenceOptions {
  toolName: string;
  turnId?: string;
  read: (turnId?: string) => string | null | undefined;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

function normalizeEvidence(value: string | null | undefined): string | null {
  const text = String(value || '').trim();
  return text || null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Gemini Live may emit a cart tool call just before final input transcription.
 * Wait only for cart mutations and only for evidence correlated to this turn.
 */
export async function awaitTurnTranscriptEvidence({
  toolName,
  turnId,
  read,
  timeoutMs = 450,
  pollIntervalMs = 20,
}: AwaitTurnTranscriptEvidenceOptions): Promise<string | null> {
  const immediate = normalizeEvidence(read(turnId));
  if (immediate) return immediate;

  if (!CART_MUTATION_TOOLS.has(toolName) || !turnId || timeoutMs <= 0) {
    return null;
  }

  const deadline = Date.now() + timeoutMs;
  const interval = Math.max(1, pollIntervalMs);
  while (Date.now() < deadline) {
    await delay(Math.min(interval, Math.max(1, deadline - Date.now())));
    const evidence = normalizeEvidence(read(turnId));
    if (evidence) return evidence;
  }

  return null;
}

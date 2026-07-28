import { describe, expect, it, vi } from 'vitest';

import { awaitTurnTranscriptEvidence } from './liveTranscriptEvidence';

describe('awaitTurnTranscriptEvidence', () => {
  it('returns immediately for tools that do not mutate the cart', async () => {
    const read = vi.fn(() => null);

    const result = await awaitTurnTranscriptEvidence({
      toolName: 'find_nearby',
      turnId: 'turn-1',
      read,
      timeoutMs: 50,
    });

    expect(result).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('waits briefly for same-turn evidence before a cart mutation', async () => {
    let transcript: string | null = null;
    setTimeout(() => {
      transcript = 'Dodaj dwie małe pepperoni';
    }, 15);

    const result = await awaitTurnTranscriptEvidence({
      toolName: 'add_item_to_cart',
      turnId: 'turn-2',
      read: (turnId) => (turnId === 'turn-2' ? transcript : null),
      timeoutMs: 80,
      pollIntervalMs: 5,
    });

    expect(result).toBe('Dodaj dwie małe pepperoni');
  });

  it('does not use evidence belonging to a different turn', async () => {
    const result = await awaitTurnTranscriptEvidence({
      toolName: 'add_items_to_cart',
      turnId: 'turn-new',
      read: (turnId) => (turnId === 'turn-old' ? 'Dodaj pizzę' : null),
      timeoutMs: 20,
      pollIntervalMs: 5,
    });

    expect(result).toBeNull();
  });

  it('does not wait when a cart tool has no correlation turn id', async () => {
    const read = vi.fn(() => null);

    const result = await awaitTurnTranscriptEvidence({
      toolName: 'add_item_to_cart',
      turnId: undefined,
      read,
      timeoutMs: 50,
    });

    expect(result).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });
});

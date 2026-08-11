import { afterEach, describe, expect, it, vi } from 'vitest';
import { logBridge } from '../../src/lib/interactionBridge';

describe('InteractionBridge console privacy', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs correlation fields but redacts content-bearing values', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    logBridge('transcript_received', {
      session_id: 'sess_privacy_1',
      turn_id: 'turn_1',
      text: 'mój pełny tekst zamówienia',
    });

    const output = String(log.mock.calls[0][0]);
    expect(output).toContain('session_id=sess_privacy_1');
    expect(output).toContain('text=[redacted:length=');
    expect(output).not.toContain('mój pełny tekst zamówienia');
  });
});

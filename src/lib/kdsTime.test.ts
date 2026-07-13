import { describe, expect, it } from 'vitest';
import { formatKdsElapsedTime, getKdsElapsedMs } from './kdsTime';

describe('KDS elapsed time', () => {
  it('formats recent orders as minutes and seconds', () => {
    expect(formatKdsElapsedTime(5 * 60_000 + 7_000)).toBe('05:07');
  });

  it('uses a compact hour format instead of unbounded minutes', () => {
    expect(formatKdsElapsedTime(3 * 60 * 60_000 + 8 * 60_000)).toBe('3h 08m');
  });

  it('uses a compact day format for stale demo orders', () => {
    expect(formatKdsElapsedTime(45 * 24 * 60 * 60_000 + 6 * 60 * 60_000)).toBe('45d 06h');
  });

  it('clamps invalid and future timestamps to zero', () => {
    const now = Date.parse('2026-07-13T10:00:00.000Z');
    expect(getKdsElapsedMs('invalid', now)).toBe(0);
    expect(getKdsElapsedMs('2026-07-13T11:00:00.000Z', now)).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import {
  extractFoodDiscoveryQuery,
  looksLikeFoodDiscoveryFailure,
  looksLikeFoodDiscoveryIntent,
} from './liveDiscoveryRecovery';

describe('live discovery recovery', () => {
  it('recognizes a pizza ordering request', () => {
    const utterance = 'Czy mogę zamówić pizzę?';
    expect(looksLikeFoodDiscoveryIntent(utterance)).toBe(true);
    expect(extractFoodDiscoveryQuery(utterance)).toBe('pizza');
  });

  it('recognizes a generic-model refusal as a recoverable failure', () => {
    expect(looksLikeFoodDiscoveryFailure(
      'Jestem dużym modelem językowym i nie mogę powiedzieć, gdzie jest pizzeria w okolicy.',
    )).toBe(true);
  });

  it('recognizes an unnecessary location question', () => {
    expect(looksLikeFoodDiscoveryFailure('Podaj miasto, żebym mogła znaleźć restaurację.')).toBe(true);
  });

  it('does not treat a normal grounded response as a failure', () => {
    expect(looksLikeFoodDiscoveryFailure('Znalazłam dwie restauracje z pizzą w pobliżu.')).toBe(false);
  });
});

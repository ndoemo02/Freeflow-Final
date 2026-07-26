import { describe, expect, it } from 'vitest';
import { deriveVoiceContext, getVoiceContextLabel } from './voiceContext';

describe('voiceContext', () => {
  it('uses Order for the home and checkout scenes', () => {
    expect(deriveVoiceContext({ uiMode: 'idle' })).toBe('order');
    expect(deriveVoiceContext({ uiMode: 'checkout' })).toBe('order');
  });

  it('uses Places only when discovery results are visible', () => {
    expect(deriveVoiceContext({ uiMode: 'list', hasSuggestedRestaurants: true })).toBe('places');
    expect(deriveVoiceContext({ uiMode: 'list', hasSuggestedRestaurants: false })).toBe('order');
  });

  it('uses Menu for a selected restaurant', () => {
    expect(deriveVoiceContext({ uiMode: 'restaurant' })).toBe('menu');
  });

  it('exposes only the three supported labels', () => {
    expect(['order', 'places', 'menu'].map((context) => getVoiceContextLabel(context as any)))
      .toEqual(['Order', 'Places', 'Menu']);
  });
});

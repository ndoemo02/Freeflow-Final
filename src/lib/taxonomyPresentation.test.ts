import { describe, expect, it } from 'vitest';
import { derivePresentedTaxonomyChips } from './taxonomyPresentation';

const parserEvent = (overrides = {}) => ({
  type: 'parser_chips',
  confidence: 'deterministic',
  chips: [
    { id: 'polish', emoji: 'PL', labelPl: 'Polska', dimension: 'topGroup' },
    { id: 'spicy', emoji: '🌶', labelPl: 'Pikantne', dimension: 'tag' },
    { id: 'vegan', emoji: '🌿', labelPl: 'Wegańskie', dimension: 'dietary' },
    { id: 'budget', emoji: '💰', labelPl: 'Budżetowo', dimension: 'priceBand' },
  ],
  ...overrides,
});

describe('derivePresentedTaxonomyChips', () => {
  it('shows at most three highest-signal constraints', () => {
    const chips = derivePresentedTaxonomyChips({ events: [parserEvent()] });
    expect(chips.map((chip) => chip.id)).toEqual(['vegan', 'spicy', 'budget']);
  });

  it('merges grounded menu feedback without matching item names', () => {
    const chips = derivePresentedTaxonomyChips({
      events: [parserEvent({ chips: [
        { id: 'vegan', emoji: '🌿', labelPl: 'Wegańskie', dimension: 'dietary' },
      ] })],
      restaurants: [{
        name: 'This name must not drive chips',
        discovery_filter_feedback: [
          { id: 'vegan', dimension: 'dietary', state: 'verified' },
        ],
      }],
    });
    expect(chips[0]).toMatchObject({ id: 'vegan', state: 'verified' });
  });

  it('prioritizes an unresolved variant token', () => {
    const chips = derivePresentedTaxonomyChips({
      events: [parserEvent({ unresolved: ['mid'] })],
    });
    expect(chips[0]).toMatchObject({
      id: 'variant:mid',
      labelPl: 'mid',
      state: 'unresolved',
    });
  });

  it('does not duplicate near with distance sorting', () => {
    const chips = derivePresentedTaxonomyChips({
      events: [parserEvent({ chips: [
        { id: 'near', emoji: '⌖', labelPl: 'Blisko', dimension: 'proximity' },
        { id: 'sort_distance', emoji: '↗', labelPl: 'Najbliżej', dimension: 'sort' },
      ] })],
    });
    expect(chips.map((chip) => chip.id)).toEqual(['near']);
  });
});

import { describe, expect, it } from 'vitest';

import { compactToolResponse } from '../hooks/useGeminiLiveSession';

describe('compactToolResponse discovery grounding', () => {
  it('keeps a bounded taxonomy explanation for each returned restaurant', () => {
    const compact = compactToolResponse('find_nearby', {
      restaurants: [{
        id: 'restaurant-1',
        name: 'Śląski Szynk',
        discovery_filter_feedback: [
          { id: 'gluten_free', dimension: 'dietary', state: 'verified' },
          { id: 'mid', dimension: 'priceBand', state: 'verified' },
          { id: 'near', dimension: 'proximity', state: 'recognized' },
          { id: 'extra', dimension: 'tag', state: 'verified' },
        ],
      }],
    });

    expect(compact.restaurants).toEqual([
      expect.objectContaining({
        id: 'restaurant-1',
        filterFeedback: [
          { id: 'gluten_free', dimension: 'dietary', state: 'verified' },
          { id: 'mid', dimension: 'priceBand', state: 'verified' },
          { id: 'near', dimension: 'proximity', state: 'recognized' },
        ],
      }),
    ]);
  });
});

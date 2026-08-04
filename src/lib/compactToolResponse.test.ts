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

  it('marks a prepared cart draft as requiring the confirmation tool', () => {
    const compact = compactToolResponse('add_item_to_cart', {
      reply: 'Potwierdzasz dodanie do koszyka?',
      context: {
        expectedContext: 'confirm_add_to_cart',
        pendingOrder: { items: [{ id: 'dish-1' }] },
      },
      cart: { items: [], total: 0 },
      meta: {
        liveTool: {
          cartChanged: false,
          cartBefore: { items: 0, total: 0 },
          cartAfter: { items: 0, total: 0 },
        },
      },
    });

    expect(compact).toMatchObject({
      actionStatus: 'not_added_clarify',
      cartChanged: false,
      confirmationRequired: true,
      nextAction: 'confirm_add_to_cart',
      mustClarify: true,
    });
  });

  it('never describes a failed confirmation as an added cart item', () => {
    const compact = compactToolResponse('confirm_add_to_cart', {
      reply: 'Nie udało się dodać pozycji.',
      cart: { items: [], total: 0 },
      meta: {
        liveTool: {
          cartChanged: false,
          cartBefore: { items: 0, total: 0 },
          cartAfter: { items: 0, total: 0 },
        },
      },
    });

    expect(compact).toMatchObject({
      actionStatus: 'not_added',
      cartChanged: false,
      mustClarify: true,
    });
  });

  it('reports confirmation success only when the backend changed the cart', () => {
    const compact = compactToolResponse('confirm_add_to_cart', {
      reply: 'Dodano Tagliatelle do koszyka.',
      cart: { items: [{ name: 'Tagliatelle', qty: 1, price: 57 }], total: 57 },
      meta: {
        liveTool: {
          cartChanged: true,
          cartBefore: { items: 0, total: 0 },
          cartAfter: { items: 1, total: 57 },
        },
      },
    });

    expect(compact).toMatchObject({
      actionStatus: 'added',
      cartChanged: true,
      cartCount: 1,
    });
  });
});

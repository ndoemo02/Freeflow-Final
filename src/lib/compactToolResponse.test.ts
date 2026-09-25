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

describe('compactToolResponse model-facing outcomes (E1)', () => {
  it('turns a variant clarification into needs_choice with exact names, not a failure', () => {
    const result = compactToolResponse('add_item_to_cart', {
      intent: 'clarify_order',
      reply: 'Jeszcze nie dodalam tej pozycji do koszyka. Czy chodziło Ci o "Kompot domowy 0,3 l" czy "Kompot domowy 0,5 l"?',
      meta: {
        clarify: { options: [{ name: 'Kompot domowy 0,3 l' }, { name: 'Kompot domowy 0,5 l' }] },
        liveTool: { cartChanged: false, cartBefore: { items: 3, total: 153 }, cartAfter: { items: 3, total: 153 } },
      },
      contextUpdates: { expectedContext: 'clarify_order' },
    });
    expect(result).toMatchObject({
      toolOutcome: 'needs_choice',
      nextAction: 'ask_user_choice',
      choices: ['Kompot domowy 0,3 l', 'Kompot domowy 0,5 l'],
      cartChanged: false,
    });
    expect(result.confirmationRequired).toBeUndefined();
  });

  it('marks a prepared multi-item draft as awaiting_confirmation', () => {
    const result = compactToolResponse('add_items_to_cart', {
      reply: 'Przygotowalam 2 pozycje (2 szt.) z Syto po Naszymu. Razem 56.00 zl. Potwierdzasz dodanie calego zestawu do koszyka?',
      meta: { source: 'order_handler_multi_pending', liveTool: { cartChanged: false } },
      contextUpdates: { expectedContext: 'confirm_add_to_cart', pendingOrder: { items: [{}, {}] } },
    });
    expect(result).toMatchObject({
      toolOutcome: 'awaiting_confirmation',
      confirmationRequired: true,
      nextAction: 'confirm_add_to_cart',
    });
  });

  it('keeps not_added for a real failure without choices or a draft', () => {
    const result = compactToolResponse('add_item_to_cart', { ok: false, reply: 'Nie znalazłam tej pozycji.', meta: {} });
    expect(result.toolOutcome).toBe('not_added');
    expect(result.choices).toBeUndefined();
  });

  it('gives the model full menu item names including the variant', () => {
    const result = compactToolResponse('show_menu', {
      menu: [
        { id: 'k1', name: 'Kotlet schabowy — standard', base_name: 'Kotlet schabowy', size_or_variant: 'standard', price: 34 },
        { id: 'k2', name: 'Kotlet schabowy — duży', base_name: 'Kotlet schabowy', size_or_variant: 'duży', price: 43 },
      ],
    });
    const items = result.menuItems as Array<{ name: string; base: string; variant: string }>;
    expect(items.map((item) => item.name)).toEqual(['Kotlet schabowy — standard', 'Kotlet schabowy — duży']);
    expect(items[0]).toMatchObject({ base: 'Kotlet schabowy', variant: 'standard' });
  });
});

describe('compactToolResponse stale draft safety (E1 review)', () => {
  it('a fresh variant question wins over a stale pendingOrder left in the session', () => {
    const result = compactToolResponse('add_item_to_cart', {
      intent: 'clarify_order',
      reply: 'Czy chodziło Ci o "Pierogi — ruskie" czy "Pierogi — z mięsem"?',
      meta: { source: 'order_item_disambiguation', clarify: { options: [{ name: 'Pierogi — ruskie' }, { name: 'Pierogi — z mięsem' }] }, liveTool: { cartChanged: false } },
      context: { expectedContext: 'clarify_order', pendingOrder: { items: [{ id: 'stale-draft' }] } },
    });
    expect(result.toolOutcome).toBe('needs_choice');
    expect(result.confirmationRequired).toBeUndefined();
    expect(result.nextAction).toBe('ask_user_choice');
  });

  it('a stale pendingOrder alone does not ask for confirmation', () => {
    const result = compactToolResponse('update_cart_item_quantity', {
      ok: false,
      reply: 'Nie ma takiej pozycji w koszyku.',
      meta: { liveTool: { cartChanged: false } },
      context: { expectedContext: 'clarify_order', pendingOrder: { items: [{ id: 'stale-draft' }] } },
    });
    expect(result.toolOutcome).toBe('not_added');
    expect(result.confirmationRequired).toBeUndefined();
  });

  it('a failed confirm_add_to_cart carries toolOutcome not_added', () => {
    const result = compactToolResponse('confirm_add_to_cart', { ok: false, reply: 'Brak szkicu do potwierdzenia.', meta: {} });
    expect(result.toolOutcome).toBe('not_added');
  });
});

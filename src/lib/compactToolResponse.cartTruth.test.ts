import { describe, expect, it } from 'vitest';
import { compactToolResponse } from '../hooks/useGeminiLiveSession';

describe('Live canonical cart truth', () => {
  it.each(['replace_cart_item', 'update_cart_item_quantity', 'remove_item_from_cart'])('%s cannot report added without a mutation', tool => {
    const result = compactToolResponse(tool, { ok: true, cart: { items: [], total: 0 }, meta: { liveTool: { cartChanged: false } } });
    expect(result.actionStatus).toBe('not_added_clarify');
    expect(result.mustClarify).toBe(true);
  });
  it.each(['get_cart_state', 'add_item_to_cart', 'confirm_add_to_cart'])('%s preserves canonical identity and variant', tool => {
    const result = compactToolResponse(tool, { cart: { items: [{ id: 'bianca-small', name: 'Bianca', size_or_variant: 'mała', qty: 1, price_pln: 30 }] } });
    expect((result.cartItems as Record<string, unknown>[])[0]).toMatchObject({ id: 'bianca-small', variant: 'mała', qty: 1 });
  });
  it('failed mutation cannot report added even with inconsistent change metadata', () => {
    expect(compactToolResponse('replace_cart_item', { ok: false, meta: { liveTool: { cartChanged: true } } }).actionStatus).toBe('not_added_clarify');
  });
});

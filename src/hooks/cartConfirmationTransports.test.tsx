import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

const cartUi = vi.hoisted(() => ({ syncCart: vi.fn(), setIsOpen: vi.fn(), resetCartLocal: vi.fn() }));
vi.mock('../state/CartContext', () => ({ useCart: () => cartUi }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ push: vi.fn() }) }));
vi.mock('../lib/config', () => ({
  getApiUrl: () => '/api/brain/v2',
  resolveLiveWsBase: () => ({ base: 'ws://localhost', source: 'test' }),
}));
vi.mock('../lib/supabase', () => ({ getAccessToken: async () => 'test-token' }));

import { useConversationStore } from '../store/useConversationStore';
import { applyToolResultToStore } from './useGeminiLiveSession';
import { useLiveEvents } from './useLiveEvents';
import { useActionDispatcher } from './useActionDispatcher';
import { activeSessionMap } from '../state/ActiveSessionMap';

class Socket {
  static OPEN = 1;
  static CONNECTING = 0;
  static latest: Socket | undefined;
  readyState = 1;
  onmessage?: (event: { data: string }) => void;
  send = vi.fn();
  close = vi.fn();
  constructor() { Socket.latest = this; }
}

const restaurant = { id: 'restaurant-demo', name: 'Demo' };
const item = { id: 'dish-1', name: 'Danie demo', quantity: 2, price_pln: 12 };
const empty = { items: [], total: 0 };
const filled = { items: [item], total: 24 };
const draft = { items: [item], restaurant_id: restaurant.id };

beforeEach(() => {
  vi.clearAllMocks();
  Socket.latest = undefined;
  localStorage.clear();
  activeSessionMap.delete('sess_cart_test');
  vi.stubGlobal('WebSocket', Socket);
  useConversationStore.setState({
    sessionId: 'sess_cart_test', cart: empty, cartSyncKey: 0,
    pendingOrder: null, expectedContext: null, conversationHistory: [],
    currentRestaurant: restaurant, selectedRestaurantPreviewId: restaurant.id,
    menuItems: [item], suggestedRestaurants: [], conversationPhase: 'ordering',
    uiMode: 'restaurant', lastIntent: null, lastFullResponse: null,
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe.each(['text', 'live', 'http'] as const)('%s cart confirmation boundary', (transport) => {
  function setup() {
    const hook = renderHook(() => {
      const { dispatch } = useActionDispatcher();
      useLiveEvents({ enabled: transport === 'live', sessionId: 'sess_cart_test', dispatch });
      return dispatch;
    });
    return async (response: any, tool = '') => {
      await act(async () => {
        if (transport === 'text') {
          vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(response), { status: 200 }));
          await useConversationStore.getState().sendMessage('test');
        } else if (transport === 'http') {
          applyToolResultToStore(tool, response);
        } else {
          await Promise.resolve();
          await Promise.resolve();
          expect(Socket.latest).toBeDefined();
          Socket.latest!.onmessage?.({ data: JSON.stringify({ type: 'tool_result', tool, response }) });
        }
        // Home dispatches lastFullResponse when the Live event stream is inactive.
        if (transport !== 'live') {
          const ui = useConversationStore.getState().lastFullResponse;
          hook.result.current(ui.actions, { ...ui.meta, cart: ui.cart || ui.meta?.cart, intent: ui.intent, tool }, ui.turn_id, ui.events);
        }
      });
    };
  }

  it('keeps both cart sinks unchanged before confirmation, then adds exactly the confirmed quantity', async () => {
    const receive = setup();
    await receive({ intent: 'open_checkout', cart: filled,
      context: { pendingOrder: draft, expectedContext: 'confirm_add_to_cart', conversationPhase: 'idle' },
      actions: [{ type: 'SYNC_CART', payload: { items: [item] } }, { type: 'SHOW_CART' }],
    }, 'add_item_to_cart');
    expect(useConversationStore.getState()).toMatchObject({ cart: empty, pendingOrder: draft, uiMode: 'restaurant', cartSyncKey: 0 });
    expect(cartUi.syncCart).not.toHaveBeenCalled();
    expect(cartUi.setIsOpen).not.toHaveBeenCalled();
    expect(useConversationStore.getState().lastFullResponse.cart).toEqual(empty);

    await receive({ intent: 'confirm_add_to_cart', context: {
      pendingOrder: null, expectedContext: null, conversationPhase: 'ordering', cart: filled,
    } }, 'confirm_add_to_cart');
    expect(useConversationStore.getState()).toMatchObject({ pendingOrder: null, expectedContext: null,
      cart: { items: [expect.objectContaining({ id: item.id, qty: 2 })], total: 24 } });
    expect(cartUi.syncCart).toHaveBeenLastCalledWith([expect.objectContaining({ id: item.id, qty: 2 })], null);
    if (transport !== 'text') {
      expect(activeSessionMap.get('sess_cart_test')?.cartItems).toEqual([
        expect.objectContaining({ id: item.id, quantity: 2 }),
      ]);
    }
  });

  it('does not revive a draft rejected by menu revalidation on a later context-free response', async () => {
    const receive = setup();
    useConversationStore.setState({ pendingOrder: draft, expectedContext: 'confirm_add_to_cart' });
    await receive({ intent: 'confirm_add_to_cart', meta: { source: 'confirm_add_to_cart_revalidation_rejected', cart: empty },
      context: { pendingOrder: null, expectedContext: 'create_order', conversationPhase: 'ordering' },
    }, 'confirm_add_to_cart');
    expect(useConversationStore.getState()).toMatchObject({ pendingOrder: null, expectedContext: 'create_order', cart: empty });
    await receive({ reply: 'Wybierz ponownie.', intent: 'clarify_order' });
    expect(useConversationStore.getState()).toMatchObject({ pendingOrder: null, cart: empty });
    expect(cartUi.syncCart).not.toHaveBeenCalled();
  });

  it('clears explicit cancellation even without echoed context and does not apply its stale cart actions', async () => {
    const receive = setup();
    useConversationStore.setState({ pendingOrder: draft, expectedContext: 'confirm_add_to_cart' });
    await receive({ intent: 'decline_add_to_cart', cart: filled,
      actions: [{ type: 'SYNC_CART', payload: { items: [item] } }],
    }, 'decline_add_to_cart');
    expect(useConversationStore.getState()).toMatchObject({ pendingOrder: null, expectedContext: null, cart: empty });
    await receive({ intent: 'clarify_order', reply: 'Co zamiast tego?' });
    expect(useConversationStore.getState().pendingOrder).toBeNull();
    expect(cartUi.syncCart).not.toHaveBeenCalled();
  });

  it('retains the draft on missing context or retry, but accepts an explicit null reset', async () => {
    const receive = setup();
    useConversationStore.setState({ pendingOrder: draft, expectedContext: 'confirm_add_to_cart' });
    await receive({ reply: 'Powtórz proszę.', cart: filled });
    expect(useConversationStore.getState()).toMatchObject({ pendingOrder: draft, cart: empty, expectedContext: 'confirm_add_to_cart' });
    await receive({ intent: 'confirm_add_to_cart', cart: empty, reply: 'Spróbuj ponownie.' }, 'confirm_add_to_cart');
    expect(useConversationStore.getState().pendingOrder).toEqual(draft);
    await receive({ intent: 'clarify_order', context: { pendingOrder: null, expectedContext: null } });
    await receive({ reply: 'Co teraz?' });
    expect(useConversationStore.getState()).toMatchObject({ pendingOrder: null, cart: empty, expectedContext: null });
    expect(cartUi.syncCart).not.toHaveBeenCalled();
  });

  it('allows a fresh draft after cancellation without reusing the preceding cancellation intent', async () => {
    const receive = setup();
    useConversationStore.setState({ pendingOrder: draft, expectedContext: 'confirm_add_to_cart' });
    await receive({ intent: 'decline_add_to_cart' }, 'decline_add_to_cart');
    const freshDraft = { ...draft, items: [{ ...item, quantity: 1 }] };
    await receive({ context: { pendingOrder: freshDraft, expectedContext: 'confirm_add_to_cart' }, cart: filled,
      actions: [{ type: 'CLEAR_CART' }, { type: 'SYNC_CART', payload: { items: [item] } }],
    }, 'add_item_to_cart');
    expect(useConversationStore.getState()).toMatchObject({ pendingOrder: freshDraft, expectedContext: 'confirm_add_to_cart', cart: empty });
    expect(cartUi.syncCart).not.toHaveBeenCalled();
    expect(cartUi.resetCartLocal).not.toHaveBeenCalled();
  });

  it('clears inherited confirmation context after a successful cart-only response', async () => {
    const receive = setup();
    useConversationStore.setState({ pendingOrder: draft, expectedContext: 'confirm_add_to_cart' });
    await receive({ intent: 'confirm_add_to_cart', cart: filled }, 'confirm_add_to_cart');
    await receive({ reply: 'Gotowe.' });
    expect(useConversationStore.getState()).toMatchObject({ pendingOrder: null, expectedContext: null,
      cart: { items: [expect.objectContaining({ qty: 2 })], total: 24 } });
  });
});

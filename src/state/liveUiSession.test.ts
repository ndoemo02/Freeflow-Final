import { beforeEach, describe, expect, it } from 'vitest';
import { useLiveUiSessionStore } from './liveUiSession';

describe('useLiveUiSessionStore', () => {
  beforeEach(() => {
    useLiveUiSessionStore.setState({
      sessionState: 'idle',
      statusText: 'Gotowe.',
      isLiveActive: false,
      isPaused: false,
      lastTool: null,
      lastIntent: null,
      lastUserTranscript: null,
      lastAssistantTranscript: null,
      selectedRestaurantName: null,
      selectedItemSummary: null,
      cartSummary: null,
    });
  });

  it('pauses without clearing session context', () => {
    const store = useLiveUiSessionStore.getState();
    store.setSessionState('restaurant_selected', {
      statusText: 'Wybrano restauracje: Rollo House',
      isLiveActive: true,
      selectedRestaurantName: 'Rollo House',
    });
    store.setTranscript('assistant', 'Wybrano restauracje.');
    store.setPaused();

    const current = useLiveUiSessionStore.getState();
    expect(current.sessionState).toBe('paused');
    expect(current.isPaused).toBe(true);
    expect(current.selectedRestaurantName).toBe('Rollo House');
    expect(current.lastAssistantTranscript).toContain('Wybrano');
  });

  it('maps tool result into ready state', () => {
    const store = useLiveUiSessionStore.getState();
    store.applyToolResult('open_checkout', { cart: { items: [{ id: 1 }] } });

    const current = useLiveUiSessionStore.getState();
    expect(current.sessionState).toBe('cart_ready');
    expect(current.statusText).toContain('Koszyk');
  });
});

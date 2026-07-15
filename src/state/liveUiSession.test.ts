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
      lastModelInputText: null,
      lastTranscriptQuality: 'unknown',
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

  it('separates speaking from a real fallback error', () => {
    const store = useLiveUiSessionStore.getState();
    store.setSpeaking();
    expect(useLiveUiSessionStore.getState().sessionState).toBe('speaking');
    expect(useLiveUiSessionStore.getState().isLiveActive).toBe(true);

    store.setError('Awaria Live');
    const current = useLiveUiSessionStore.getState();
    expect(current.sessionState).toBe('error');
    expect(current.isLiveActive).toBe(false);
    expect(current.statusText).toBe('Awaria Live');
  });

  it('keeps model input separate from user transcript and marks mismatch as low confidence', () => {
    const store = useLiveUiSessionStore.getState();
    store.setTranscript('user', 'Stereo Radio liebe du');
    store.applyToolResult('add_item_to_cart', {
      reply: 'Dodalam pozycje.',
      meta: {
        liveTool: {
          turnTrace: {
            stt: { final_transcript: 'Stereo Radio liebe du' },
            model: { input_text: 'dodaj lody z malinami' },
            warnings: [{ code: 'TEXT_DISH_MISMATCH' }],
          },
        },
      },
    });

    const current = useLiveUiSessionStore.getState();
    expect(current.lastUserTranscript).toBe('Stereo Radio liebe du');
    expect(current.lastModelInputText).toBe('dodaj lody z malinami');
    expect(current.lastTranscriptQuality).toBe('low_confidence');
  });
});

/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const live = vi.hoisted(() => ({
  onmessage: null as ((msg: unknown) => void) | null,
  pcm: null as ((chunk: ArrayBuffer) => void) | null,
  relayOptions: null as null | { getTranscriptForTurn?: (turnId?: string) => string | null },
  relayCalls: [] as Array<{ name: string; turnId?: string; transcript: string | null }>,
}));

vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  class GoogleGenAI {
    live = {
      connect: async ({ callbacks }: { callbacks: { onopen?: () => void; onmessage: (msg: unknown) => void } }) => {
        live.onmessage = callbacks.onmessage;
        callbacks.onopen?.();
        return {
          sendClientContent: vi.fn(),
          sendRealtimeInput: vi.fn(),
          sendToolResponse: vi.fn(),
          close: vi.fn(),
        };
      },
    };
  }
  return { ...actual, GoogleGenAI };
});

vi.mock('../lib/audioStream', () => ({
  startPCM16Stream: vi.fn(async (onChunk: (chunk: ArrayBuffer) => void) => {
    live.pcm = onChunk;
    return () => {};
  }),
}));

vi.mock('../lib/audioPlayback', () => ({
  AudioPlayer: class {
    stop() {}
    enqueue() {}
    enqueuePCM() {}
    enqueueBase64() {}
    close() {}
    resume() {}
    setVolume() {}
  },
}));

vi.mock('../lib/supabase', () => ({ getAccessToken: vi.fn(async () => 'user-jwt') }));

vi.mock('./useGeminiFunctionRelay', () => ({
  useGeminiFunctionRelay: (options: typeof live.relayOptions) => {
    live.relayOptions = options;
    return {
      relay: async (call: { name: string; turnId?: string }) => {
        live.relayCalls.push({
          name: call.name,
          turnId: call.turnId,
          transcript: live.relayOptions?.getTranscriptForTurn?.(call.turnId) ?? null,
        });
        return { name: call.name, response: { ok: true } };
      },
    };
  },
}));

import { useGeminiLiveSession } from './useGeminiLiveSession';

const silentChunk = () => new Int16Array(320).buffer;

async function startSession() {
  const hook = renderHook(() => useGeminiLiveSession({ wsRef: { current: null }, sessionId: 'sess_text_turn' }));
  await act(async () => {
    await hook.result.current.start();
  });
  return hook;
}

async function emitToolCall(name: string) {
  await act(async () => {
    live.onmessage?.({ toolCall: { functionCalls: [{ id: `fc_${name}`, name, args: {} }] } });
    await Promise.resolve();
  });
}

describe('useGeminiLiveSession typed turn evidence', () => {
  beforeEach(() => {
    live.onmessage = null;
    live.pcm = null;
    live.relayOptions = null;
    live.relayCalls = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const body = String(url).includes('/runtime-config')
        ? { ok: true, live_model: 'gemini-3.1-flash-live-preview' }
        : { token: 'ephemeral-token' };
      return new Response(JSON.stringify(body), { status: 200 });
    }));
  });

  it('keeps the typed text as evidence when an open mic streams silence before the tool call', async () => {
    const hook = await startSession();
    expect(live.pcm).toBeTypeOf('function');

    let sent: Awaited<ReturnType<typeof hook.result.current.sendText>> | undefined;
    await act(async () => {
      sent = await hook.result.current.sendText('Poproszę dwie Margherity 32 cm i jedno tiramisu.');
    });
    expect(sent?.accepted).toBe(true);

    act(() => live.pcm?.(silentChunk()));
    await emitToolCall('add_items_to_cart');

    expect(live.relayCalls).toEqual([
      {
        name: 'add_items_to_cart',
        turnId: sent && 'turnId' in sent ? sent.turnId : undefined,
        transcript: 'Poproszę dwie Margherity 32 cm i jedno tiramisu.',
      },
    ]);
  });

  it('opens a fresh audio turn after the typed turn completes', async () => {
    const hook = await startSession();
    let sent: Awaited<ReturnType<typeof hook.result.current.sendText>> | undefined;
    await act(async () => {
      sent = await hook.result.current.sendText('Poproszę tiramisu.');
    });
    act(() => live.pcm?.(silentChunk()));
    await emitToolCall('add_item_to_cart');
    // The turn closes on the first assistant audio after the tool response.
    await act(async () => {
      live.onmessage?.({
        serverContent: { modelTurn: { parts: [{ inlineData: { data: 'AAAA', mimeType: 'audio/pcm;rate=24000' } }] } },
      });
      live.onmessage?.({ serverContent: { turnComplete: true } });
      await Promise.resolve();
    });

    act(() => live.pcm?.(silentChunk()));
    await act(async () => {
      live.onmessage?.({ serverContent: { inputTranscription: { text: 'dodaj jeszcze lemoniadę' } } });
      await Promise.resolve();
    });
    await emitToolCall('add_item_to_cart');

    const textTurnId = sent && 'turnId' in sent ? sent.turnId : undefined;
    const [, spokenCall] = live.relayCalls;
    expect(spokenCall.transcript).toBe('dodaj jeszcze lemoniadę');
    expect(spokenCall.turnId).toMatch(/^turn_/);
    expect(spokenCall.turnId).not.toBe(textTurnId);
  });
});

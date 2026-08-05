/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveVoiceSession } from './useLiveVoiceSession';

const providerState = vi.hoisted(() => ({
  geminiActive: true,
  openaiActive: false,
  onGeminiFailure: null as ((failure: Record<string, string>) => void) | null,
  geminiSendText: vi.fn(),
  openaiSendText: vi.fn(),
  startOpenAI: vi.fn(),
}));

vi.mock('./useGeminiLiveSession', () => ({
  useGeminiLiveSession: (options: { onTerminalFailure?: (failure: Record<string, string>) => void }) => {
    providerState.onGeminiFailure = options.onTerminalFailure || null;
    return {
      start: vi.fn().mockResolvedValue(true),
      stop: vi.fn(),
      sendText: providerState.geminiSendText,
      isActive: providerState.geminiActive,
      error: null,
      reconnectHalted: false,
    };
  },
}));

vi.mock('./useOpenAIRealtimeSession', () => ({
  useOpenAIRealtimeSession: () => ({
    start: providerState.startOpenAI,
    stop: vi.fn(),
    sendText: providerState.openaiSendText,
    isActive: providerState.openaiActive,
    error: null,
  }),
}));

describe('useLiveVoiceSession text routing', () => {
  beforeEach(() => {
    providerState.geminiActive = true;
    providerState.openaiActive = false;
    providerState.onGeminiFailure = null;
    providerState.geminiSendText.mockReset().mockResolvedValue({
      accepted: true,
      provider: 'gemini',
      turnId: 'turn-gemini',
    });
    providerState.openaiSendText.mockReset().mockResolvedValue({
      accepted: true,
      provider: 'openai',
      turnId: 'turn-openai',
    });
    providerState.startOpenAI.mockReset().mockImplementation(async () => {
      providerState.openaiActive = true;
      return true;
    });
  });

  it('sends a typed turn only to Gemini while Gemini owns Live', async () => {
    const { result } = renderHook(() => useLiveVoiceSession({
      wsRef: { current: null },
      enabled: true,
      sessionId: 'session-1',
    }));

    await act(async () => {
      await result.current.sendText('szybko fit');
    });

    expect(providerState.geminiSendText).toHaveBeenCalledOnce();
    expect(providerState.geminiSendText).toHaveBeenCalledWith('szybko fit');
    expect(providerState.openaiSendText).not.toHaveBeenCalled();
  });

  it('routes subsequent typed turns only to OpenAI after provider fallback', async () => {
    const { result } = renderHook(() => useLiveVoiceSession({
      wsRef: { current: null },
      enabled: true,
      sessionId: 'session-2',
    }));

    await act(async () => {
      await result.current.start();
    });

    providerState.geminiActive = false;
    act(() => {
      providerState.onGeminiFailure?.({
        kind: 'provider',
        provider: 'gemini',
        code: 'gemini_reconnect_halted',
      });
    });

    await waitFor(() => expect(result.current.provider).toBe('openai'));
    await act(async () => {
      await result.current.sendText('pokaż menu');
    });

    expect(providerState.openaiSendText).toHaveBeenCalledOnce();
    expect(providerState.openaiSendText).toHaveBeenCalledWith('pokaż menu');
    expect(providerState.geminiSendText).not.toHaveBeenCalled();
  });
});

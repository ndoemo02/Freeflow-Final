import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveUiSessionStore } from '../state/liveUiSession';
import {
  useGeminiLiveSession,
  type LiveProviderFailure,
  type UseGeminiLiveSessionOptions,
  type UseGeminiLiveSessionResult,
} from './useGeminiLiveSession';
import { useOpenAIRealtimeSession } from './useOpenAIRealtimeSession';

export type LiveVoiceProvider = 'gemini' | 'openai';

export interface UseLiveVoiceSessionResult extends UseGeminiLiveSessionResult {
  provider: LiveVoiceProvider;
}

export function useLiveVoiceSession(
  options: Omit<UseGeminiLiveSessionOptions, 'onTerminalFailure'>,
): UseLiveVoiceSessionResult {
  const [provider, setProvider] = useState<LiveVoiceProvider>('gemini');
  const [failure, setFailure] = useState<LiveProviderFailure | null>(null);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const requestedRef = useRef(false);
  const fallbackStartingRef = useRef(false);

  const onGeminiFailure = useCallback((nextFailure: LiveProviderFailure) => {
    if (nextFailure.kind === 'microphone') requestedRef.current = false;
    setFailure(nextFailure);
  }, []);
  const onOpenAIFailure = useCallback((nextFailure: LiveProviderFailure) => {
    setFailure(nextFailure);
    setFallbackError(nextFailure.code);
  }, []);

  const {
    start: startGemini,
    stop: stopGemini,
    isActive: geminiActive,
  } = useGeminiLiveSession({ ...options, onTerminalFailure: onGeminiFailure });
  const {
    start: startOpenAI,
    stop: stopOpenAI,
    isActive: openaiActive,
    error: openaiError,
  } = useOpenAIRealtimeSession({ ...options, onTerminalFailure: onOpenAIFailure });

  useEffect(() => {
    if (!requestedRef.current || failure?.provider !== 'gemini' || failure.kind !== 'provider') return;
    if (fallbackStartingRef.current || openaiActive) return;

    fallbackStartingRef.current = true;
    stopGemini();
    setProvider('openai');
    setFallbackError(null);
    useLiveUiSessionStore.getState().setProcessing('Gemini jest niedostępne. Łączę z OpenAI Live...');
    void startOpenAI().finally(() => {
      fallbackStartingRef.current = false;
    });
  }, [failure?.kind, failure?.provider, openaiActive, startOpenAI, stopGemini]);

  const start = useCallback(async () => {
    requestedRef.current = true;
    fallbackStartingRef.current = false;
    setProvider('gemini');
    setFailure(null);
    setFallbackError(null);
    stopOpenAI();
    const started = await startGemini();
    // A provider start failure can already be in bounded Gemini recovery. Keep
    // the Live request armed so the wrapper may switch to OpenAI. Microphone
    // failures synchronously clear requestedRef in onGeminiFailure.
    return started || requestedRef.current;
  }, [startGemini, stopOpenAI]);

  const stop = useCallback(() => {
    requestedRef.current = false;
    fallbackStartingRef.current = false;
    setFailure(null);
    setFallbackError(null);
    stopGemini();
    stopOpenAI();
    setProvider('gemini');
  }, [stopGemini, stopOpenAI]);

  const microphoneError = failure?.kind === 'microphone' ? failure.code : null;
  const effectiveError = microphoneError || fallbackError || (provider === 'openai' ? openaiError : null);

  return {
    start,
    stop,
    isActive: geminiActive || openaiActive,
    error: effectiveError,
    reconnectHalted: Boolean(fallbackError),
    provider,
  };
}

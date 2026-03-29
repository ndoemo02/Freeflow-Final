/**
 * useGeminiLiveSession
 *
 * Full-duplex voice session with Gemini Live.
 *
 * Data flow:
 *   Mic → PCM16 16kHz → sendRealtimeInput() → [Gemini Live]
 *   [Gemini Live] → onmessage:
 *     serverContent (audio) → AudioPlayer gapless playback
 *     toolCall → useGeminiFunctionRelay → WS backend → FunctionResponse → Gemini
 *     interrupted → AudioPlayer.stop()
 *
 * Contracts preserved:
 *   - useLiveEvents untouched (provides wsRef)
 *   - useGeminiFunctionRelay untouched (relay tool calls to backend WS)
 *   - Home.tsx untouched (wiring happens in TASK 2.3)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';
import {
  useGeminiFunctionRelay,
  type GeminiFunctionCall,
} from './useGeminiFunctionRelay';
import { startPCM16Stream } from '../lib/audioStream';
import { AudioPlayer } from '../lib/audioPlayback';
import { LIVE_FUNCTION_DECLARATIONS } from '../lib/liveToolDeclarations';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODEL = (import.meta.env.VITE_GEMINI_LIVE_MODEL as string | undefined)
  || 'gemini-3.1-flash-live-preview';
const MIC_MIME = 'audio/pcm;rate=16000';

const SYSTEM_INSTRUCTION = [
  'Jesteś Amber — asystentka głosowa do zamawiania jedzenia po polsku.',
  'Odpowiadaj krótko, naturalnie, po polsku.',
  'Używaj dostępnych narzędzi (function calling) do wyszukiwania restauracji,',
  'przeglądania menu i składania zamówień.',
  'Nigdy nie wymyślaj dań ani restauracji — zawsze używaj narzędzi.',
].join(' ');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseGeminiLiveSessionOptions {
  /** Ref to the live WebSocket connection managed by useLiveEvents. */
  wsRef: React.MutableRefObject<WebSocket | null>;
  /** Master toggle — when false, start() is a no-op. */
  enabled?: boolean;
}

export interface UseGeminiLiveSessionResult {
  /** Begin a Gemini Live voice session (mic + audio playback). */
  start: () => Promise<void>;
  /** End the session, release mic, stop playback. */
  stop: () => void;
  /** True while the session is open and streaming. */
  isActive: boolean;
  /** Latest error message, or null. Cleared on next start(). */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert ArrayBuffer to base64 string (for sendRealtimeInput). */
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGeminiLiveSession({
  wsRef,
  enabled = true,
}: UseGeminiLiveSessionOptions): UseGeminiLiveSessionResult {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const stopMicRef = useRef<(() => void) | null>(null);
  const playerRef = useRef(new AudioPlayer());
  const activeRef = useRef(false); // non-render guard for start()

  const { relay } = useGeminiFunctionRelay({ wsRef });

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      stopMicRef.current?.();
      sessionRef.current?.close();
      playerRef.current.close();
    };
  }, []);

  // ---- stop() ----
  const stop = useCallback(() => {
    stopMicRef.current?.();
    stopMicRef.current = null;

    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch { /* already closed */ }
      sessionRef.current = null;
    }

    playerRef.current.stop();
    activeRef.current = false;
    setIsActive(false);
    setError(null);
    console.log('[GeminiLive] stopped');
  }, []);

  // ---- start() ----
  const start = useCallback(async () => {
    if (!enabled) return;
    if (activeRef.current) return;

    const apiKey = import.meta.env.VITE_GEMINI_LIVE_API_KEY as string | undefined;
    if (!apiKey) {
      setError('VITE_GEMINI_LIVE_API_KEY not configured');
      return;
    }

    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const player = playerRef.current;

      // ------ Handle onmessage from Gemini ------
      const handleMessage = (msg: LiveServerMessage) => {
        // 1. Tool calls — relay to backend via WS
        if (msg.toolCall?.functionCalls?.length) {
          const calls = msg.toolCall.functionCalls;
          const session = sessionRef.current;
          if (!session) return;

          // Fire-and-forget: relay all calls, then send responses back
          Promise.all(
            calls.map(async (fc) => {
              const geminiCall: GeminiFunctionCall = {
                id: fc.id,
                name: fc.name ?? 'unknown',
                args: (fc.args as Record<string, unknown>) ?? {},
              };
              try {
                const result = await relay(geminiCall);
                return {
                  id: fc.id ?? '',
                  name: result.name,
                  response: result.response as Record<string, unknown>,
                };
              } catch (err) {
                return {
                  id: fc.id ?? '',
                  name: fc.name ?? 'unknown',
                  response: {
                    error: err instanceof Error ? err.message : 'relay_failed',
                  },
                };
              }
            }),
          ).then((responses) => {
            try {
              session.sendToolResponse({
                functionResponses: responses,
              });
            } catch (e) {
              console.error('[GeminiLive] sendToolResponse failed:', e);
            }
          });
          return;
        }

        // 2. Audio content — play back
        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            const blob = (part as { inlineData?: { data?: string; mimeType?: string } })
              .inlineData;
            if (blob?.data && blob.mimeType?.startsWith('audio/')) {
              player.enqueueBase64(blob.data);
            }
          }
        }

        // 3. Interrupted — flush playback
        if (msg.serverContent?.interrupted) {
          player.stop();
        }

        // 4. Tool call cancellation — nothing to undo client-side,
        //    backend handles idempotency via ICM.
      };

      // Track if server closes session before mic starts (race condition guard).
      let closedBeforeMic = false;

      // ------ Connect to Gemini Live ------
      const session = await ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Aoede' },
            },
          },
          tools: [{ functionDeclarations: LIVE_FUNCTION_DECLARATIONS }],
        },
        callbacks: {
          onopen: () => {
            console.log('[GeminiLive] connected');
          },
          onmessage: handleMessage,
          onerror: (e: ErrorEvent) => {
            console.error('[GeminiLive] error:', e);
            setError(e.message || 'gemini_live_error');
            closedBeforeMic = true;
            stop();
          },
          onclose: () => {
            console.log('[GeminiLive] closed by server');
            closedBeforeMic = true;
            // Stop mic immediately if it was already started.
            stopMicRef.current?.();
            stopMicRef.current = null;
            if (activeRef.current) stop();
          },
        },
      });

      sessionRef.current = session;

      // ------ Start microphone streaming ------
      const stopMic = await startPCM16Stream((pcm16: ArrayBuffer) => {
        if (!sessionRef.current || !activeRef.current) return;
        try {
          sessionRef.current.sendRealtimeInput({
            audio: {
              data: arrayBufferToBase64(pcm16),
              mimeType: MIC_MIME,
            },
          });
        } catch {
          // Session may have closed between check and send — ignore.
        }
      });

      // If session closed while we were setting up the mic, abort immediately.
      if (closedBeforeMic) {
        stopMic();
        sessionRef.current = null;
        activeRef.current = false;
        setIsActive(false);
        console.warn('[GeminiLive] session closed before mic started — aborting');
        return;
      }

      stopMicRef.current = stopMic;
      activeRef.current = true;
      setIsActive(true);
      console.log('[GeminiLive] session active — mic streaming');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'failed_to_start';
      console.error('[GeminiLive] start failed:', err);
      setError(msg);
      activeRef.current = false;
      setIsActive(false);
    }
  }, [enabled, relay, stop]);

  return { start, stop, isActive, error };
}

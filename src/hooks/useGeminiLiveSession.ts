import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';
import { startPCM16Stream } from '../lib/audioStream';
import { AudioPlayer } from '../lib/audioPlayback';
import { LIVE_FUNCTION_DECLARATIONS } from '../lib/liveToolDeclarations';
import {
  useGeminiFunctionRelay,
  type GeminiFunctionCall,
} from './useGeminiFunctionRelay';
import { useConversationStore } from '../store/useConversationStore';

// Fix #3: hardcoded safe default — no silent model drift
const MODEL =
  (import.meta.env.VITE_GEMINI_LIVE_MODEL as string | undefined) ||
  'gemini-2.5-flash-native-audio-preview-12-2025';

const MIC_MIME = 'audio/pcm;rate=16000';
const RECONNECT_DELAYS_MS = [1000, 2000, 5000] as const;

// Fix #4: module-level cache for session state persistence across reconnects
export const liveSessionCache = new Map<string, {
  cart: any;
  currentRestaurant: any;
  uiMode?: 'list' | 'restaurant' | 'checkout';
  conversationPhase: string;
  suggestedRestaurants: any[] | null;
  menuItems: any[] | null;
}>();

const SYSTEM_INSTRUCTION = [
  'Jestes Amber - glosowa asystentka do zamawiania jedzenia w aplikacji FreeFlow.',
  'Masz dostep do danych restauracji i menu przez function calling.',
  'Uzywaj narzedzi do odpowiedzi o restauracje, menu i zamowienia.',
  'Nie mow, ze nie masz dostepu do danych - korzystaj z narzedzi.',
  'Odpowiadaj po polsku, krotko i naturalnie.',
].join(' ');

export interface UseGeminiLiveSessionOptions {
  wsRef: React.MutableRefObject<WebSocket | null>;
  enabled?: boolean;
  sessionId?: string;
}

export interface UseGeminiLiveSessionResult {
  start: () => Promise<void>;
  stop: () => void;
  isActive: boolean;
  error: string | null;
  reconnectHalted: boolean;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function compactToolResponse(
  toolName: string,
  response: Record<string, unknown>,
): Record<string, unknown> {
  const compact: Record<string, unknown> = {
    reply: (response.reply || response.text || '') as string,
    ok: response.ok !== false,
  };

  switch (toolName) {
    case 'find_nearby': {
      const list = (response.restaurants as any[] | undefined) ?? [];
      compact.restaurants = list.slice(0, 8).map((x: any) => ({
        id: x.id,
        name: x.name,
        cuisine: x.cuisine || x.category || null,
        rating: x.rating ?? null,
        distance: x.distance ?? null,
      }));
      break;
    }
    case 'show_menu':
    case 'select_restaurant': {
      const items = (response.menuItems as any[] | undefined) ?? (response.menu as any[] | undefined) ?? [];
      compact.menuItems = items.slice(0, 20).map((x: any) => ({
        id: x.id,
        name: x.name,
        price: x.price ?? null,
        category: x.category ?? null,
      }));
      break;
    }
    case 'confirm_add_to_cart':
    case 'get_cart_state': {
      const cart = (response.cart as any) ?? {};
      compact.cartCount = Array.isArray(cart.items) ? cart.items.length : 0;
      compact.cartTotal = cart.total ?? null;
      break;
    }
    default:
      break;
  }

  return compact;
}

export function useGeminiLiveSession({
  wsRef,
  enabled = true,
  sessionId: propSessionId,
}: UseGeminiLiveSessionOptions): UseGeminiLiveSessionResult {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectHalted, setReconnectHalted] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const stopMicRef = useRef<(() => void) | null>(null);
  const playerRef = useRef(new AudioPlayer());

  const activeRef = useRef(false);
  const startInFlightRef = useRef(false);
  const stopInFlightRef = useRef(false);
  const desiredActiveRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Marks that the close was triggered intentionally (user stop / cleanup) — suppress reconnect
  const intentionalCloseRef = useRef(false);
  // Fix #4: stable ref so start() closure always sees current sessionId
  const sessionIdRef = useRef(propSessionId);
  useEffect(() => { sessionIdRef.current = propSessionId; }, [propSessionId]);

  const { relay } = useGeminiFunctionRelay({ wsRef });

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const cleanupRuntime = useCallback((closeSession: boolean) => {
    stopMicRef.current?.();
    stopMicRef.current = null;

    if (closeSession && sessionRef.current) {
      try { sessionRef.current.close(); } catch { /* noop */ }
    }
    sessionRef.current = null;

    playerRef.current.stop();
    activeRef.current = false;
    setIsActive(false);
  }, []);

  const stop = useCallback(() => {
    if (stopInFlightRef.current) return;
    stopInFlightRef.current = true;
    try {
      intentionalCloseRef.current = true;   // suppress reconnect in onclose
      desiredActiveRef.current = false;
      reconnectAttemptRef.current = 0;
      clearReconnectTimer();
      setReconnectHalted(false);
      cleanupRuntime(true);
      setError(null);
      console.log(`[LIVE] STOP sessionId=${sessionIdRef.current ?? 'unknown'} code=user_stop`);
    } finally {
      stopInFlightRef.current = false;
      startInFlightRef.current = false;
    }
  }, [cleanupRuntime, clearReconnectTimer]);

  const start = useCallback(async () => {
    if (!enabled) return;

    // Fix #2: singleton guard — check sessionRef too
    if (sessionRef.current || activeRef.current || startInFlightRef.current) {
      console.log('[LIVE] session already active – skip start');
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_LIVE_API_KEY as string | undefined;
    if (!apiKey) {
      setError('VITE_GEMINI_LIVE_API_KEY not configured');
      return;
    }

    // Fix #3: throw on missing model — no silent fallback to wrong model
    if (!MODEL) {
      setError('VITE_GEMINI_LIVE_MODEL not configured');
      return;
    }

    const sid = sessionIdRef.current ?? 'unknown';
    desiredActiveRef.current = true;
    setError(null);
    setReconnectHalted(false);
    startInFlightRef.current = true;
    console.log(`[LIVE_INIT_CALLSITE] useGeminiLiveSession start requested — sessionId=${sid}`);
    console.log(`[LIVE] START sessionId=${sid} model=${MODEL}`);
    console.log(`[LIVE FRONT MODEL] ${MODEL}`);

    const scheduleReconnect = () => {
      if (!desiredActiveRef.current || stopInFlightRef.current) return;
      if (reconnectTimerRef.current) return;

      const nextAttempt = reconnectAttemptRef.current + 1;
      if (nextAttempt > RECONNECT_DELAYS_MS.length) {
        desiredActiveRef.current = false;
        setReconnectHalted(true);
        setError('Live reconnect halted');
        console.warn('[LIVE] RECONNECT HALTED');
        return;
      }

      reconnectAttemptRef.current = nextAttempt;
      const delay = RECONNECT_DELAYS_MS[nextAttempt - 1];
      console.warn(`[LIVE] RECONNECT attempt #${nextAttempt}`);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        void start();
      }, delay);
    };

    try {
      cleanupRuntime(true);
      const ai = new GoogleGenAI({ apiKey });
      const player = playerRef.current;

      let frameCount = 0;
      const stopMic = await startPCM16Stream((pcm16: ArrayBuffer) => {
        if (!sessionRef.current || !activeRef.current) return;
        frameCount += 1;
        if (frameCount <= 3) {
          console.log(`[GeminiLive] frame#${frameCount} bytes=${pcm16.byteLength}`);
        }

        try {
          sessionRef.current.sendRealtimeInput({
            audio: {
              data: arrayBufferToBase64(pcm16),
              mimeType: MIC_MIME,
            },
          });
        } catch {
          // noop
        }
      });
      stopMicRef.current = stopMic;

      const handleMessage = (msg: LiveServerMessage) => {
        if (msg.toolCall?.functionCalls?.length) {
          const calls = msg.toolCall.functionCalls;
          const session = sessionRef.current;
          if (!session) return;

          Promise.all(
            calls.map(async (fc) => {
              const geminiCall: GeminiFunctionCall = {
                id: fc.id,
                name: fc.name ?? 'unknown',
                args: (fc.args ?? {}) as Record<string, unknown>,
              };
              try {
                const result = await relay(geminiCall);
                return {
                  id: fc.id ?? '',
                  name: result.name,
                  response: compactToolResponse(
                    result.name,
                    (result.response ?? {}) as Record<string, unknown>,
                  ),
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
              session.sendToolResponse({ functionResponses: responses });
            } catch {
              // noop
            }
          });
          return;
        }

        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            const blob = (part as { inlineData?: { data?: string; mimeType?: string } }).inlineData;
            if (blob?.data && blob.mimeType?.startsWith('audio/')) {
              player.enqueueBase64(blob.data);
            }
          }
        }

        if (msg.serverContent?.interrupted) {
          player.stop();
        }
      };

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
            reconnectAttemptRef.current = 0;
            clearReconnectTimer();
            setReconnectHalted(false);
            // Fix #4: restore cached state on reconnect
            const cached = liveSessionCache.get(sid);
            if (cached) {
              useConversationStore.setState(cached);
              console.log(`[STATE] restored cart items=${cached.cart?.items?.length ?? 0}`);
            }
          },
          onmessage: handleMessage,
          onerror: (e: ErrorEvent) => {
            setError(e.message || 'gemini_live_error');
            cleanupRuntime(false);
            scheduleReconnect();
          },
          onclose: () => {
            // Save state snapshot before cleanup
            const s = useConversationStore.getState();
            liveSessionCache.set(sid, {
              cart: s.cart,
              currentRestaurant: s.currentRestaurant,
              uiMode: s.uiMode,
              conversationPhase: s.conversationPhase,
              suggestedRestaurants: s.suggestedRestaurants,
              menuItems: s.menuItems,
            });
            const wasIntentional = intentionalCloseRef.current;
            intentionalCloseRef.current = false;
            console.log(`[LIVE] STOP sessionId=${sid} intentional=${wasIntentional}`);
            cleanupRuntime(false);
            // Do NOT reconnect on intentional close (user stop / cleanup / 1000 / 1001 equivalent)
            if (wasIntentional || !desiredActiveRef.current) {
              console.log('[LIVE] RECONNECT HALTED — intentional close');
              return;
            }
            scheduleReconnect();
          },
        },
      });

      sessionRef.current = session;
      activeRef.current = true;
      setIsActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'failed_to_start';
      setError(msg);
      cleanupRuntime(false);
      scheduleReconnect();
    } finally {
      startInFlightRef.current = false;
    }
  }, [enabled, relay, cleanupRuntime, clearReconnectTimer]);

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;   // unmount = intentional, suppress reconnect
      desiredActiveRef.current = false;
      clearReconnectTimer();
      cleanupRuntime(true);
      playerRef.current.close();
    };
  }, [cleanupRuntime, clearReconnectTimer]);

  return { start, stop, isActive, error, reconnectHalted };
}

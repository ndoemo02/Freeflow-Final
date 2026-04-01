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

const MODEL =
  (import.meta.env.VITE_GEMINI_LIVE_MODEL as string | undefined) ||
  'gemini-2.5-flash-native-audio-preview-12-2025';
const MIC_MIME = 'audio/pcm;rate=16000';

const SYSTEM_INSTRUCTION = [
  'Jesteś Amber — głosowa asystentka do zamawiania jedzenia w aplikacji FreeFlow.',

  // Tool mandate — must come before any behavioral rules
  'KRYTYCZNE: Masz PEŁNY dostęp do bazy danych restauracji i menu poprzez function calling.',
  'ZAWSZE używaj narzędzi do odpowiedzi na pytania o restauracje, menu i zamówienia.',
  'NIGDY nie mów że nie masz dostępu do bazy danych, internetu ani aktualnych informacji',
  '— masz je poprzez narzędzia find_nearby, show_menu, select_restaurant, add_item_to_cart.',

  // Explicit trigger rules — Gemini must not skip tools for these cases
  'Gdy użytkownik pyta o restauracje, jedzenie lub "gdzie zjeść" — NATYCHMIAST wywołaj find_nearby.',
  'Gdy użytkownik chce zobaczyć menu — wywołaj show_menu.',
  'Gdy użytkownik wybiera restaurację — wywołaj select_restaurant.',
  'Gdy użytkownik chce zamówić danie — wywołaj add_item_to_cart.',
  'Po otrzymaniu wyniku narzędzia — odczytaj dane i odpowiedz na ich podstawie.',

  // Prohibited fallback phrases
  'ZAKAZANE frazy: "nie mam dostępu do bazy", "nie znam aktualnych restauracji",',
  '"nie mogę sprawdzić menu", "nie mam dostępu do internetu".',
  'Jeśli narzędzie zwróciło dane — użyj tych danych w odpowiedzi.',

  // Style
  'Nie wymyślaj restauracji ani dań — korzystaj TYLKO z wyników narzędzi.',
  'Odpowiadaj po polsku, krótko i naturalnie.',
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

/**
 * Strip BrainV2 internals (trace, full session context, actions, events)
 * from the FunctionResponse payload sent back to Gemini.
 *
 * Gemini Live only needs speech-relevant data to formulate its spoken output.
 * The full response is handled separately by useLiveEvents → Zustand store.
 */
function compactToolResponse(
  toolName: string,
  r: Record<string, unknown>,
): Record<string, unknown> {
  // `reply` is Gemini's primary speech cue — always include it.
  const compact: Record<string, unknown> = {
    reply: (r.reply || r.text || '') as string,
    ok: true,
  };

  switch (toolName) {
    case 'find_nearby': {
      const list = (r.restaurants as any[] | undefined) ?? [];
      compact.restaurants = list.slice(0, 8).map((x: any) => ({
        id: x.id,
        name: x.name,
        cuisine: x.cuisine || x.category || null,
        rating: x.rating ?? null,
        distance: x.distance ?? null,
      }));
      break;
    }
    case 'select_restaurant':
    case 'show_menu': {
      const items = (r.menuItems as any[] | undefined) ?? (r.menu as any[] | undefined) ?? [];
      compact.menuItems = items.slice(0, 20).map((x: any) => ({
        id: x.id,
        name: x.name,
        price: x.price ?? null,
        category: x.category ?? null,
      }));
      const ctx = (r.context as any) ?? {};
      const restaurant = r.currentRestaurant ?? ctx.currentRestaurant;
      if (restaurant) {
        compact.restaurant = {
          id: (restaurant as any).id,
          name: (restaurant as any).name,
        };
      }
      break;
    }
    case 'add_item_to_cart':
    case 'add_items_to_cart': {
      const ctx = (r.context as any) ?? {};
      if (ctx.pendingOrder) {
        compact.pendingDish = ctx.pendingOrder.dish;
        compact.pendingQuantity = ctx.pendingOrder.quantity ?? 1;
      }
      break;
    }
    case 'confirm_add_to_cart': {
      const ctx = (r.context as any) ?? {};
      const cart = ctx.cart ?? r.cart;
      if (cart) {
        compact.cartCount = Array.isArray((cart as any).items) ? (cart as any).items.length : 0;
        compact.cartTotal = (cart as any).total ?? null;
      }
      break;
    }
    case 'get_cart_state': {
      const cart = (r.cart as any) ?? {};
      compact.cartCount = Array.isArray(cart.items) ? cart.items.length : 0;
      compact.cartTotal = cart.total ?? null;
      break;
    }
    case 'open_checkout':
    case 'confirm_order':
    case 'cancel_order':
    case 'show_more_options':
    default:
      break;
  }

  return compact;
}

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
    // ╔══════════════════════════════════════════════════════════╗
    // ║  LIVE BOOT A — start() entered                          ║
    // ╚══════════════════════════════════════════════════════════╝
    console.log('LIVE BOOT A — start() entered, enabled:', enabled, 'activeRef:', activeRef.current);

    if (!enabled) {
      console.log('LIVE BOOT A — ABORT: enabled=false');
      return;
    }
    if (activeRef.current) {
      console.log('LIVE BOOT A — ABORT: already active');
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_LIVE_API_KEY as string | undefined;
    // ╔══════════════════════════════════════════════════════════╗
    // ║  LIVE BOOT B — env vars checked                         ║
    // ╚══════════════════════════════════════════════════════════╝
    console.log('LIVE BOOT B — apiKey present:', !!apiKey, '  model:', MODEL);

    if (!apiKey) {
      setError('VITE_GEMINI_LIVE_API_KEY not configured');
      return;
    }

    setError(null);

    try {
      // ══════════════════════════════════════════════════════════
      // STEP 1: Acquire microphone BEFORE connecting to Gemini.
      //
      // Gemini Live closes the session after ~2s if no audio arrives.
      // Old order: connect → wait for getUserMedia → Gemini times out.
      // New order: getUserMedia → AudioContext ready → connect → audio
      //            flows immediately after WS opens.
      // ══════════════════════════════════════════════════════════
      console.log('MIC REQUEST START — calling getUserMedia / startPCM16Stream');
      console.log('AUDIO CONFIG — mimeType:', MIC_MIME, ' chunkFrames: 4096  bytesPerFrame: 2  chunkBytes: 8192  chunkMs: 256');

      let frameCount = 0;
      const stopMic = await startPCM16Stream((pcm16: ArrayBuffer) => {
        // Guard: session and activeRef are set AFTER ai.live.connect() resolves.
        // Chunks produced before that point are silently dropped here.
        if (!sessionRef.current || !activeRef.current) return;
        frameCount++;
        if (frameCount <= 3) {
          console.log(`AUDIO FRAME #${frameCount} — bytes: ${pcm16.byteLength}  mimeType: ${MIC_MIME}`);
        }
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

      stopMicRef.current = stopMic;
      console.log('MIC READY — stream active, AudioContext running');

      const ai = new GoogleGenAI({ apiKey });
      const player = playerRef.current;

      // ------ Handle onmessage from Gemini ------
      const handleMessage = (msg: LiveServerMessage) => {
        // ╔══════════════════════════════════════════════════════╗
        // ║  LIVE MESSAGE RECEIVED — unconditional               ║
        // ╚══════════════════════════════════════════════════════╝
        const msgKeys = Object.keys(msg);
        const hasTools = !!(msg.toolCall?.functionCalls?.length);
        const hasAudio = !!(msg.serverContent?.modelTurn?.parts?.length);
        const isInterrupt = !!(msg.serverContent?.interrupted);
        console.log('LIVE MESSAGE RECEIVED  keys:', msgKeys.join(','), ' tools:', hasTools, ' audio:', hasAudio, ' interrupt:', isInterrupt);
        // 1. Tool calls — relay to backend via WS
        if (msg.toolCall?.functionCalls?.length) {
          const calls = msg.toolCall.functionCalls;
          const session = sessionRef.current;
          if (!session) return;

          // ── DIAG-1: Gemini decided to call tools ──────────────────────
          console.group(`[LiveDiag] 🔧 Gemini called ${calls.length} tool(s)`);
          calls.forEach((fc) => {
            console.log(`  tool: ${fc.name ?? 'unknown'}  id: ${fc.id ?? '?'}`);
            console.log('  args:', fc.args ?? {});
          });
          console.groupEnd();
          // ──────────────────────────────────────────────────────────────

          // Fire-and-forget: relay all calls, then send responses back
          Promise.all(
            calls.map(async (fc) => {
              const geminiCall: GeminiFunctionCall = {
                id: fc.id,
                name: fc.name ?? 'unknown',
                args: (fc.args as Record<string, unknown>) ?? {},
              };
              try {
                // ── DIAG-2: Sending to ToolRouter via WS ──────────────
                console.log(`[LiveDiag] 📤 relay → WS: ${geminiCall.name}`, geminiCall.args);
                // ──────────────────────────────────────────────────────

                const result = await relay(geminiCall);

                // ── DIAG-3: ToolRouter returned ────────────────────────
                const rawReply = (result.response as any)?.reply ?? (result.response as any)?.text ?? '(empty)';
                const rawRestaurants = (result.response as any)?.restaurants;
                const rawMenuItems = (result.response as any)?.menuItems;
                console.group(`[LiveDiag] 📥 ToolRouter response: ${geminiCall.name}`);
                console.log('  reply:', rawReply);
                if (rawRestaurants) console.log('  restaurants:', rawRestaurants?.length, rawRestaurants?.slice(0,2));
                if (rawMenuItems) console.log('  menuItems:', rawMenuItems?.length, rawMenuItems?.slice(0,2));
                console.log('  ok:', (result.response as any)?.ok);
                console.groupEnd();
                // ──────────────────────────────────────────────────────

                // Compact the BrainV2 response before returning to Gemini.
                // The full response (trace, session context, actions) is handled
                // by useLiveEvents → Zustand. Gemini only needs speech-cue data.
                const compacted = compactToolResponse(
                  geminiCall.name,
                  (result.response as Record<string, unknown>) ?? {},
                );

                // ── DIAG-4: What Gemini actually receives ──────────────
                console.log(`[LiveDiag] 📨 sendToolResponse → Gemini (${geminiCall.name}):`, compacted);
                // ──────────────────────────────────────────────────────

                return {
                  id: fc.id ?? '',
                  name: result.name,
                  response: compacted,
                };
              } catch (err) {
                // ── DIAG-ERR: Relay failed ─────────────────────────────
                console.error(`[LiveDiag] ❌ relay FAILED for ${geminiCall.name}:`, err);
                // ──────────────────────────────────────────────────────
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
              console.log(`[LiveDiag] ✅ sendToolResponse sent (${responses.length} response(s))`);
            } catch (e) {
              console.error('[GeminiLive] sendToolResponse failed:', e);
            }
          });
          return;
        }

        // ── DIAG-0: Non-tool message from Gemini ──────────────────────
        if (!msg.serverContent?.modelTurn?.parts && !msg.serverContent?.interrupted) {
          const keys = Object.keys(msg).join(', ');
          if (keys) console.log('[LiveDiag] 🔍 Gemini msg (no tool call, no audio):', keys);
        }
        // ──────────────────────────────────────────────────────────────

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

      // ══════════════════════════════════════════════════════════
      // STEP 2: Connect to Gemini Live — mic is already running.
      // Audio chunks will flow immediately when sessionRef is set.
      // ══════════════════════════════════════════════════════════
      console.log('TOOLS REGISTERED —', LIVE_FUNCTION_DECLARATIONS.length, 'tools:', LIVE_FUNCTION_DECLARATIONS.map((t) => t.name).join(', '));
      console.log('GEMINI SESSION CREATE — calling ai.live.connect, model:', MODEL);

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
            console.log('GEMINI SESSION OPEN — WS open, tools registered, audio flowing');
          },
          onmessage: handleMessage,
          onerror: (e: ErrorEvent) => {
            console.error('[GeminiLive] error:', e);
            setError(e.message || 'gemini_live_error');
            stop();
          },
          onclose: (e: CloseEvent) => {
            console.log(
              '[GeminiLive] CLOSED — code:', e.code,
              ' reason:', e.reason || '(none)',
              ' wasClean:', e.wasClean,
            );
            stopMicRef.current?.();
            stopMicRef.current = null;
            if (activeRef.current) stop();
          },
        },
      });

      // Set session ref — audio chunks will now start flowing to Gemini
      sessionRef.current = session;
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

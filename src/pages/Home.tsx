/**
 * Home.tsx - Thin Orchestration Layer
 * 
 * Responsibilities:
 * 1. Collect text/voice input (via VoiceCommandCenterV2)
 * 2. Call POST /api/brain/v2 (via useBrainSession)
 * 3. Pass response to UI router (BrainUIPanelRouter)
 * 4. Trigger TTS (via useTTS)
 * 
 * STRICTLY NO BUSINESS LOGIC OR INTENT INSPECTION HERE.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useConversationStore } from "../store/useConversationStore";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { useUIPanels } from "../hooks/useUIPanels";
import { useTTS } from "../hooks/useTTS";
import { useActionDispatcher } from "../hooks/useActionDispatcher";
import { useLiveEvents } from "../hooks/useLiveEvents";
import { useGeminiLiveSession } from "../hooks/useGeminiLiveSession";
import { deriveUIHints } from "../lib/brainUiUtils";
import UIPanelRouter from "../components/UIPanelRouter";
import VoiceDock from "../components/VoiceDock";
import Cart from "../components/Cart";
import MenuDrawer from "../ui/MenuDrawer";
import Switch from "../components/Switch";
import { StateIsland, ExpectedContextPrompts, SuggestedRestaurantsCarousel } from "../components/ConversationUI";
import MenuIsland from "../components/MenuIsland";
import { useUI } from "../state/ui";
import { useCart } from "../state/CartContext";
import ErrorFallback from "../components/ErrorFallback";
import "./Home.css";
import { usePostOrderReset } from '../hooks/usePostOrderReset';

// --- UI View Mode Types ---
type ViewMode = 'tiles' | 'bar';

export default function Home() {
  // --- Hooks ---
  // Using lastFullResponse to access strict data contract including 'tts' object
  // startNewConversation: Manual conversation reset (optional UI feature)
  const { sessionId, sendMessage, isThinking, lastFullResponse, lastResponse, resetSession: startNewConversation, error } = useConversationStore();
  const uiMode = useConversationStore(state => state.uiMode);
  const currentRestaurant = useConversationStore(state => state.currentRestaurant);
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useVoiceInput();
  const { uiHints, setHints } = useUIPanels();
  const { play, stop, isSpeaking } = useTTS();
  const { dispatch } = useActionDispatcher();
  const liveModeEnabled = String(import.meta.env.VITE_LIVE_MODE || '').toLowerCase() === 'true';
  const { liveConnected, socketRef } = useLiveEvents({ enabled: liveModeEnabled, sessionId, dispatch });
  const {
    isActive: liveSessionActive,
    start: startLiveSession,
    stop: stopLiveSession,
  } = useGeminiLiveSession({
    wsRef: socketRef,
    enabled: liveModeEnabled,
    sessionId,
  });
  const lastProcessedResponseRef = useRef<any>(null);

  // --- UI View State (tiles vs voicebar) ---
  const [viewMode, setViewMode] = useState<ViewMode>('bar'); // domyÄąâ€şlnie voice bar

  // Ä‘Ĺşâ€ťâ€ž Auto-reset UI po potwierdzeniu zamÄ‚Ĺ‚wienia
  usePostOrderReset();

  // --- Amber Status (green = free, red = processing) ---
  // Derived from isThinking state: free when idle, processing when thinking
  const amberStatus: 'free' | 'processing' = isThinking ? 'processing' : 'free';

  // --- Legacy UI state for drawers (Presentation Only) ---
  const openDrawer = useUI((s) => s.openDrawer);
  const setVoiceActive = useUI((s) => s.setVoiceActive);
  const { setIsOpen, itemCount } = useCart() as any;
  const cartItemsCount = Number(itemCount || 0);

  // --- Effect: Handle Brain Response ---
  // When lastFullResponse updates, we derive UI hints and trigger TTS
  useEffect(() => {
    if (lastFullResponse) {
      // Avoid re-running side effects (TTS/actions) for the same response object.
      // This prevents SHOW_CART from reopening the modal on unrelated re-renders.
      if (lastProcessedResponseRef.current === lastFullResponse) {
        return;
      }
      lastProcessedResponseRef.current = lastFullResponse;

      // 1. Update UI Panels based on response
      const hints = deriveUIHints(lastFullResponse);
      setHints(hints);

      // 2. Trigger TTS if text available (Once per response)
      // Priority: Backend audio (Gemini/Vertex) > WebSpeech fallback
      // audioContent from backend is base64 encoded audio
      const audioContent = lastFullResponse.audioContent;
      const ttsText = lastFullResponse.tts?.text || lastFullResponse.tts_text || lastFullResponse.text;

      if (ttsText && !liveSessionActive) {
        // play(text, audioContent) - hook handles priority
        // Guard: when Live owns the session, Gemini handles audio natively
        play(ttsText, audioContent);
      }

      // 3. Dispatch backend actions (cart sync, show cart, etc.)
      // During Live mode useLiveEvents already dispatched these actions from the same
      // tool_result message â€” skip here to prevent double SHOW_CART / SYNC_CART.
      if (!liveSessionActive && (lastFullResponse.actions || lastFullResponse.meta?.cart || lastFullResponse.cart || lastFullResponse.events?.length)) {
        const responseKey = lastFullResponse.turn_id || lastFullResponse.timestamp || lastFullResponse.session_id;
        const fakeMeta = {
          ...lastFullResponse.meta,
          cart: lastFullResponse.cart || lastFullResponse.meta?.cart,
          menuBehavior: lastFullResponse.meta?.menuBehavior,
        };
        dispatch(lastFullResponse.actions, fakeMeta, responseKey, lastFullResponse.events);
      }
    }
  }, [lastFullResponse, liveSessionActive, setHints, play, dispatch]);

  // --- Handlers ---

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      stop(); // Stop any current TTS
      resetTranscript();
      startListening();
    }
  }, [isListening, stopListening, startListening, stop, resetTranscript]);

  const handleLogoPull = useCallback(() => {
    if (isListening) return;
    stop();
    resetTranscript();
    startListening();
  }, [isListening, startListening, stop, resetTranscript]);

  const handleTextSubmit = useCallback(async (text: string) => {
    const sanitized = text.trim();
    if (!sanitized) return;

    // Block non-user content: raw HTML, JSON blobs, JS error prefixes
    if (/^[<{[]/.test(sanitized) || /^(Error|TypeError|SyntaxError|Failed|Uncaught)\b/.test(sanitized)) {
      console.warn('[IntakeGate] Blocked non-user input:', sanitized.slice(0, 80));
      return;
    }

    // When Gemini Live is active it owns the session.
    // BrainV2 must only be reached via ToolRouter (Gemini tool calls), never directly.
    if (liveSessionActive) {
      return;
    }

    stop(); // Stop TTS before sending
    await sendMessage(sanitized);
  }, [liveSessionActive, sendMessage, stop]);

  // Handle voice transcript finalization
  useEffect(() => {
    if (!isListening && transcript) {
      handleTextSubmit(transcript);
    }
  }, [isListening, transcript, handleTextSubmit]);

  // Sync isListening â†’ global voiceActive (consumed by BottomTabBar FAB)
  useEffect(() => {
    setVoiceActive(isListening);
  }, [isListening, setVoiceActive]);

  // Handle voice trigger from BottomTabBar FAB
  useEffect(() => {
    const handler = () => handleMicClick();
    window.addEventListener('freeflow:voice:trigger', handler);
    return () => window.removeEventListener('freeflow:voice:trigger', handler);
  }, [handleMicClick]);

  // Handle restaurant selection from carousel "Wybierz" button
  useEffect(() => {
    const handler = (e: Event) => {
      const r = (e as CustomEvent).detail;
      if (r?.name) {
        handleTextSubmit(`Wybieram ${r.name}`);
      }
    };
    window.addEventListener('freeflow:selectRestaurant', handler);
    return () => window.removeEventListener('freeflow:selectRestaurant', handler);
  }, [handleTextSubmit]);

  useEffect(() => {
    if (!liveModeEnabled) return;
    console.log(`[LiveEvents] mode=on connected=${liveConnected}`);
  }, [liveModeEnabled, liveConnected]);
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const logLayout = () => {
      const voiceDock = document.querySelector('[data-ui-role="voice-dock-bar"]') as HTMLElement | null;
      const statusDot = document.querySelector('[data-ui-role="status-dot"]') as HTMLElement | null;
      const orb = document.querySelector('[data-ui-role="action-orb"]') as HTMLElement | null;

      const voiceDockCenterY = voiceDock
        ? Math.round(voiceDock.getBoundingClientRect().top + (voiceDock.getBoundingClientRect().height / 2))
        : 'null';
      const statusDotCenterY = statusDot
        ? Math.round(statusDot.getBoundingClientRect().top + (statusDot.getBoundingClientRect().height / 2))
        : 'null';

      let orbPosition: string;
      if (orb) {
        const rect = orb.getBoundingClientRect();
        orbPosition = JSON.stringify({
          x: Math.round(rect.left + (rect.width / 2)),
          y: Math.round(rect.top + (rect.height / 2)),
        });
      } else {
        orbPosition = 'null';
      }

      console.log(`[UI_LAYOUT] voiceDockCenterY=${voiceDockCenterY}`);
      console.log(`[UI_LAYOUT] statusDotCenterY=${statusDotCenterY}`);
      console.log(`[UI_LAYOUT] orbPosition=${orbPosition}`);
    };

    const onResize = () => window.requestAnimationFrame(logLayout);
    const rafId = window.requestAnimationFrame(logLayout);
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, [viewMode, uiMode, isListening, isThinking, isSpeaking, cartItemsCount]);

  // Handle menu item order from MenuIsland "Kliknij pozycjĂ„â„˘"
  useEffect(() => {
    const handler = (e: Event) => {
      const { item } = (e as CustomEvent).detail;
      if (item?.name) {
        handleTextSubmit(`ChcĂ„â„˘ zamÄ‚Ĺ‚wiĂ„â€ˇ ${item.name}`);
      }
    };
    window.addEventListener('freeflow:orderItem', handler);
    return () => window.removeEventListener('freeflow:orderItem', handler);
  }, [handleTextSubmit]);

  // --- Render ---
  return (
    <div className="home-page freeflow relative min-h-screen overflow-hidden text-slate-100">

      {/* Background provided by App.tsx (RestaurantBackground) */}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 p-4 flex justify-between items-start z-50 pointer-events-none">
        <div className="flex flex-col gap-1 pointer-events-auto">
          <div className="flex items-center gap-2 pl-1 mt-1">
            <StateIsland />
            {liveModeEnabled && (
              <button
                onClick={liveSessionActive ? stopLiveSession : startLiveSession}
                data-live={liveSessionActive}
                aria-label={liveSessionActive ? 'WyĹ‚Ä…cz tryb Live' : 'WĹ‚Ä…cz tryb Live'}
                aria-pressed={liveSessionActive}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition ${
                  liveSessionActive
                    ? 'text-emerald-400 bg-emerald-400/10 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'text-white/50 bg-white/10 hover:bg-white/20'
                }`}
              >
                {liveSessionActive ? 'â—Ź LIVE ON' : 'â—‹ LIVE'}
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-4 pointer-events-auto">
          {cartItemsCount > 0 && uiMode !== 'checkout' && (
            <button
              onClick={() => setIsOpen(true)}
              className="relative p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
              aria-label={`OtwĂłrz koszyk (${cartItemsCount})`}
            >
              <i className="fas fa-shopping-cart text-white" />
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-[10px] leading-[18px] font-bold text-white text-center">
                {cartItemsCount}
              </span>
            </button>
          )}
          {/* Drawer remains the global navigation entry point */}
          <button onClick={openDrawer} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <i className="fas fa-bars text-white" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 pb-[calc(env(safe-area-inset-bottom)+96px)] w-full max-w-7xl mx-auto">

        {/* Brain UI Router - Renders "Configurable Islands" */}
        <div className="w-full mb-8">
          {error ? (
            <ErrorFallback message={error} onRetry={() => useConversationStore.setState({ error: null })} />
          ) : (
            <UIPanelRouter
              uiHints={uiHints}
              data={lastFullResponse || {}}
            />
          )}
        </div>

        {/* Logo/Brand Centerpiece: static voice trigger on the main screen */}
        <div className="hero-stack">
          <button
            type="button"
            onClick={handleLogoPull}
            className="logo-container"
            aria-label="Uruchom mikrofon"
          >
            <img
              src="/logo/freeflow-drop.png"
              alt="FreeFlow"
              className={`logo ${isListening ? "recording" : ""}`}
            />
          </button>
        </div>

      </main>

      {/* Switch (PaÄąâ€šĂ„â€¦k) - staÄąâ€ša pozycja po lewej */}
      <Switch
        onToggle={(checked) => setViewMode(checked ? 'bar' : 'tiles')}
        initial={viewMode === 'bar'}
        amberReady={amberStatus === 'free'}
      />

      {/* Tiles Panel - widoczne gdy viewMode === 'tiles' */}
      {viewMode === 'tiles' && (
        <div className={`tiles ${viewMode !== 'tiles' ? 'hidden' : ''}`}>
          <div className="tile" onClick={() => setViewMode('bar')}>
            <img src="/icons/food.png" alt="Food" />
          </div>
          <div className="tile" onClick={() => setViewMode('bar')}>
            <img src="/icons/car.png" alt="Taxi" />
          </div>
          <div className="tile" onClick={() => setViewMode('bar')}>
            <img src="/icons/hotel.png" alt="Hotel" />
          </div>
        </div>
      )}

      {/* UI MODE: LIST */}
      {viewMode === 'bar' && uiMode === 'list' && (
        <SuggestedRestaurantsCarousel />
      )}

      {/* UI MODE: RESTAURANT */}
      {viewMode === 'bar' && uiMode === 'restaurant' && (
        <>
          <MenuIsland />
        </>
      )}

      {/* UI MODE: CHECKOUT */}
      {viewMode === 'bar' && uiMode === 'checkout' && (
        <Cart />
      )}

      {/* Voice Command Center (Input) - widoczne gdy viewMode === 'bar' */}
      {viewMode === 'bar' && (
        <div className="fixed bottom-0 left-0 right-0 z-[70] px-4 pb-4 w-full max-w-7xl mx-auto flex flex-col items-center pointer-events-auto">
          <ExpectedContextPrompts />
          <VoiceDock
            recording={isListening}
            isProcessing={isThinking}
            isSpeaking={isSpeaking}
            interimText={transcript}
            finalText={transcript}
            amberResponse={lastResponse || lastFullResponse?.reply || ''}
            onMicClick={handleMicClick}
            onTextSubmit={handleTextSubmit}
            onClearResponse={() => {
              useConversationStore.setState({ lastResponse: '', lastFullResponse: null });
            }}
            visible={true}
            isPresenting={uiHints.panel !== 'none'}
            liveSession={{
              isActive: liveSessionActive,
              start: startLiveSession,
              stop: stopLiveSession,
            }}
          />
        </div>
      )}

    </div>
  );
}





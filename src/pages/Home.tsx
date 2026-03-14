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
import { deriveUIHints } from "../lib/brainUiUtils";
import UIPanelRouter from "../components/UIPanelRouter";
import VoiceCommandCenterV2 from "../components/VoiceCommandCenterV2";
import Cart from "../components/Cart";
import MenuDrawer from "../ui/MenuDrawer";
import Switch from "../components/Switch";
import { StateIsland, RestaurantCard, ExpectedContextPrompts, SuggestedRestaurantsCarousel } from "../components/ConversationUI";
import MenuIsland from "../components/MenuIsland";
import CartBadge from "../components/CartBadge";
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
  const phase = useConversationStore(state => state.conversationPhase);
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useVoiceInput();
  const { uiHints, setHints } = useUIPanels();
  const { play, stop, isSpeaking } = useTTS();
  const { dispatch } = useActionDispatcher();
  const lastProcessedResponseRef = useRef<any>(null);

  // --- UI View State (tiles vs voicebar) ---
  const [viewMode, setViewMode] = useState<ViewMode>('bar'); // domyślnie voice bar

  // 🔄 Auto-reset UI po potwierdzeniu zamówienia
  usePostOrderReset();

  // --- Amber Status (green = free, red = processing) ---
  // Derived from isThinking state: free when idle, processing when thinking
  const amberStatus: 'free' | 'processing' = isThinking ? 'processing' : 'free';

  // --- Legacy UI state for drawers (Presentation Only) ---
  const openDrawer = useUI((s) => s.openDrawer);
  const { setIsOpen } = useCart() as any;

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

      if (ttsText) {
        // play(text, audioContent) - hook handles priority
        play(ttsText, audioContent);
      }

      // 3. Dispatch backend actions (cart sync, show cart, etc.)
      // Keep sync enabled for confirm_order because response carries authoritative meta.cart.
      if (lastFullResponse.actions || lastFullResponse.meta?.cart || lastFullResponse.cart) {
        const responseKey = lastFullResponse.turn_id || lastFullResponse.timestamp || lastFullResponse.session_id;
        const fakeMeta = { ...lastFullResponse.meta, cart: lastFullResponse.cart || lastFullResponse.meta?.cart };
        dispatch(lastFullResponse.actions, fakeMeta, responseKey);
      }
    }
  }, [lastFullResponse, setHints, play, dispatch]);

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
    stop(); // Stop TTS
    await sendMessage(text);
  }, [sendMessage, stop]);

  // Handle voice transcript finalization
  useEffect(() => {
    if (!isListening && transcript) {
      handleTextSubmit(transcript);
    }
  }, [isListening, transcript, handleTextSubmit]);

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

  // Handle menu item order from MenuIsland "Kliknij pozycję"
  useEffect(() => {
    const handler = (e: Event) => {
      const { item } = (e as CustomEvent).detail;
      if (item?.name) {
        handleTextSubmit(`Chcę zamówić ${item.name}`);
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
          </div>
        </div>
        <div className="flex gap-4 pointer-events-auto">
          {/* Cart triggers now managed below or via the CartBadge directly */}
          <button onClick={openDrawer} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <i className="fas fa-bars text-white" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 pb-32 w-full max-w-7xl mx-auto">

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
              src="/logo/logo.png"
              alt="FreeFlow"
              className={`logo ${isListening ? "recording" : ""}`}
            />
          </button>
        </div>

      </main>

      {/* Switch (Pałąk) - stała pozycja po lewej */}
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

      {/* PHASE: IDLE */}
      {viewMode === 'bar' && phase === 'idle' && (
        <SuggestedRestaurantsCarousel />
      )}

      {/* PHASE: RESTAURANT_SELECTED || ORDERING */}
      {viewMode === 'bar' && (phase === 'restaurant_selected' || phase === 'ordering') && (
        <>
          <RestaurantCard />
          <MenuIsland />
          <div className="fixed top-4 right-20 z-50 pointer-events-auto">
            {/* 
              Renderujemy bezpośrednio badge. W tym setupie zakładamy, że CartBadge 
              obsługuje własne kliknięcie (on/off szuflady). 
            */}
            <CartBadge />
          </div>
        </>
      )}

      {/* PHASE: CHECKOUT */}
      {viewMode === 'bar' && phase === 'checkout' && (
        <Cart />
      )}

      {/* Voice Command Center (Input) - widoczne gdy viewMode === 'bar' */}
      {viewMode === 'bar' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 w-full max-w-7xl mx-auto flex flex-col items-center pointer-events-auto">
          <ExpectedContextPrompts />
          <VoiceCommandCenterV2
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
          />
        </div>
      )}

    </div>
  );
}










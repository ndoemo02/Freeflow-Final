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

import { useState, useCallback, useEffect } from "react";
import { useBrainSession } from "../hooks/useBrainSession";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { useUIPanels } from "../hooks/useUIPanels";
import { useTTS } from "../hooks/useTTS";
import { useActionDispatcher } from "../hooks/useActionDispatcher";
import { deriveUIHints } from "../lib/brainUiUtils";
import UIPanelRouter from "../components/UIPanelRouter";
import VoiceCommandCenterV2 from "../components/VoiceCommandCenterV2";
import LogoFreeFlow from "../components/LogoFreeFlow.jsx";
import Cart from "../components/Cart";
import MenuDrawer from "../ui/MenuDrawer";
import Switch from "../components/Switch";
import { useUI } from "../state/ui";
import { useCart } from "../state/CartContext";
import freeflowLogo from '../assets/Freeflowlogo.png';
import "./Home.css";

// --- UI View Mode Types ---
type ViewMode = 'tiles' | 'bar';

export default function Home() {
  // --- Hooks ---
  // Using lastFullResponse to access strict data contract including 'tts' object
  // startNewConversation: Manual conversation reset (optional UI feature)
  const { sessionId, sendMessage, isThinking, lastFullResponse, lastResponse, startNewConversation } = useBrainSession();
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useVoiceInput();
  const { uiHints, setHints } = useUIPanels();
  const { play, stop, isSpeaking } = useTTS();
  const { dispatch } = useActionDispatcher();

  // --- UI View State (tiles vs voicebar) ---
  const [viewMode, setViewMode] = useState<ViewMode>('tiles');

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
      // This is the critical fix for "Frontend nie słucha Backendu" issue
      if (lastFullResponse.actions || lastFullResponse.meta?.addedToCart) {
        dispatch(lastFullResponse.actions, lastFullResponse.meta);
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


  // --- Render ---
  return (
    <div className="home-page freeflow relative min-h-screen overflow-hidden text-slate-100">

      {/* Background provided by App.tsx (RestaurantBackground) */}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 p-4 flex justify-between items-start z-50">
        <div className="flex flex-col gap-1">
          <LogoFreeFlow />
          <div className="flex flex-col pl-1">
            <p className="text-sm font-medium text-white/90 leading-tight">Voice to order — Złóż zamówienie</p>
            <p className="text-xs text-white/60 leading-tight">Restauracja, taxi albo hotel?</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsOpen(true)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <i className="fas fa-shopping-cart text-white" />
          </button>
          <button onClick={openDrawer} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <i className="fas fa-bars text-white" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 pb-32 w-full max-w-7xl mx-auto">

        {/* Brain UI Router - Renders "Configurable Islands" */}
        <div className="w-full mb-8">
          <UIPanelRouter
            uiHints={uiHints}
            data={lastFullResponse || {}}
          />
        </div>

        {/* Logo/Brand Centerpiece (Empty State for Panels) */}
        {uiHints.panel === 'none' && (
          <div className="hero-stack">
            <div className={`logo-container ${isListening ? 'recording' : ''}`} onClick={handleMicClick}>
              <img
                src={freeflowLogo}
                alt="FreeFlow"
                className={`logo ${isListening ? 'recording' : ''}`}
              />
              {isListening && (
                <div className="recording-indicator">
                  Nasłuchiwanie...
                </div>
              )}
            </div>
          </div>
        )}

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

      {/* Voice Command Center (Input) - widoczne gdy viewMode === 'bar' */}
      {viewMode === 'bar' && (
        <VoiceCommandCenterV2
          recording={isListening}
          isProcessing={isThinking}
          isSpeaking={isSpeaking}
          interimText={transcript}
          finalText={transcript}
          amberResponse={lastResponse || lastFullResponse?.reply || ''}
          onMicClick={handleMicClick}
          onTextSubmit={handleTextSubmit}
          onClearResponse={() => { }}
          visible={true}
          isPresenting={uiHints.panel !== 'none'}
        />
      )}

      {/* Drawers */}
      <MenuDrawer />
      <Cart />

    </div>
  );
}
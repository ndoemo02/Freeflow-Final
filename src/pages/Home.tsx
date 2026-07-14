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
import { useLocation, useNavigate } from "react-router-dom";
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
import HeroLogoMorph from "../components/HeroLogoMorph";
import IntentChips from "../components/IntentChips";
import Cart from "../components/Cart";
import MenuDrawer from "../ui/MenuDrawer";
import Switch from "../components/Switch";
import { StateIsland, SuggestedRestaurantsCarousel } from "../components/ConversationUI";
import MenuIsland from "../components/MenuIsland";
import { useUI } from "../state/ui";
import { useCart } from "../state/CartContext";
import { useLiveUiSessionStore } from "../state/liveUiSession";
import ErrorFallback from "../components/ErrorFallback";
import "./Home.css";
import { usePostOrderReset } from '../hooks/usePostOrderReset';
import { generateTurnId, logBridge } from '../lib/interactionBridge';
import { deriveLogoScenePhase } from '../lib/logoSceneContract';

// --- UI View Mode Types ---
type ViewMode = 'tiles' | 'bar';

export default function Home() {
  // --- Hooks ---
  // Using lastFullResponse to access strict data contract including 'tts' object
  // startNewConversation: Manual conversation reset (optional UI feature)
  const { sessionId, sendMessage, isThinking, lastFullResponse, lastResponse, resetSession: startNewConversation, error } = useConversationStore();
  const location = useLocation();
  const navigate = useNavigate();
  const clearHomeContext = useConversationStore(state => state.clearHomeContext);
  const uiMode = useConversationStore(state => state.uiMode);
  const currentRestaurant = useConversationStore(state => state.currentRestaurant);
  const suggestedRestaurants = useConversationStore(state => state.suggestedRestaurants);
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
  const lastPanelRestaurantRef = useRef<string | null>(null);
  const liveUiState = useLiveUiSessionStore((state) => state.sessionState);
  const liveUiStatusText = useLiveUiSessionStore((state) => state.statusText);
  const liveUserTranscript = useLiveUiSessionStore((state) => state.lastUserTranscript);
  const liveAssistantTranscript = useLiveUiSessionStore((state) => state.lastAssistantTranscript);

  // --- UI View State (tiles vs voicebar) ---
  const [viewMode, setViewMode] = useState<ViewMode>('bar'); // domyślnie voice bar
  const [logoLiveRequested, setLogoLiveRequested] = useState(false);
  const logoLiveActive = liveSessionActive || logoLiveRequested;

  // Auto-reset UI po potwierdzeniu zamówienia
  usePostOrderReset();

  // --- Amber Status ---
  // green = ready/listening, purple = thinking/tool work, cyan = response/action, red = real error only.
  const amberStatus: 'ready' | 'thinking' | 'action' | 'error' = error
    ? 'error'
    : (isThinking || liveUiState === 'processing')
      ? 'thinking'
      : (
          liveUiState === 'results_ready'
          || liveUiState === 'restaurant_selected'
          || liveUiState === 'item_selected'
          || liveUiState === 'cart_ready'
        )
        ? 'action'
        : 'ready';
  const logoScenePhase = deriveLogoScenePhase({
    uiMode,
    isListening: isListening || logoLiveRequested,
    isThinking,
    liveSessionActive: logoLiveActive,
    liveUiState: logoLiveActive ? liveUiState : undefined,
    hasSuggestedRestaurants: !!suggestedRestaurants?.length,
  });

  // --- Legacy UI state for drawers (Presentation Only) ---
  const openDrawer = useUI((s) => s.openDrawer);
  const setVoiceActive = useUI((s) => s.setVoiceActive);
  const clearPresentation = useUI((s) => s.clearPresentation);
  const { setIsOpen, itemCount } = useCart() as any;
  const cartItemsCount = Number(itemCount || 0);

  // Bump animation on voice cart add
  const prevCartRef = useRef(cartItemsCount);
  const [cartBumpKey, setCartBumpKey] = useState(0);
  useEffect(() => {
    if (cartItemsCount > prevCartRef.current) {
      setCartBumpKey(k => k + 1);
    }
    prevCartRef.current = cartItemsCount;
  }, [cartItemsCount]);

  // Home should always render a clean screen without stale menu/restaurant context.
  useEffect(() => {
    clearHomeContext();
    clearPresentation();
    setHints({ panel: 'none' });
  }, [clearHomeContext, clearPresentation, setHints]);

  // Lock global page scroll on Home to prevent empty background scrolling on mobile.
  // Scrollable areas (menu/list sheets) keep their own internal overflow containers.
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscrollY = html.style.overscrollBehaviorY;
    const prevBodyOverscrollY = body.style.overscrollBehaviorY;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehaviorY = 'none';
    body.style.overscrollBehaviorY = 'none';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehaviorY = prevHtmlOverscrollY;
      body.style.overscrollBehaviorY = prevBodyOverscrollY;
    };
  }, []);

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
      // tool_result message - skip here to prevent double SHOW_CART / SYNC_CART.
      if (!liveSessionActive && (lastFullResponse.actions || lastFullResponse.meta?.cart || lastFullResponse.cart || lastFullResponse.events?.length)) {
        const responseKey = lastFullResponse.turn_id || lastFullResponse.timestamp || lastFullResponse.session_id;
        const fakeMeta = {
          ...lastFullResponse.meta,
          cart: lastFullResponse.cart || lastFullResponse.meta?.cart,
          intent: lastFullResponse.intent || lastFullResponse.meta?.intent,
          tool: lastFullResponse.meta?.tool || lastFullResponse.tool || lastFullResponse.name,
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

    const textTurnId = generateTurnId(sessionId);
    logBridge('user_input_received', { turn_id: textTurnId, session_id: sessionId, source: 'voicebar_text', text: sanitized.slice(0, 60) });
    stop(); // Stop TTS before sending
    await sendMessage(sanitized);
  }, [liveSessionActive, sendMessage, stop]);

  const panelRestaurant = (location.state as {
    openRestaurant?: { id?: string; name?: string };
  } | null)?.openRestaurant;

  useEffect(() => {
    const restaurantName = String(panelRestaurant?.name || '').trim();
    const restaurantKey = String(panelRestaurant?.id || restaurantName).trim();
    if (!restaurantName || !restaurantKey || lastPanelRestaurantRef.current === restaurantKey) return;

    lastPanelRestaurantRef.current = restaurantKey;
    navigate(location.pathname, { replace: true, state: null });
    void handleTextSubmit(`Pokaż menu ${restaurantName}`);
  }, [handleTextSubmit, location.pathname, navigate, panelRestaurant?.id, panelRestaurant?.name]);

  const handleLiveToggle = useCallback(() => {
    if (logoLiveActive) {
      setLogoLiveRequested(false);
      stopLiveSession();
      return;
    }
    setLogoLiveRequested(true);
    void Promise.resolve(startLiveSession()).catch(() => {
      setLogoLiveRequested(false);
    });
  }, [logoLiveActive, startLiveSession, stopLiveSession]);

  useEffect(() => {
    if (liveSessionActive) {
      setLogoLiveRequested(true);
    }
  }, [liveSessionActive]);

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
      const voiceDockLayer = document.querySelector('[data-ui-role="voice-dock-layer"]') as HTMLElement | null;
      const voiceDock = document.querySelector('[data-ui-role="voice-dock-bar"]') as HTMLElement | null;
      const statusDot = document.querySelector('[data-ui-role="status-dot"]') as HTMLElement | null;
      const orb = document.querySelector('[data-ui-role="action-orb"]') as HTMLElement | null;
      const expandedPanel = document.querySelector('.contextual-island-sheet.island-expanded') as HTMLElement | null;
      const expandedPanelLayer = expandedPanel?.closest('.contextual-island') as HTMLElement | null;
      const expandedScroll = expandedPanel?.querySelector('.list-scroll') as HTMLElement | null;

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

      const voiceDockZ = voiceDockLayer ? window.getComputedStyle(voiceDockLayer).zIndex : 'null';
      const expandedPanelZ = expandedPanel
        ? (
          (window.getComputedStyle(expandedPanel).zIndex !== 'auto'
            ? window.getComputedStyle(expandedPanel).zIndex
            : (expandedPanelLayer ? window.getComputedStyle(expandedPanelLayer).zIndex : 'auto'))
        )
        : 'null';
      const expandedMaxHeight = expandedPanel ? window.getComputedStyle(expandedPanel).maxHeight : 'null';
      const scrollContainerActive = !!(expandedScroll && expandedScroll.scrollHeight > expandedScroll.clientHeight + 1);

      console.log(`[UI_LAYER] voiceDockZ=${voiceDockZ}`);
      console.log(`[UI_LAYER] expandedPanelZ=${expandedPanelZ}`);
      console.log(`[UI_LAYOUT] voiceDockCenterY=${voiceDockCenterY}`);
      console.log(`[UI_LAYOUT] statusDotCenterY=${statusDotCenterY}`);
      console.log(`[UI_LAYOUT] orbPosition=${orbPosition}`);
      console.log(`[UI_LAYOUT] expandedMaxHeight=${expandedMaxHeight}`);
      console.log(`[UI_LAYOUT] scrollContainerActive=${String(scrollContainerActive)}`);
    };

    const onResize = () => window.requestAnimationFrame(logLayout);
    const mutationObserver = new MutationObserver(() => {
      window.requestAnimationFrame(logLayout);
    });
    const rafId = window.requestAnimationFrame(logLayout);
    const freeflowRoot = document.querySelector('.home-page.freeflow');
    const sheetRoot = document.querySelector('.contextual-island-sheet');
    if (freeflowRoot) {
      mutationObserver.observe(freeflowRoot, { attributes: true, attributeFilter: ['class'] });
    }
    if (sheetRoot) {
      mutationObserver.observe(sheetRoot, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(rafId);
      mutationObserver.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [viewMode, uiMode, isListening, isThinking, isSpeaking, cartItemsCount]);

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

  // VoiceDock scroll-hide
  const dockWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const hide = () => { dockWrapperRef.current?.setAttribute('data-dock-hidden', 'true'); };
    const show = () => { dockWrapperRef.current?.removeAttribute('data-dock-hidden'); };
    window.addEventListener('freeflow:menu:scrolling', hide);
    window.addEventListener('freeflow:menu:scrollstopped', show);
    return () => {
      window.removeEventListener('freeflow:menu:scrolling', hide);
      window.removeEventListener('freeflow:menu:scrollstopped', show);
    };
  }, []);

  // --- Render ---
  return (
    <div className="home-page freeflow relative h-[100dvh] min-h-[100dvh] overflow-x-hidden overflow-y-hidden overscroll-y-none text-slate-100">

      {/* Background provided by App.tsx (RestaurantBackground) */}

      {/* Header */}
      <header className="home-header fixed top-0 left-0 right-0 pt-1.5 px-3 pb-1 flex justify-between items-start z-50 pointer-events-none">
        <div
          className="header-logo-slot"
          data-ui-role="header-logo-target"
          aria-hidden="true"
        />
        <div className="home-header__left flex flex-col gap-0.5 pointer-events-auto">
          <div className="flex items-center gap-2 pl-0.5 mt-0">
            <StateIsland />
          </div>
        </div>
        <div className="flex gap-4 pointer-events-auto">
          {cartItemsCount > 0 && (
            <button
              onClick={() => setIsOpen(true)}
              className="relative p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
              aria-label={`Otwórz koszyk (${cartItemsCount})`}
            >
              <i className="fas fa-shopping-cart text-white" />
              <span
                key={cartBumpKey}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-[10px] leading-[18px] font-bold text-white text-center"
              >
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
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen min-h-[100dvh] p-2 pt-1 pb-[calc(env(safe-area-inset-bottom)+96px)] w-full max-w-7xl mx-auto">

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
          <HeroLogoMorph
            phase={logoScenePhase}
            active={logoLiveActive || isListening}
            onClick={liveModeEnabled ? handleLiveToggle : handleLogoPull}
            label={liveModeEnabled ? (logoLiveActive ? 'Wstrzymaj tryb Live' : 'Włącz tryb Live') : 'Uruchom mikrofon'}
          />
        </div>

      </main>

      {/* Switch (Pająk) - stała pozycja po lewej */}
      <Switch
        onToggle={(checked) => setViewMode(checked ? 'bar' : 'tiles')}
        initial={viewMode === 'bar'}
        amberReady={amberStatus !== 'error'}
        amberStatus={amberStatus}
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
        <div ref={dockWrapperRef} className="voice-dock-rail-safe fixed bottom-0 left-0 right-0 z-[120] px-4 pb-4 w-full max-w-7xl mx-auto flex flex-col items-center pointer-events-auto">
          <IntentChips />
          <VoiceDock
            onMicClick={handleMicClick}
            onTextSubmit={handleTextSubmit}
          />
        </div>
      )}

    </div>
  );
}





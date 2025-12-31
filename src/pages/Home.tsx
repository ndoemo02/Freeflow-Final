import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useUI } from "../state/ui"
// @ts-ignore
import { useCart } from "../state/CartContext"
// @ts-ignore
import Cart from "../components/Cart"
// @ts-ignore
import { useTheme } from '../state/ThemeContext';
// @ts-ignore
import MenuDrawer from "../ui/MenuDrawer"
import VoiceCommandCenterV2 from '../components/VoiceCommandCenterV2';
import Switch from "../components/Switch"
import LogoFreeFlow from "../components/LogoFreeFlow.jsx"
// @ts-ignore
import { useSpeechRecognition } from "../hooks/useSpeechRecognition"
import freeflowLogo from '../assets/Freeflowlogo.png';
import "./Home.css"
import { CONFIG, ENABLE_IMMERSIVE_MODE, getApiUrl } from "../lib/config"
import { LLMContract, PresentationStep, UIMode } from "../lib/llmContract"
import { renderFromLLM, UIController } from "../lib/renderEngine"
import { speakTts } from "../lib/ttsClient"
import { logger } from "../lib/logger"
import ContextualIsland from "../components/ContextualIsland"
import MenuRightList from '../components/MenuRightList';


export default function Home() {
  const { theme } = useTheme();

  // UI State from Zustand
  // UI State from Zustand
  const {
    mode, setMode,
    presentationItems,
    setPresentationItems,
    setHighlightedCardId,
    clearPresentation
  } = useUI();

  const [showTextPanel, setShowTextPanel] = useState(true);
  const [immersive, setImmersive] = useState(false)
  const [voiceQuery, setVoiceQuery] = useState("")
  const [amberResponse, setAmberResponse] = useState("") // Just text for UI
  const [userMessage, setUserMessage] = useState("")
  const preloadedAudioRef = useRef<{ text: string, base64: string } | null>(null);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false) // Blocks UI interaction (RenderEngine)
  const [isThinking, setIsThinking] = useState(false)   // API Request in progress

  const openDrawer = useUI((s) => s.openDrawer)
  // @ts-ignore
  const { setIsOpen, addToCart, syncCart } = useCart()

  // Audio Ref to stop playback
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const [sessionId] = useState(() => {
    const stored = localStorage.getItem("amber-session-id")
    if (stored) return stored
    const newId = `session-${Date.now()}`
    localStorage.setItem("amber-session-id", newId)
    return newId
  })

  const lastMessageRef = useRef("")
  const [isSending, setIsSending] = useState(false);

  // UI View Mode (Bar vs Island/Tiles)
  const [viewMode, setViewMode] = useState<'bar' | 'island'>('bar');

  // Auto-switch view mode based on presentation state
  useEffect(() => {
    const isBarMode =
      mode === 'restaurant_presentation' ||
      mode === 'menu_presentation' ||
      mode === 'cart_summary' ||
      mode === 'confirmation';

    // Jeśli mamy wyniki wyszukiwania (ale nie wybraliśmy konkretnej), pokaż kafelki
    if ((presentationItems?.length || 0) > 0 && !isBarMode) {
      setViewMode('island');
    }
    // Jeśli wchodzimy w tryb prezentacji (konkretna restauracja, menu, koszyk), pokaż Voice Bar
    if (isBarMode) {
      setViewMode('bar');
    }
  }, [mode, presentationItems]);

  const WARSAW_COORDS = { lat: 52.2297, lng: 21.0122 };
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>(WARSAW_COORDS);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const isInPoland = latitude >= 49 && latitude <= 55 && longitude >= 14 && longitude <= 25;
        if (isInPoland) setCoords({ lat: latitude, lng: longitude });
      },
      (err) => logger.warn('📍 Geolocation error:', err.message),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 }
    );
  }, [])

  const {
    recording,
    interimText,
    finalText,
    setFinalText,
    startRecording,
    stopRecording,
  } = useSpeechRecognition({
    onTranscriptChange: (transcript: string) => setVoiceQuery(transcript),
  })

  // Switch kontroluje widoczność paska (Bar vs Island/Tiles)
  const toggleUI = (checked: boolean) => {
    setViewMode(checked ? 'bar' : 'island');
    // setShowTextPanel(checked); // Opcjonalnie zachowaj dla kompatybilności
  }

  const handleLogoClick = () => {
    // if (ENABLE_IMMERSIVE_MODE) setImmersive(true) - User requested logo to stay put
    if (recording) {
      stopRecording()
    } else {
      startRecording()
      if (!showTextPanel) {
        setShowTextPanel(true)
        toggleUI(true)
      }
    }
  }

  // 🧠 UI Controller Implementation
  const uiController = useCallback((): UIController => ({
    setUIMode: (m) => setMode(m),

    playTTS: async (text: string) => {
      setIsPlayingAudio(true);
      try {
        let audio: HTMLAudioElement;

        // 🚀 Check for Pre-generated Audio (Optimization)
        const cached = preloadedAudioRef.current;
        logger.debug(`🔊 [playTTS] Incoming: "${text.substring(0, 20)}...", Cached: "${cached?.text?.substring(0, 20)}..."`);

        const matches = cached && (
          cached.text.trim() === text.trim() ||
          text.includes(cached.text.substring(0, 15)) ||
          cached.text.includes(text.substring(0, 15))
        );

        if (matches && cached) {
          logger.info("🔊 [Home] Playing PRELOADED audio from backend cache");
          audio = new Audio(`data:audio/mp3;base64,${cached.base64}`);
          preloadedAudioRef.current = null; // Use once
        } else {
          logger.info("🔊 [Home] Fetching TTS for text:", text.substring(0, 40) + "...");
          // Speed up list items and narratives (narrations) to feel less "slow"
          const isNarrative = text.includes('.') && text.length < 100 && !text.includes('?');
          const speakingRate = isNarrative ? 1.15 : 1.05;

          audio = await speakTts(text, {
            voiceName: 'pl-PL-Wavenet-A',
            speakingRate: speakingRate
          });
        }

        currentAudioRef.current = audio;

        // 🔥 CRITICAL: Must await play and end!
        await audio.play();

        if (!audio.paused || !audio.ended) {
          await new Promise<void>(resolve => {
            audio.onended = () => resolve();
            audio.onerror = (e) => {
              logger.error("Audio playback error:", e);
              resolve();
            };
          });
        }
        logger.info("✅ [Home] Audio playback finished");
      } catch (e) {
        logger.error("TTS Output Error:", e);
      } finally {
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
      }
    },

    stopAllTTS: () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setIsPlayingAudio(false);
    },

    highlightCard: (cardId) => setHighlightedCardId(cardId),
    unhighlightCard: () => setHighlightedCardId(null),
    scrollToCard: (cardId) => setHighlightedCardId(cardId), // Highlight handles scroll via effect
    clearHighlights: () => setHighlightedCardId(null),

    lockUserInput: () => setIsProcessing(true), // Or specific lock state
    unlockUserInput: () => setIsProcessing(false),
    openMicrophone: () => {
      if (!recording) startRecording();
    }
  }), [setMode, setHighlightedCardId, recording, startRecording, setIsProcessing]);


  const sendToAmberBrain = useCallback(async (text: string) => {
    if (isSending) return
    if (text.trim() === lastMessageRef.current) return
    lastMessageRef.current = text.trim()

    setIsSending(true)
    setIsThinking(true)
    setAmberResponse("") // Clear old response so we don't show it during thinking
    setUserMessage(text)
    // Clear previous presentation on new request
    // clearPresentation(); // Optional: RenderEngine will clear it anyway

    try {
      const isV2 = CONFIG.USE_BRAIN_V2;
      const apiUrl = getApiUrl(isV2 ? '/api/brain/v2' : '/api/brain')

      // Request body based on backend version (ETAP 6 Substitution)
      const body = isV2 ? {
        session_id: sessionId,
        input: text,
        includeTTS: true,
        tts: true,
        meta: {
          lat: coords.lat,
          lng: coords.lng,
          channel: 'voice' // Enforce 'voice' to trigger backend logic
        }
      } : {
        text: text,
        sessionId: sessionId,
        lat: coords.lat,
        lng: coords.lng,
        includeTTS: true,
        tts: true,
        channel: 'voice'
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setIsThinking(false);
      logger.info("🧠 Amber Data:", data);

      // Save audio for RenderEngine (Task 1)
      if (data.audioContent) {
        // Use tts_text if available (V2 optimized), fallback to full reply
        preloadedAudioRef.current = {
          text: data.tts_text || data.reply || data.text,
          base64: data.audioContent
        };
      }

      setAmberResponse(data.reply || "");

      // 🛠️ Construct LLM Contract from Backend Data (V2 Adapter)
      let ui_mode: UIMode = 'standard_chat';
      let items: any[] = [];
      let sequence: PresentationStep[] = [];

      const effectiveMenuItems = data.menuItems || data.menu;
      const effectiveRestaurants = data.restaurants;

      // Detect Mode
      const isMenuIntent = data.intent === 'menu_request' || data.intent === 'show_menu' || data.intent === 'menu_presentation';
      const isConfirmIntent = data.intent === 'confirm_order' || (data.intent === 'create_order' && data.meta?.addedToCart);

      // 🛒 Cart Sync (Voice -> Frontend)
      if (data.meta?.cart) {
        syncCart(data.meta.cart.items, data.meta.llm_refinement?.targetRestaurant || 'Restauracja');
      }

      // ⚡ Handle Backend Actions (Task 3)
      if (data.actions && Array.isArray(data.actions)) {
        const showCartAction = data.actions.find((a: any) => a.type === 'SHOW_CART');
        if (showCartAction) {
          logger.info("⚡ [Action] SHOW_CART detected! Transitioning mode...");
          ui_mode = 'confirmation';
          items = data.meta?.cart?.items || [];
          // Note: setIsOpen(true) moved to after await renderFromLLM
        }

        const closeCartAction = data.actions.find((a: any) => a.type === 'CLOSE_CART');
        if (closeCartAction) {
          logger.info("⚡ [Action] CLOSE_CART detected! Closing cart...");
          setIsOpen(false);
        }
      }

      if (isConfirmIntent) {
        logger.info("🛒 [Mode] Switching to Confirmation Mode");
        ui_mode = 'confirmation';
        items = data.meta?.cart?.items || data.meta?.lastOrder?.items || [];
      } else if (isMenuIntent && (effectiveMenuItems?.length || 0) > 0) {
        ui_mode = 'menu_presentation';
        items = effectiveMenuItems;
      } else if ((effectiveRestaurants?.length || 0) > 0) {
        logger.info("🍽️ [Mode] Switching to Restaurant Presentation Mode");
        ui_mode = 'restaurant_presentation';
        items = effectiveRestaurants;
      } else if ((effectiveMenuItems?.length || 0) > 0) {
        logger.info("🍔 [Mode] Switching to Menu Presentation Mode");
        ui_mode = 'menu_presentation';
        items = effectiveMenuItems;
      } else if (data.meta?.cart) {
        logger.info("🛒 [Mode] Switching to Cart Summary Mode");
        ui_mode = 'cart_summary';
        items = data.meta.cart.items || [];
      }

      logger.info(`🎭 [UI] Final calculated mode: ${ui_mode}`);

      setPresentationItems(items || []);
      setMode(ui_mode);

      let cleanReply = data.reply || "";
      let closingQuestion = data.closing_question || "";

      if (items.length > 0 && (ui_mode === 'restaurant_presentation' || ui_mode === 'menu_presentation' || ui_mode === 'cart_summary')) {
        const splitByLine = cleanReply.split('\n');
        if (splitByLine.length > 0) {
          let firstLine = splitByLine[0].trim();
          // If first line is too short, merge with next
          if (firstLine.length < 5 && splitByLine.length > 1) {
            firstLine = splitByLine[1].trim();
          }
          cleanReply = firstLine;
        }

        // Extract closing question if not provided but exists in last line
        if (!closingQuestion && splitByLine.length > 1) {
          const lastLine = splitByLine[splitByLine.length - 1].trim();
          if (lastLine.includes('?') || lastLine.length < 50) {
            closingQuestion = lastLine;
          }
        }

        if (cleanReply.length > 150) {
          const dotIndex = cleanReply.indexOf('.');
          if (dotIndex > 10 && dotIndex < 150) cleanReply = cleanReply.substring(0, dotIndex + 1);
          else cleanReply = cleanReply.substring(0, 120) + "...";
        }
        if (!cleanReply.endsWith(':') && !cleanReply.endsWith('.') && !cleanReply.endsWith('?')) cleanReply += ":";
      }

      setAmberResponse(cleanReply);

      if (items.length > 0) {
        // Limit voice presentation to top 3 items for restaurants/menu to avoid long narrations (Task 3)
        const itemsToRead = (ui_mode === 'restaurant_presentation' || ui_mode === 'menu_presentation')
          ? items.slice(0, 3)
          : items;

        sequence = itemsToRead.map((item: any, idx: number) => ({
          step_index: idx,
          card_id: item.id || item.menuItemId,
          tts_narrative: `${item.name}.` // Concise version to minimize gaps
        }));
      }

      const contract: LLMContract = {
        ui_mode: ui_mode as any,
        voice_intro: cleanReply,
        presentation_sequence: sequence,
        closing_question: closingQuestion,
        expect_selection: !isConfirmIntent && (data.intent !== 'confirm_order')
      };

      logger.info("🎬 [Render V3] Contract Ready:", contract);

      // 🎬 EXECUTE ENGINE
      await renderFromLLM(contract, uiController());

      // 🛒 Post-render Actions (Task 2: Sync with TTS End)
      if (data.actions && Array.isArray(data.actions)) {
        const showCartAction = data.actions.find((a: any) => a.type === 'SHOW_CART');
        if (showCartAction) {
          logger.info("🏁 [Home] AI finished presentation. Opening cart as requested by SHOW_CART action.");
          setIsOpen(true);
        }
      }

    } catch (error) {
      logger.error("Communication Error:", error);
      setAmberResponse("Błąd komunikacji.");
    } finally {
      setIsSending(false)
      setIsThinking(false)
    }
  }, [sessionId, coords, isSending, uiController, setPresentationItems, recording, renderFromLLM])

  const handleManualSubmit = useCallback((text: string) => {
    const trimmed = (text || "").trim()
    if (!trimmed) return
    sendToAmberBrain(trimmed)
  }, [sendToAmberBrain])

  const handleCardSelect = useCallback((item: any) => {
    console.log("👉 Card Selected:", item);

    // 1. Stop Audio immediately
    const ui = uiController();
    ui.stopAllTTS();

    // 2. Clear Presentation State to remove UI overlap
    setPresentationItems([]);
    setMode('idle'); // or standard_chat
    setHighlightedCardId(null);

    // 3. Send selection to Brain
    handleManualSubmit(item.name);
  }, [handleManualSubmit, uiController, setPresentationItems, setMode, setHighlightedCardId]);

  // Speech Recognition Auto-Send
  useEffect(() => {
    const trimmedFinal = finalText?.trim();
    if (!recording && trimmedFinal && trimmedFinal !== lastMessageRef.current) {
      sendToAmberBrain(trimmedFinal);
      setFinalText("");
    }
  }, [finalText, recording, sendToAmberBrain, setFinalText]);

  return (
    <div className={`home-page freeflow ${immersive ? 'immersive' : ''}`}>
      <picture>
        <source media="(max-width: 768px)" srcSet="/images/background.png" />
        <img src="/images/desk.png" alt="" className="bg" />
      </picture>
      <span className="flow">Flow</span>

      <Switch onToggle={toggleUI} amberReady={!recording} initial={true} />

      <header className="top-header">
        <div className="header-left">
          <LogoFreeFlow />
          <p>Voice to order — Złóż zamówienie<br />Restauracja, taxi albo hotel?</p>
        </div>
        <div className="header-right">
          <button onClick={() => setIsOpen(true)} className="cart-btn" title="Koszyk">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" /></svg>
          </button>
          <button onClick={openDrawer} className="menu-btn">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </header>

      <div className="main-wrapper">
        <div className="hero-stack">
          <div className="logo-container" onClick={handleLogoClick}>
            <img src={freeflowLogo} alt="FreeFlow" className={`logo ${recording ? 'recording' : ''}`} style={{ filter: recording ? 'drop-shadow(0 0 20px rgba(255, 50, 150, 0.6))' : 'none' }} />
          </div>
        </div>
      </div>

      <div className={`tiles ${(viewMode === 'bar' || immersive) ? 'hidden' : ''}`}>
        <div className="tile" onClick={() => handleManualSubmit("Zamawiam jedzenie")}>
          <img src="/icons/food.png" alt="Jedzenie" />
        </div>
        <div className="tile" onClick={() => handleManualSubmit("Zamawiam taxi")}>
          <img src="/icons/car.png" alt="Transport" />
        </div>
        <div className="tile" onClick={() => handleManualSubmit("Szukam hotelu")}>
          <img src="/icons/hotel.png" alt="Hotel" />
        </div>
      </div>

      <div className="chat-wrapper">
        {/* 🗣️ Voice Panel - Jedyne źródło prawdy o dialogu (user + amber) */}
        {/* 🏝️ Floating Contextual Widget (Right Side) - Zawsze w drzewie, sam zarządza widocznością */}

        {/* 🏝️ Floating Contextual Widget (Left/Right Island) */}
        <ContextualIsland onSelect={handleCardSelect} />

        {/* 📜 Floating Menu List (Deprecated - Unified into ContextualIsland) */}
        {/* <MenuRightList /> */}

        <VoiceCommandCenterV2
          recording={recording}
          isProcessing={isThinking}
          isSpeaking={isPlayingAudio}
          interimText={interimText}
          finalText={finalText || voiceQuery}
          amberResponse={amberResponse}
          onClearResponse={() => setAmberResponse("")}
          onMicClick={handleLogoClick}
          onTextSubmit={handleManualSubmit}
          isPresenting={mode === 'restaurant_presentation' || mode === 'menu_presentation'}
          visible={viewMode === 'bar'}
        />
      </div>

      <MenuDrawer />
      <Cart />
    </div>
  )
}
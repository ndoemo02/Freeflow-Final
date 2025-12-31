// src/pages/HomeClassic.jsx
import React, { useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { speakTts, speakWithVoice } from "../lib/ttsClient.js";
import { addToCart, total, getCart, clearCart } from '../lib/cart';
import ResultsList from "../components/ResultsList";
import { manageTurn } from "../lib/DialogManager";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import VoiceDock from "../components/VoiceDock.tsx";

export default function HomeClassic() {
  const [hits, setHits] = useState([]);
  const [query, setQuery] = useState("");
  const [chat, setChat] = useState([]);
  const [dialogSlots, setDialogSlots] = useState({});
  // const [recording, setRecording] = useState(false); // Usunięte - zarządzane przez hook
  const [loading, setLoading] = useState(false);
  // const [interim, setInterim] = useState(""); // Usunięte - zarządzane przez hook jako interimText
  // const [finalText, setFinalText] = useState(""); // Usunięte - zarządzane przez hook
  const [error, setError] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [showRestaurants, setShowRestaurants] = useState(false);
  
  const synthRef = useRef(null);
  const processingRef = useRef(false);
  const speakingRef = useRef(false);
  const lastSpeakPromiseRef = useRef(Promise.resolve());
  const greetedRef = useRef(false);
  const streamCancelRef = useRef(0);

  const {
    recording,
    interimText,
    finalText,
    startRecording,
    stopRecording,
  } = useSpeechRecognition({
    onTranscriptChange: (transcript) => setQuery(transcript),
  });

  // Ping backendu
    useEffect(() => {
    (async () => {
      try {
        const h = await api('/api/health');
        if (!h?.ok) console.warn('Health not ok', h);
      } catch (e) {
        console.warn('Health check failed:', e);
      }
    })();
  }, []);

  // Jednorazowe powitanie - tylko po pierwszej interakcji użytkownika
  useEffect(() => {
    if (!greetedRef.current) {
      greetedRef.current = true;
      // Usuń automatyczne powitanie - TTS wymaga interakcji użytkownika
      // setTimeout(() => {
      //   lastSpeakPromiseRef.current = lastSpeakPromiseRef.current.then(() =>
      //     speakNow("Witaj we Freeflow, z nami zamówisz pewnie i szybko")
      //   );
      // }, 300);
    }
  }, []);

  // TTS: jeden punkt wejścia, z deduplikacją i cache po stronie klienta
  const speakNow = async (text) => {
    console.log("🎤 TTS: Starting to speak:", text);
    try {
      speakingRef.current = true;
      setSpeaking(true);
      console.log("🎤 TTS: Calling speakWithVoice...");
      await speakWithVoice(text, "pl-PL-Wavenet-D");
      console.log("🎤 TTS: Speech completed successfully");
    } catch (e) {
      console.error("🎤 TTS failed:", e);
    } finally {
      speakingRef.current = false;
      setSpeaking(false);
      console.log("🎤 TTS: Cleanup completed");
    }
  };

  // Zapisz zamówienie do bazy danych z timeout
  const saveOrderToDatabase = async (cartItems, restaurantId) => {
    try {
      console.log("💾 Saving order to database:", { cartItems, restaurantId });
      
      // Timeout po 5 sekundach
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurantId || 'default-restaurant',
          items: cartItems,
          total: total(),
          customerId: 'anonymous'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Order saved:", result);
      
      // Wyczyść koszyk po zapisaniu
      clearCart();
      
      return result;
    } catch (error) {
      console.error("❌ Failed to save order:", error);
      // Nie rzucaj błędu - pozwól systemowi działać
      console.log("⚠️ Continuing without saving to database");
      return { error: true };
    }
  };

  // Pokaż popup koszyka na 2.5 sekundy
  const showCartPopupTemporary = () => {
    setShowCartPopup(true);
    setTimeout(() => {
      setShowCartPopup(false);
    }, 2500);
  };

  // Załaduj menu restauracji
  const loadRestaurantMenu = async (restaurantId) => {
    try {
      console.log("🍽️ Loading menu for restaurant:", restaurantId);
      const response = await fetch(`/api/menu?restaurant_id=${restaurantId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      console.log("📋 Menu loaded:", data);
      
      if (data.results && data.results.length > 0) {
        setMenuItems(data.results);
        setShowMenu(true);
        return data.results;
      } else {
        console.log("⚠️ No menu items found");
        return [];
      }
    } catch (error) {
      console.error("❌ Failed to load menu:", error);
      return [];
    }
  };

  // Załaduj restauracje w okolicy
  const loadNearbyRestaurants = async (query = "") => {
    try {
      console.log("🏪 Loading nearby restaurants:", query);
      const response = await fetch(`/api/restaurants?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      console.log("🏪 Restaurants loaded:", data);
      
      if (data.results && data.results.length > 0) {
        setRestaurants(data.results);
        setShowRestaurants(true);
        return data.results;
      } else {
        console.log("⚠️ No restaurants found");
        return [];
      }
    } catch (error) {
      console.error("❌ Failed to load restaurants:", error);
      return [];
    }
  };

  const speak = (text) => {
    lastSpeakPromiseRef.current = lastSpeakPromiseRef.current
      .catch(() => {})
      .then(() => speakNow(text));
    return lastSpeakPromiseRef.current;
  };

  // Nagrywanie audio i wysyłanie do STT
  const handleMicClick = () => {
    if (processingRef.current || speakingRef.current) return;
    if (recording) {
      stopRecording();
    } else {
      setQuery("");
      setChat([]); // Clear chat on new recording session
      startRecording();
    }
  };

  // Typowanie „strumieniowe” odpowiedzi asystenta (UI)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const streamAssistant = async (text) => {
    const id = Date.now();
    streamCancelRef.current = id;
    setChat((prev) => [...prev, { id, role: "assistant", text: "" }]);
    const words = (text || "").split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      if (streamCancelRef.current !== id) return;
      const w = words[i];
      setAssistantText((prev) => (prev ? prev + " " : "") + w);
      setChat((prev) =>
        prev.map((m) => (m.id === id ? { ...m, text: m.text ? m.text + " " + w : w } : m))
      );
      await sleep(40);
    }
  };

  // Body classes (stany UI)
    useEffect(() => {
    document.body.classList.toggle("is-listening", recording);
  }, [recording]);
    useEffect(() => {
    document.body.classList.toggle("is-speaking", speaking);
  }, [speaking]);

  // Klik / Enter / Spacja na logo – nagrywanie audio i STT
  const handleLogoKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleMicClick();
    }
  };

  // Pipeline zapytania (DialogManager)
  const runQueryPipeline = async (q) => {
    const trimmed = (q || "").trim();
    if (!trimmed) return;
    if (processingRef.current) {
      console.log("⚠️ Already processing, ignoring:", trimmed);
      return;
    }
    processingRef.current = true;
    setLoading(true);
    setError("");

    try {
      setChat((prev) => [
        ...prev,
        { id: Date.now() + Math.random(), role: "user", text: trimmed },
      ]);

      const resp = await manageTurn(trimmed, dialogSlots);
      setDialogSlots(resp.slots || {});

      if (resp.speech) {
        await streamAssistant(resp.speech);
        await speak(resp.speech);
      }

      if (resp.action === "search_restaurants") {
        console.log("Restaurants found:", resp.slots);
        // Załaduj menu po wybraniu restauracji
        if (resp.slots.restaurantId) {
          await loadRestaurantMenu(resp.slots.restaurantId);
        }
      } else if (resp.action === "search_menu") {
        console.log("Menu search triggered:", resp.slots);
        // Załaduj menu po wyszukaniu pozycji menu
        if (resp.slots.restaurantId) {
          await loadRestaurantMenu(resp.slots.restaurantId);
        }
      } else if (resp.action === "search_restaurants_general") {
        console.log("General restaurant search:", resp.slots);
        // Załaduj restauracje w okolicy
        await loadNearbyRestaurants(trimmed);
      } else if (resp.action === "add_to_cart") {
        console.log("Added to cart:", resp.slots);
        // Dodaj do koszyka
        if (resp.slots.menuItemId && resp.slots.quantity && resp.slots.price) {
          addToCart({
            id: resp.slots.menuItemId,
            name: resp.slots.menuItem || 'Pozycja',
            qty: resp.slots.quantity,
            price: resp.slots.price,
          });
        }
        await speak("Dodałem do koszyka! Finalizuję zamówienie...");
        
        // NATYCHMIASTOWE finalizowanie - bez opóźnienia!
        const cart = getCart();
        console.log("🚀 Immediate checkout after add to cart, cart:", cart);
        if (cart.length > 0) {
          // Pokaż popup koszyka
          showCartPopupTemporary();
          
          await speak("Finalizuję zamówienie...");
          
          // Zapisz w tle - nie czekaj
          saveOrderToDatabase(cart, resp.slots.restaurantId).catch(err => 
            console.log("⚠️ Background save failed:", err)
          );
          
          await speak("Przekierowuję do panelu zamówień...");
          window.location.href = "/panel/customer";
        }
      } else if (resp.action === "checkout") {
        console.log("Checkout action triggered:", resp.slots);
        await speak("Finalizuję zamówienie...");
        // Dodaj do koszyka przed przekierowaniem
        if (resp.slots.menuItemId && resp.slots.quantity && resp.slots.price) {
          addToCart({
            id: resp.slots.menuItemId,
            name: resp.slots.menuItem || 'Pozycja',
            qty: resp.slots.quantity,
            price: resp.slots.price,
          });
        }
        await speak("Przekierowuję do panelu zamówień...");
        window.location.href = "/panel/customer";
        return;
      } else if (resp.readyToConfirm && getCart().length > 0) {
        // Natychmiastowe finalizowanie gdy użytkownik potwierdza
        console.log("🚀 Immediate checkout triggered, cart:", getCart());
        await speak("Finalizuję zamówienie natychmiast...");
        window.location.href = "/panel/customer";
        return;
      } else if (resp.action === "taxi_order") {
        console.log("Taxi order triggered:", resp.slots);
        await speak(`Zamawiam taxi z ${resp.slots.pickupAddress} do ${resp.slots.destinationAddress}. Szacowana cena: ${resp.slots.estimatedPrice} zł.`);
        await speak("Przekierowuję do panelu taxi...");
        window.location.href = "/panel/taxi";
        return;
      }

      if (resp.readyToConfirm) {
        const term = resp.slots?.item || trimmed;
        try {
          console.log('🔎 /api/places?q=', term);
          const res = await api(`/api/places?q=${encodeURIComponent(term)}`);
          const list = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
          setHits(list);
        } catch (e) {
          console.warn('Places search failed:', e);
          setError('Nie udało się wyszukać miejsc. Spróbuj ponownie.');
        }
      }
    } catch (e) {
      setError(e?.message || "Błąd");
    } finally {
      setLoading(false);
      // Dodaj małe opóźnienie przed resetowaniem processingRef
      setTimeout(() => {
        processingRef.current = false;
      }, 1000);
    }
  };

  // Po zakończeniu nagrywania – uruchom pipeline
    useEffect(() => {
    if (!recording && query.trim()) {
      runQueryPipeline(query);
    }
  }, [recording]); // eslint-disable-line react-hooks/exhaustive-deps

  // Renderuj przyciski koszyka gdy mamy item+qty+price
  function renderOrderCta() {
    if (!dialogSlots.menuItemId || !dialogSlots.quantity || !dialogSlots.price) return null;

    const onAdd = () => {
      addToCart({
        id: dialogSlots.menuItemId,
        name: dialogSlots.menuItem || 'Pozycja',
        qty: dialogSlots.quantity,
        price: dialogSlots.price,
      });
      speakTts(`Dodałem do koszyka. Razem ${total()} zł`).catch(() => {});
    };

    const onCheckout = async () => {
      try {
        const resp = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: dialogSlots.restaurantId,
            items: getCart(),
          }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        clearCart();
        speakTts('Zamówienie złożone. Dziękuję!').catch(() => {});
      } catch (e) {
        console.warn('Checkout failed', e);
      }
    };

    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onAdd}>Dodaj do koszyka</button>
        <button onClick={onCheckout}>Zamów</button>
        <div style={{ marginLeft: 'auto' }}>Suma: {total().toFixed(2)} zł</div>
      </div>
    );
  }

  return (
    <section className="ff-hero">
      {/* Menu po lewej stronie */}
      {showMenu && (
        <div className="ff-menu-sidebar">
          <div className="ff-menu-header">
            <h3>🍽️ Menu</h3>
            <button
              className="ff-menu-close"
              onClick={() => setShowMenu(false)}
              aria-label="Zamknij menu"
            > 

            </button>
          </div>
          <div className="ff-menu-items">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="ff-menu-item"
                onClick={() => {
                  // Symuluj głosowe zamówienie
                  const itemName = item.name.toLowerCase();
                  speak(`Dodaję ${item.name} do koszyka`);
                  runQueryPipeline(itemName);
                }}
              >
                <div className="ff-menu-item-name">{item.name}</div>
                <div className="ff-menu-item-price">{item.price.toFixed(2)} zł</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stos: logo + szukajka */}
      <div className="ff-stack">
        <img
          className={`ff-logo ${recording ? "is-listening" : ""}`}
          src="/images/Freeflowlogo.png"
          alt="FreeFlow logo"
          role="button"
          tabIndex={0}
          aria-pressed={recording}
          aria-label="Naciśnij, aby mówić"
          onClick={handleMicClick}
          onKeyDown={handleLogoKeyDown}
        />

        {/* Pasek transkrypcji */}
        <div className="ff-transcription-bar" data-active={recording}>
          {recording && (finalText || interimText) ? (
            <>
              {finalText && <span className="ff-transcription-final">{finalText}</span>}
              {interimText && <span className="ff-transcription-interim">{interimText}</span>}
            </>
          ) : (
            <span className="ff-transcription-placeholder">Naciśnij logo i zacznij mówić...</span>
          )}
        </div>

        <VoiceDock
          messages={chat}
          value={query}
          onChange={setQuery}
          onSubmit={() => runQueryPipeline(query)}
          recording={recording}
          onMicClick={handleMicClick}
        />
      </div>

      {/* Chat bubbles */}
      {!!chat.length && (
        <div className="ff-chat" aria-live="polite">
          {chat.map((m) => (
            <div
              key={m.id}
              className={["ff-bubble", m.role === "assistant" ? "ff-bubble--assistant" : "ff-bubble--user"].join(" ")}
            >
              {m.text}
            </div>
          ))}
        </div>
      )}

      {/* Popup koszyka - pokazuje się na 2.5s */}
      {showCartPopup && (
        <div className="ff-cart-popup">
          <div className="ff-cart-popup-content">
            <div className="ff-cart-popup-icon">🛒</div>
            <div className="ff-cart-popup-text">
              <div className="ff-cart-popup-title">Dodano do koszyka!</div>
              <div className="ff-cart-popup-details">
                {getCart().length} pozycji - {total().toFixed(2)} zł
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Przyciski koszyka */}
      {renderOrderCta()}

      {/* Wyniki */}
      {error && <div className="ff-error" role="status">{error}</div>}
      {loading && <div className="ff-loading" role="status">Szukam...</div>}
      {!!hits.length && <ResultsList results={hits} />}

      {/* Restauracje po prawej stronie */}
      {showRestaurants && (
        <div className="ff-restaurants-sidebar">
          <div className="ff-restaurants-header">
            <h3>🏪 Restauracje w okolicy</h3>
            <button
              className="ff-restaurants-close"
              onClick={() => setShowRestaurants(false)}
              aria-label="Zamknij listę restauracji"
            >
              ✕
            </button>
          </div>
          <div className="ff-restaurants-list">
            {restaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="ff-restaurant-item"
                onClick={async () => {
                  // Wybierz restaurację i załaduj menu
                  setDialogSlots(prev => ({ ...prev, restaurantId: restaurant.id, restaurant: restaurant.name }));
                  await loadRestaurantMenu(restaurant.id);
                  setShowRestaurants(false);
                  speak(`Wybrałeś ${restaurant.name}. Ładuję menu...`);
                }}
              >
                <div className="ff-restaurant-name">{restaurant.name}</div>
                <div className="ff-restaurant-type">{restaurant.type || 'Restauracja'}</div>
                <div className="ff-restaurant-rating">
                  {restaurant.rating ? `⭐ ${restaurant.rating}` : '⭐ 4.5'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

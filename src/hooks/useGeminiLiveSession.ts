import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityHandling,
  EndSensitivity,
  GoogleGenAI,
  Modality,
  StartSensitivity,
  TurnCoverage,
  type Session,
  type LiveServerMessage,
} from '@google/genai';
import { startPCM16Stream } from '../lib/audioStream';
import { AudioPlayer } from '../lib/audioPlayback';
import { LIVE_FUNCTION_DECLARATIONS } from '../lib/liveToolDeclarations';
import {
  useGeminiFunctionRelay,
  type GeminiFunctionCall,
} from './useGeminiFunctionRelay';
import { useConversationStore } from '../store/useConversationStore';
import { useLiveUiSessionStore } from '../state/liveUiSession';
import { getApiUrl } from '../lib/config';
import { normalizeRestaurants, normalizeMenuItems, normalizeCartItems } from '../lib/normalizeData';
import { activeSessionMap } from '../state/ActiveSessionMap';

const DEFAULT_LIVE_MODEL =
  (import.meta.env.VITE_GEMINI_LIVE_MODEL as string | undefined) ||
  'gemini-2.5-flash-native-audio-preview-12-2025';
const LIVE_MODEL_OVERRIDE_KEY = 'ff_live_model_override';
const LIVE_MODEL_CHANGED_EVENT = 'freeflow:live-model-changed';

const MIC_MIME = 'audio/pcm;rate=16000';
const RECONNECT_DELAYS_MS = [1000, 2000, 5000] as const;
const AUTO_RECOVERY_GPS_KEY = 'ff_last_gps';
const AUTO_RECOVERY_GPS_TTL_MS = 30 * 60 * 1000;
const AUTO_RECOVERY_COOLDOWN_MS = 7000;
const LIVE_STALL_WARNING_MS = 9000;
const SESSION_RESUMPTION_HANDLE_KEY = 'ff_live_resumption_handle';

// ── Live Performance Instrumentation ──
const PERF_ENDPOINT = '/api/live/perf';
const PERF_LOG_HISTORY_KEY = 'ff_live_perf_log';

type PerfTiming = { stage: string; ms: number; metadata?: Record<string, unknown> };

function postPerfTimings(sessionId: string, model: string, timings: PerfTiming[]): void {
  if (!timings.length) return;
  const body = { entries: timings.map(t => ({ ...t, session_id: sessionId, model })) };
  try {
    const url = getApiUrl(PERF_ENDPOINT);
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
  } catch {}
  // Also persist locally for debugging
  try {
    const arr = JSON.parse(localStorage.getItem(PERF_LOG_HISTORY_KEY) || '[]');
    arr.push({ ts: new Date().toISOString(), sessionId: sessionId.slice(0, 8), timings });
    if (arr.length > 50) arr.splice(0, arr.length - 50);
    localStorage.setItem(PERF_LOG_HISTORY_KEY, JSON.stringify(arr));
  } catch {}
}

function saveResumptionHandle(handle: string): void {
  try { localStorage.setItem(SESSION_RESUMPTION_HANDLE_KEY, handle); } catch { /* noop */ }
}

function readResumptionHandle(): string | null {
  try { return localStorage.getItem(SESSION_RESUMPTION_HANDLE_KEY); } catch { return null; }
}

function clearResumptionHandle(): void {
  try { localStorage.removeItem(SESSION_RESUMPTION_HANDLE_KEY); } catch { /* noop */ }
}

const COGNITIVE_LOAD_PROMPT_KEY = 'ff_cognitive_load_prompt';
const COGNITIVE_LOAD_PAYLOAD_KEY = 'ff_cognitive_load_payload';
const COGNITIVE_LOAD_MAX_HISTORY = 20;

function reportPromptSize(sizeBytes: number): void {
  try {
    const entry = { ts: new Date().toISOString(), size: sizeBytes };
    const arr = JSON.parse(localStorage.getItem(COGNITIVE_LOAD_PROMPT_KEY) || '[]');
    arr.push(entry);
    if (arr.length > COGNITIVE_LOAD_MAX_HISTORY) arr.splice(0, arr.length - COGNITIVE_LOAD_MAX_HISTORY);
    localStorage.setItem(COGNITIVE_LOAD_PROMPT_KEY, JSON.stringify(arr));
    localStorage.setItem('ff_cognitive_load_prompt_last', String(sizeBytes));
  } catch { /* noop */ }
}

function reportPayloadSize(toolName: string, sizeBytes: number): void {
  try {
    const entry = { ts: new Date().toISOString(), tool: toolName, size: sizeBytes };
    const arr = JSON.parse(localStorage.getItem(COGNITIVE_LOAD_PAYLOAD_KEY) || '[]');
    arr.push(entry);
    if (arr.length > COGNITIVE_LOAD_MAX_HISTORY) arr.splice(0, arr.length - COGNITIVE_LOAD_MAX_HISTORY);
    localStorage.setItem(COGNITIVE_LOAD_PAYLOAD_KEY, JSON.stringify(arr));
    localStorage.setItem('ff_cognitive_load_payload_last', String(sizeBytes));
  } catch { /* noop */ }
}

const LIVE_VAD_CONFIG = {
  activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
  turnCoverage: TurnCoverage.TURN_INCLUDES_ONLY_ACTIVITY,
  automaticActivityDetection: {
    startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
    endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
    prefixPaddingMs: 120,
    silenceDurationMs: 500,
  },
} as const;

// Fix #5: ActiveSessionMap jako fundament spójności.
// liveSessionCache pozostaje jako backward-compat wrapper delegujący do activeSessionMap.
// Obie struktury są trzymane w sync: każdy .set() na liveSessionCache aktualizuje też activeSessionMap.
const _liveSessionMap = new Map<string, {
  cart: any;
  currentRestaurant: any;
  uiMode?: 'list' | 'restaurant' | 'checkout';
  conversationPhase: string;
  suggestedRestaurants: any[] | null;
  menuItems: any[] | null;
}>();

export const liveSessionCache = {
  get(sid: string) { return _liveSessionMap.get(sid); },
  set(sid: string, data: any) {
    _liveSessionMap.set(sid, data);
    // Mirror to ActiveSessionMap
    activeSessionMap.set(sid, {
      cartItems: data.cart?.items || data.cart || [],
      restaurantId: data.currentRestaurant?.id || null,
      restaurantName: data.currentRestaurant?.name || null,
      uiMode: data.uiMode as any,
      conversationPhase: data.conversationPhase || 'idle',
      menuItems: data.menuItems || [],
    });
  },
  has(sid: string) { return _liveSessionMap.has(sid); },
  delete(sid: string) { _liveSessionMap.delete(sid); activeSessionMap.delete(sid); },
} as const;

const BASE_SYSTEM_INSTRUCTION = [
  // GPS + DISCOVERY FIRST — primacy effect for native-audio models.
  // If this is buried, the model defaults to asking "gdzie jesteś?" before calling find_nearby.
  'ZASADA #1 (NIGDY NIE ŁAM): Nigdy nie pytaj użytkownika o miasto, dzielnicę, adres ani lokalizację. Backend ZAWSZE zna współrzędne GPS użytkownika. Gdy słyszysz prośbę o jedzenie — NATYCHMIAST wywołaj find_nearby bez parametru location. Nie mów "gdzie jesteś", "skąd zamawiasz", "podaj miasto". Po prostu wywołaj narzędzie.',

  // TOŻSAMOŚĆ + JĘZYK
  'Jesteś Amber — asystentka głosowa FreeFlow do zamawiania jedzenia. Mówisz po polsku naturalnie, ciepło i konkretnie. Używaj form żeńskich (znalazłam, dodałam, mogę). POLSKA ODMIANA LICZEBNIKÓW: 1 kotlet, 2-4 kotlety, 5+ kotletów. NIGDY "dwa kotleta" — zawsze "dwa kotlety". 1 porcja, 2-4 porcje, 5+ porcji. 1 danie, 2-4 dania, 5+ dań.',

  // ZASADA NADRZĘDNA
  'ZASADA NADRZĘDNA: Jeśli możesz wykonać akcję — ZRÓB TO NATYCHMIAST. Nigdy nie mów o akcji zamiast jej wykonywać. Nie używaj nazw narzędzi w mowie.',

  // TRYBY
  'DISCOVERY (brak restauracji): NATYCHMIAST wywołaj find_nearby. 1 wynik → pokaż menu. Wiele → podaj 2-3 opcje. Zero → szukaj szerzej.',
  'MENU (restauracja znana): wywołaj show_menu. Proponuj tylko pozycje faktycznie w menu — nigdy nie wymyślaj dań.',
  'ORDER: natychmiast dodaj do koszyka. Nie pytaj "czy na pewno". Po dodaniu zapytaj czy coś jeszcze.',
  'EDYCJA KOSZYKA: wykonuj od razu — update_cart_item_quantity, remove_item_from_cart, replace_cart_item.',

  // WIEDZA O DANYCH
  'Pozycje menu mają: spicy (ostre), is_vege (wege), tags (składniki), safety.removable (co MOŻNA usunąć). Koszyk ma special_instructions: { removed, extra, note }. Sprawdzaj safety.removable przed usunięciem składnika.',

  // STYL
  'Maks 2 zdania przed pytaniem. Nie czytaj list. Bądź zwięzła i naturalna.',

  // HARD BLOCK + GPS reminder (recency effect)
  'ZABRONIONE: "mogę sprawdzić", "pozwól że", "chwileczkę", "nie mam dostępu", "gdzie jesteś", "skąd zamawiasz", "podaj miasto", "jaka lokalizacja".',

].join(' ');

// LIVE_HARD_GUARDS removed — all business rules enforced by backend (ToolRouter, IVL, ICM, safety guards, singleCityPolicy)

const SILESIAN_STYLE_INSTRUCTION =
  'STYL ŚLĄSKI: godosz po śląsku naturalnie i swojsko. "ja" = tak, "niy" = nie, "kaj" = gdzie, "wiela" = ile, "bydzie" = będzie, "yno" = tylko. Używaj 1-2 zwrotów śląskich na wypowiedź.';

const SYSTEM_INSTRUCTION_STANDARD = BASE_SYSTEM_INSTRUCTION;
const SYSTEM_INSTRUCTION_SILESIAN = `${BASE_SYSTEM_INSTRUCTION} ${SILESIAN_STYLE_INSTRUCTION}`;

type LiveRuntimeConfig = {
  fetched: boolean;
  liveModel: string;
  speechStyle: 'standard' | 'silesian';
  amberPrompt: string;
  promptSource: string;
};

function normalizeSpeechStyle(value: unknown): 'standard' | 'silesian' {
  const normalized = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (normalized === 'silesian' || normalized === 'slaska' || normalized === 'slask') {
    return 'silesian';
  }
  return 'standard';
}

async function fetchLiveRuntimeConfig(): Promise<LiveRuntimeConfig> {
  const localLiveModelOverride = (() => {
    try {
      const v = String(localStorage.getItem(LIVE_MODEL_OVERRIDE_KEY) || '').trim();
      return v || '';
    } catch {
      return '';
    }
  })();
  const fallback: LiveRuntimeConfig = {
    fetched: false,
    liveModel: localLiveModelOverride || DEFAULT_LIVE_MODEL,
    speechStyle: 'standard',
    amberPrompt: '',
    promptSource: 'fallback',
  };
  try {
    const res = await fetch(getApiUrl('/api/voice/live/runtime-config'));
    if (!res.ok) return fallback;
    const json = await res.json().catch(() => null);
    if (!json || json.ok === false) return fallback;
    const backendModel = String(json.live_model || '').trim();
    const liveModel = localLiveModelOverride || backendModel || DEFAULT_LIVE_MODEL;
    const speechStyle = normalizeSpeechStyle(json.speech_style);
    const amberPrompt = typeof json.amber_prompt === 'string' ? json.amber_prompt.trim() : '';
    return {
      fetched: true,
      liveModel,
      speechStyle,
      amberPrompt,
      promptSource: String(json.prompt_source || (amberPrompt ? 'system_config:amber_prompt' : `speech_style:${speechStyle}`)),
    };
  } catch {
    return fallback;
  }
}

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

function normalizeSpeechToken(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readRecentGpsHint(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem(AUTO_RECOVERY_GPS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: unknown; lng?: unknown; ts?: unknown };
    const lat = Number(parsed?.lat);
    const lng = Number(parsed?.lng);
    const ts = Number(parsed?.ts);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(ts)) return null;
    if (Date.now() - ts > AUTO_RECOVERY_GPS_TTL_MS) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

function looksLikeLocationRequest(text: string): boolean {
  const normalized = normalizeSpeechToken(text);
  if (!normalized) return false;
  const mentionsLocation = /\b(miasto|kod pocztowy|lokalizacj|gdzie mieszkasz|gdzie jestes)\b/.test(normalized);
  const asksForInput = /\b(podaj|potrzebuje|musze znac|zebym mogla|zeby moc|zebym mogla zamowic)\b/.test(normalized);
  return mentionsLocation && asksForInput;
}

function looksLikeDiscoveryUserIntent(text: string): boolean {
  const normalized = normalizeSpeechToken(text);
  if (!normalized) return false;
  return /\b(w poblizu|poblizu|blisko|obok|nearby|w okolicy|zamow|zamowic|restaurac|jedzeni|kuchni|pizza|kebab|pierog|sushi|lawasz)\b/.test(normalized);
}

function buildMenuSpeechHints(items: any[]): { highlights: string[]; proteins: string[]; sizes: string[] } {
  const safeItems = Array.isArray(items) ? items : [];
  const seenHighlights = new Set<string>();
  const highlights: string[] = [];
  const proteins = new Set<string>();
  const sizes = new Set<string>();

  for (const item of safeItems) {
    const rawName = String(item?.base_name || item?.name || '').trim();
    if (rawName) {
      const cleanedName = rawName
        .replace(/\b(XXL|XL|L|M|S)\b/gi, ' ')
        .replace(/\b(duza|duzy|mala|maly|standard|mega)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const display = cleanedName || rawName;
      const key = normalizeSpeechToken(display);
      if (key && !seenHighlights.has(key)) {
        seenHighlights.add(key);
        highlights.push(display);
      }
    }

    const variantFromDb = String(item?.size_or_variant || '').trim();
    const variantFromNameMatch = String(item?.name || '').match(/\b(XXL|XL|L|M|S)\b/i);
    const variantFromName = variantFromNameMatch?.[1] || '';
    const variant = (variantFromDb || variantFromName).trim();
    if (variant) sizes.add(variant.toUpperCase());

    const normalizedName = normalizeSpeechToken(item?.name || item?.base_name || '');
    if (!normalizedName) continue;
    if (/(kurczak|drobi|chicken)/.test(normalizedName)) proteins.add('drobiowe');
    if (/(wolow|beef)/.test(normalizedName)) proteins.add('wolowe');
    if (/(wieprz|karkow|pork)/.test(normalizedName)) proteins.add('wieprzowe');
    if (/(falafel|wege|weget|vege|vegan)/.test(normalizedName)) proteins.add('wege');
  }

  return {
    highlights: highlights.slice(0, 8),
    proteins: Array.from(proteins).slice(0, 4),
    sizes: Array.from(sizes).slice(0, 4),
  };
}

function buildMenuCategoryIndex(items: any[]): { category: string; count: number; samples: string[] }[] {
  const buckets = new Map<string, { count: number; samples: Set<string> }>();
  for (const item of Array.isArray(items) ? items : []) {
    const category = String(item?.category || 'Inne').trim() || 'Inne';
    const name = String(item?.base_name || item?.name || '').trim();
    if (!buckets.has(category)) {
      buckets.set(category, { count: 0, samples: new Set<string>() });
    }
    const bucket = buckets.get(category)!;
    bucket.count += 1;
    if (name && bucket.samples.size < 3) {
      bucket.samples.add(name);
    }
  }

  return Array.from(buckets.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      samples: Array.from(data.samples),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function buildMenuCategoryVariants(items: any[]): { category: string; count: number; items: string[] }[] {
  const buckets = new Map<string, string[]>();
  for (const item of Array.isArray(items) ? items : []) {
    const category = String(item?.category || 'Inne').trim() || 'Inne';
    const name = String(item?.base_name || item?.name || '').trim();
    if (!buckets.has(category)) {
      buckets.set(category, []);
    }
    const list = buckets.get(category)!;
    if (name && !list.includes(name)) {
      list.push(name);
    }
  }

  return Array.from(buckets.entries())
    .map(([category, names]) => ({
      category,
      count: names.length,
      items: names.slice(0, 8),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function compactToolResponse(
  toolName: string,
  response: Record<string, unknown>,
): Record<string, unknown> {
  const responseIntent = String(response.intent || '').trim();
  const liveToolMeta = ((response.meta as Record<string, unknown> | undefined)?.liveTool || {}) as Record<string, unknown>;
  const cartBefore = (liveToolMeta.cartBefore || {}) as Record<string, unknown>;
  const cartAfter = (liveToolMeta.cartAfter || {}) as Record<string, unknown>;
  const cartBeforeCount = Number(cartBefore.items);
  const cartAfterCount = Number(cartAfter.items);
  const cartBeforeTotal = Number(cartBefore.total);
  const cartAfterTotal = Number(cartAfter.total);
  const cartChangedByMeta =
    (Number.isFinite(cartBeforeCount) && Number.isFinite(cartAfterCount) && cartBeforeCount !== cartAfterCount)
    || (Number.isFinite(cartBeforeTotal) && Number.isFinite(cartAfterTotal) && cartBeforeTotal !== cartAfterTotal);

  const compact: Record<string, unknown> = {
    reply: (response.reply || response.text || '') as string,
    ok: response.ok !== false,
  };
  if (responseIntent) compact.intent = responseIntent;

  switch (toolName) {
    case 'find_nearby': {
      const list = (response.restaurants as any[] | undefined) ?? [];
      // Keep payload lean to reduce voice generation latency after tool response.
      compact.restaurants = list.slice(0, 5).map((x: any) => ({
        id: x.id,
        name: x.name,
        cuisine: x.cuisine_type || x.cuisine || x.category || null,
        rating: x.maps_rating ?? x.rating ?? null,
        ratingsTotal: x.maps_ratings_total ?? null,
        distance: x.distance ?? null,
        city: x.city || null,
      }));
      break;
    }
    case 'show_menu':
    case 'select_restaurant': {
      const fullMenu = Array.isArray(response.menu) ? (response.menu as any[]) : [];
      const shortlist = Array.isArray(response.menuItems) ? (response.menuItems as any[]) : [];
      const items = fullMenu.length > 0 ? fullMenu : shortlist;
      const hints = buildMenuSpeechHints(items);
      const menuItemsLimit = items.length <= 16 ? items.length : 12;
      compact.menuItems = items.slice(0, menuItemsLimit).map((x: any) => ({
        id: x.id,
        name: x.base_name || x.name,
        price: x.price ?? null,
        category: x.category ?? null,
        tags: Array.isArray(x.item_tags) ? x.item_tags : (Array.isArray(x.tags) ? x.tags : []),
        variant: x.size_or_variant || null,
        spicy: !!x.spicy,
        is_vege: !!x.is_vege,
        desc: typeof x.description === 'string' ? x.description.substring(0, 80) : null,
        dietary_flags: Array.isArray(x.dietary_flags) ? x.dietary_flags : [],
        safety: x.safety_data && typeof x.safety_data === 'object' ? {
          removable: Array.isArray(x.safety_data.removable_ingredients) ? x.safety_data.removable_ingredients : [],
        } : null,
      }));
      compact.menuTotal = items.length;
      compact.menuCoverage = fullMenu.length > 0 ? 'full' : 'shortlist';
      compact.menuCategoryIndex = buildMenuCategoryIndex(items).slice(0, 6);
      compact.menuHighlights = hints.highlights.slice(0, 5);
      compact.menuProteins = hints.proteins;
      compact.menuSizes = hints.sizes;
      if (hints.sizes.length >= 2) {
        compact.followUp = `Zapytaj naturalnie o wariant, np: porcja ${hints.sizes[0]} czy ${hints.sizes[1]}?`;
      }
      if (hints.proteins.length > 0) {
        compact.menuSummary = `W karcie sa rozne rodzaje, m.in. ${hints.proteins.join(', ')}.`;
      }
      break;
    }
    case 'confirm_add_to_cart':
    case 'get_cart_state': {
      const cart = (response.cart as any) ?? {};
      compact.cartCount = Array.isArray(cart.items) ? cart.items.length : 0;
      compact.cartTotal = cart.total ?? null;
      compact.cartItems = Array.isArray(cart.items)
        ? cart.items.map((i: any) => ({ name: i.name, qty: i.qty ?? i.quantity ?? 1, price: i.price ?? i.price_pln ?? null, tags: i.item_tags || [], spicy: !!i.spicy, is_vege: !!i.is_vege, dietary_flags: i.dietary_flags || [], ...(i.special_instructions ? { special_instructions: i.special_instructions } : {}) }))
        : [];
      break;
    }
    case 'update_cart_item_quantity':
    case 'remove_item_from_cart':
    case 'replace_cart_item':
    case 'add_item_to_cart':
    case 'add_items_to_cart': {
      const cart = (response.cart as any) ?? {};
      const mutationObserved = cartChangedByMeta || Boolean(liveToolMeta.cartChanged);
      compact.cartCount = Array.isArray(cart.items) ? cart.items.length : 0;
      compact.cartTotal = cart.total ?? null;
      compact.cartChanged = mutationObserved;
      compact.cartItems = Array.isArray(cart.items)
        ? cart.items.map((i: any) => ({ name: i.name, qty: i.qty ?? i.quantity ?? 1, price: i.price ?? i.price_pln ?? null, tags: i.item_tags || [], spicy: !!i.spicy, is_vege: !!i.is_vege, dietary_flags: i.dietary_flags || [], ...(i.special_instructions ? { special_instructions: i.special_instructions } : {}) }))
        : [];

      const clarifyNotAdded =
        responseIntent === 'clarify_order'
        || liveToolMeta.clarifyNotAdded === true
        || (!mutationObserved && (toolName === 'add_item_to_cart' || toolName === 'add_items_to_cart'));

      compact.actionStatus = clarifyNotAdded ? 'not_added_clarify' : 'added';
      if (clarifyNotAdded) {
        compact.mustClarify = true;
      }
      break;
    }
    default:
      break;
  }

  return compact;
}

function applyToolResultToStore(
    toolName: string,
    response: Record<string, unknown>,
): void {
    const state = useConversationStore.getState();
    const restaurants = normalizeRestaurants(
        (response.restaurants as any[] | undefined) || (response.context as any)?.last_restaurants_list || null,
    );
    const menuItems = normalizeMenuItems(
        (response.menu as any[] | undefined)
        || (response.menuItems as any[] | undefined)
        || (response.context as any)?.menuItems
        || (response.context as any)?.menu_items
        || (response.context as any)?.last_menu
        || (response.context as any)?.lastMenu
        || null,
    );

    const reply = String(response.reply || response.text || '');
    const nextIntent = String(response.intent || state.lastIntent || '');
    const nextPhase = String((response.context as any)?.conversationPhase || response.phase || state.conversationPhase || '');

    let nextUiMode = state.uiMode;
    if (nextIntent === 'find_nearby') {
        nextUiMode = 'list';
    } else if (
        nextIntent === 'select_restaurant'
        || nextIntent === 'show_menu'
        || nextIntent === 'menu_request'
        || nextIntent === 'show_restaurant_menu'
        || nextIntent === 'view_menu'
        || toolName === 'show_menu'
    ) {
        nextUiMode = 'restaurant';
    } else if (nextIntent === 'open_checkout') {
        nextUiMode = 'checkout';
    }

    const nextCurrentRestaurant =
        (response.context as any)?.currentRestaurant
        || (response.context as any)?.current_restaurant
        || response.currentRestaurant
        || response.restaurant
        || state.currentRestaurant;

    const hasMenuItems = Array.isArray(menuItems) && menuItems.length > 0;
    const isMenuSurfaceIntent =
        nextIntent === 'show_menu'
        || nextIntent === 'menu_request'
        || nextIntent === 'show_restaurant_menu'
        || nextIntent === 'view_menu';
    const isMenuSurfaceTool = toolName === 'show_menu' || toolName === 'select_restaurant';
    if (hasMenuItems && (isMenuSurfaceIntent || isMenuSurfaceTool || nextCurrentRestaurant)) {
        nextUiMode = 'restaurant';
    }

    const restaurantCandidateList = (restaurants && restaurants.length > 0)
        ? restaurants
        : (Array.isArray(state.suggestedRestaurants) ? state.suggestedRestaurants : []);

    // Enrich currentRestaurant with full data from suggested list
    let enrichedRestaurant = nextCurrentRestaurant || null;
    if (enrichedRestaurant && restaurantCandidateList.length > 0) {
        const restaurantId = String(enrichedRestaurant.id ?? '').trim();
        const restaurantName = String(enrichedRestaurant.display_name || enrichedRestaurant.name || '')
            .toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();
        const matched = (restaurantId
            ? restaurantCandidateList.find((c: any) => String(c?.id ?? '').trim() === restaurantId)
            : undefined)
            || restaurantCandidateList.find((c: any) => {
                const cn = String(c?.display_name || c?.name || '')
                    .toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();
                return cn && restaurantName && (cn === restaurantName || cn.includes(restaurantName) || restaurantName.includes(cn));
            });
        if (matched) enrichedRestaurant = { ...matched, ...enrichedRestaurant };
    }

    // Fix #5: Backend cart jest "Prawdą Absolutną". Full override — bez fallbacku do state.cart
    // który mógłby być niezsynchronizowany po przejściach menu↔checkout.
    // Fix #5.5: normalizeCartItems wymusza identyczną strukturę każdego przedmiotu
    // (id, name, price_pln, qty) — eliminuje "widma" z brakującymi kluczami.
    const backendCartRaw = (response.meta as any)?.cart || response.cart;
    const backendCart = normalizeCartItems(backendCartRaw) || backendCartRaw;
    const backendCartHash = (response.meta as any)?.cartHash || (response as any).cartHash || '';
    const cartForStore = backendCart || state.cart; // fallback tylko gdy backend nie wysłał wcale

    const hasFreshMenu = menuItems && menuItems.length > 0;
    const hasFreshRestaurants = restaurants && restaurants.length > 0;

    useConversationStore.setState((prev) => ({
        isThinking: false,
        error: null,
        lastResponse: reply,
        lastFullResponse: response,
        uiMode: nextUiMode,
        conversationPhase: nextPhase || state.conversationPhase,
        currentRestaurant: enrichedRestaurant,
        pendingOrder: (response.context as any)?.pendingOrder || null,
        cart: cartForStore,
        cartSyncKey: backendCart ? prev.cartSyncKey + 1 : prev.cartSyncKey,
        lastIntent: nextIntent || state.lastIntent,
        lastSource: ((response.meta as any)?.source as string) || 'live_http_relay',
        suggestedRestaurants: hasFreshRestaurants ? restaurants : state.suggestedRestaurants,
        menuItems: hasFreshMenu ? menuItems : state.menuItems,
    }));

    // Mirror do ActiveSessionMap — Level 2 Memory
    if (backendCart) {
        activeSessionMap.updateFromResponse(
            String(state.sessionId || ''),
            response,
            nextUiMode,
            nextPhase || state.conversationPhase,
        );
        if (backendCartHash) {
            const hashOk = activeSessionMap.verifyCartHash(String(state.sessionId || ''), backendCartHash);
            if (!hashOk) {
                console.warn(`[LIVE_CART_HASH] ❌ MISMATCH — frontend hash=${activeSessionMap.getCartHash(String(state.sessionId || ''))} backend hash=${backendCartHash} — FORCE OVERRIDE applied`);
            }
        }
    }

    // Fix #6.4: Adopt newSessionId after ORDER_CONFIRMED (session cleanup)
    const responseNewSessionId = (response as any)?.newSessionId;
    const responseConversationClosed = !!(response as any)?.conversationClosed;
    if (responseNewSessionId && responseConversationClosed) {
        const storeAfter = useConversationStore.getState();
        if (storeAfter.sessionId !== responseNewSessionId) {
            useConversationStore.setState({ sessionId: responseNewSessionId });
            localStorage.setItem('amber-session-id', responseNewSessionId);
        }
    }
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
  const modelSwitchRestartRef = useRef(false);
  const latestUserTranscriptRef = useRef<string | null>(null);
  const autoNearbyRecoveryInFlightRef = useRef(false);
  const autoNearbyRecoveryLastTsRef = useRef(0);
  const lastToolResponseSentAtRef = useRef<number | null>(null);
  const stallWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Marks that the close was triggered intentionally (user stop / cleanup) â€” suppress reconnect
  const intentionalCloseRef = useRef(false);
  const sessionResumptionHandleRef = useRef<string | null>(readResumptionHandle());
  // Fix #4: stable ref so start() closure always sees current sessionId
  const sessionIdRef = useRef(propSessionId);
  useEffect(() => { sessionIdRef.current = propSessionId; }, [propSessionId]);

  const { relay } = useGeminiFunctionRelay({
    wsRef,
    getLatestTranscript: () => latestUserTranscriptRef.current,
    takeLatestTranscript: () => {
      const value = latestUserTranscriptRef.current;
      latestUserTranscriptRef.current = null;
      return value;
    },
    getSessionId: () => sessionIdRef.current,
    // Recover restaurant ID even after manual cart clear.
    // Priority: currentRestaurant → lastFullResponse context → response restaurant → suggestedRestaurants
    getCurrentRestaurantId: () => {
      const state = useConversationStore.getState();
      if (state.currentRestaurant?.id) return String(state.currentRestaurant.id);
      // Recovery from last full response (persists across tool calls)
      const lfr = state.lastFullResponse as Record<string, any> | null;
      const ctxRestaurantId = lfr?.context?.currentRestaurant?.id
        || lfr?.context?.current_restaurant?.id
        || lfr?.restaurant?.id
        || lfr?.meta?.restaurant?.id;
      if (ctxRestaurantId) return String(ctxRestaurantId);
      // Recovery from suggestedRestaurants when menu is visible
      if (Array.isArray(state.suggestedRestaurants) && state.suggestedRestaurants.length > 0) {
        return String(state.suggestedRestaurants[0]?.id ?? '') || undefined;
      }
      // Recovery from live session cache — survives manual UI resets
      const sid = sessionIdRef.current;
      if (sid) {
        const cached = liveSessionCache.get(sid);
        if (cached?.currentRestaurant?.id) return String(cached.currentRestaurant.id);
      }
      // Fix #5: Deep fallback — ActiveSessionMap (Level 2 Memory)
      if (sid) {
        const deep = activeSessionMap.get(sid);
        if (deep?.restaurantId) return String(deep.restaurantId);
      }
      return undefined;
    },
  });

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearStallWatchdog = useCallback(() => {
    if (stallWatchdogRef.current) {
      clearTimeout(stallWatchdogRef.current);
      stallWatchdogRef.current = null;
    }
  }, []);

  const armStallWatchdog = useCallback((reason: string) => {
    clearStallWatchdog();
    stallWatchdogRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      useLiveUiSessionStore.getState().setProcessing('Nadal przetwarzam, chwila...');
      console.warn(`[LIVE_STALL] no model/tool response >${LIVE_STALL_WARNING_MS}ms reason=${reason}`);
    }, LIVE_STALL_WARNING_MS);
  }, [clearStallWatchdog]);

  const cleanupRuntime = useCallback((closeSession: boolean) => {
    clearStallWatchdog();
    stopMicRef.current?.();
    stopMicRef.current = null;

    if (closeSession && sessionRef.current) {
      try { sessionRef.current.close(); } catch { /* noop */ }
    }
    sessionRef.current = null;

    playerRef.current.stop();
    activeRef.current = false;
    setIsActive(false);
  }, [clearStallWatchdog]);

  const stop = useCallback(() => {
    if (stopInFlightRef.current) return;
    stopInFlightRef.current = true;
    try {
      intentionalCloseRef.current = true;   // suppress reconnect in onclose
      desiredActiveRef.current = false;
      reconnectAttemptRef.current = 0;
      clearReconnectTimer();
      setReconnectHalted(false);
      latestUserTranscriptRef.current = null;
      autoNearbyRecoveryInFlightRef.current = false;
      autoNearbyRecoveryLastTsRef.current = 0;
      lastToolResponseSentAtRef.current = null;
      clearStallWatchdog();
      sessionResumptionHandleRef.current = null;
      clearResumptionHandle();
      cleanupRuntime(true);
      setError(null);
      useLiveUiSessionStore.getState().setPaused();
    } finally {
      stopInFlightRef.current = false;
      startInFlightRef.current = false;
    }
  }, [cleanupRuntime, clearReconnectTimer, clearStallWatchdog]);

  const start = useCallback(async () => {
    if (!enabled) return;

    // Fix #2: singleton guard â€” check sessionRef too
    if (sessionRef.current || activeRef.current || startInFlightRef.current) {
      // session already active â€“ skip start');
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_LIVE_API_KEY as string | undefined;
    if (!apiKey) {
      setError('VITE_GEMINI_LIVE_API_KEY not configured');
      return;
    }

    const runtimeConfig = await fetchLiveRuntimeConfig();
    const activeModel = runtimeConfig.liveModel || DEFAULT_LIVE_MODEL;
    if (!activeModel) {
      setError('LIVE model not configured');
      return;
    }

    const sid = sessionIdRef.current ?? 'unknown';
    latestUserTranscriptRef.current = null;
    autoNearbyRecoveryInFlightRef.current = false;
    autoNearbyRecoveryLastTsRef.current = 0;
    lastToolResponseSentAtRef.current = null;
    desiredActiveRef.current = true;
    setError(null);
    setReconnectHalted(false);
    startInFlightRef.current = true;
    useLiveUiSessionStore.getState().setProcessing('Lacze z sesja LIVE...');
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

    // Runtime prompt precedence:
    // 1) system_config.amber_prompt (global from admin panel)
    // 2) speech_style-derived default instruction
    // 3) localStorage fallback only when backend config is unavailable
    const defaultInstruction = runtimeConfig.speechStyle === 'silesian'
      ? SYSTEM_INSTRUCTION_SILESIAN
      : SYSTEM_INSTRUCTION_STANDARD;
    const GPS_SAFETY_PREFIX =
      'ZASADA #1: NIGDY nie pytaj o miasto, lokalizację ani adres. Backend ma GPS.';
    const hasGpsRule = (s: string) =>
      /\b(lokalizacj|GPS|współrzędn|miasto.*pytaj|pytaj.*miasto)\b/i.test(s);

    let activeInstruction = runtimeConfig.amberPrompt || defaultInstruction;
    if (!runtimeConfig.amberPrompt && !runtimeConfig.fetched) {
      try {
        const stored = localStorage.getItem('amber_live_prompt');
        if (stored && stored.trim().length > 40) {
          activeInstruction = stored.trim();
        }
      } catch { /* noop */ }
    }
    // Safety net: if the active instruction (from admin panel or localStorage)
    // does not contain GPS rule, prepend it. Admin prompts saved before
    // 2026-05-09 may lack this critical guard.
    if (!hasGpsRule(activeInstruction)) {
      activeInstruction = GPS_SAFETY_PREFIX + ' ' + activeInstruction;
    }
    // LIVE_HARD_GUARDS removed — backend enforces all rules deterministically

    try {
      cleanupRuntime(true);
      const ai = new GoogleGenAI({ apiKey });
      const player = playerRef.current;

      let frameCount = 0;
      let lastAudioFrameAt = 0;
      let lastTranscriptAt = 0;
      let lastToolCallAt = 0;
      const perfTimings: PerfTiming[] = [];
      let perfModel = runtimeConfig.liveModel || DEFAULT_LIVE_MODEL;

      const flushPerf = () => {
        if (!perfTimings.length) return;
        const sid = sessionIdRef.current || 'unknown';
        const e2e = perfTimings.length >= 3
          ? perfTimings[perfTimings.length - 1].ms - (lastAudioFrameAt || perfTimings[0].ms)
          : 0;
        if (e2e > 0) perfTimings.push({ stage: 'total_e2e', ms: e2e });
        console.log(`[LivePerf] ${sid.slice(0,8)} ${perfTimings.map(t => `${t.stage}=${t.ms}ms`).join(' | ')}`);
        postPerfTimings(sid, perfModel, [...perfTimings]);
        perfTimings.length = 0;
      };

      const stopMic = await startPCM16Stream((pcm16: ArrayBuffer) => {
        if (!sessionRef.current || !activeRef.current) return;
        frameCount += 1;
        lastAudioFrameAt = Date.now();

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
        const possibleTranscript =
          (msg as any)?.serverContent?.inputTranscription?.text
          || (msg as any)?.serverContent?.inputTranscription?.transcript
          || (msg as any)?.serverContent?.inputTranscript?.text
          || null;
        if (typeof possibleTranscript === 'string' && possibleTranscript.trim()) {
          const now = Date.now();
          if (lastAudioFrameAt && !lastTranscriptAt) {
            perfTimings.push({ stage: 'vad_gap', ms: now - lastAudioFrameAt });
          }
          lastTranscriptAt = now;
          const normalizedTranscript = possibleTranscript.trim();
          latestUserTranscriptRef.current = normalizedTranscript;
          const liveUiStore = useLiveUiSessionStore.getState();
          liveUiStore.setTranscript('user', normalizedTranscript);
          liveUiStore.setProcessing('Analizuje...');
          armStallWatchdog('transcript_final');
        }

        if (msg.toolCall?.functionCalls?.length) {
          lastToolCallAt = Date.now();
          if (lastTranscriptAt) {
            perfTimings.push({ stage: 'transcript_to_toolcall', ms: lastToolCallAt - lastTranscriptAt });
          }
          useLiveUiSessionStore.getState().setProcessing('Analizuje...');
          armStallWatchdog('tool_call_pending');
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
                const relayStart = Date.now();
                const result = await relay(geminiCall);
                const relayMs = Date.now() - relayStart;
                const backendMs = (result.response as any)?.backend_ms;
                perfTimings.push({ stage: 'http_roundtrip', ms: relayMs });
                if (typeof backendMs === 'number') {
                  perfTimings.push({ stage: 'backend_execution', ms: backendMs, metadata: { tool: result.name } });
                }
                // HTTP fallback bridge: when WS is not connected, sync structured
                // response to useConversationStore so the UI renders menus, cart, etc.
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                  applyToolResultToStore(
                    result.name,
                    (result.response ?? {}) as Record<string, unknown>,
                  );
                }
                const compactStart = Date.now();
                const compact = compactToolResponse(
                  result.name,
                  (result.response ?? {}) as Record<string, unknown>,
                );
                perfTimings.push({ stage: 'compact_response', ms: Date.now() - compactStart });
                const payloadBytes = new TextEncoder().encode(JSON.stringify(compact)).length;
                reportPayloadSize(result.name, payloadBytes);
                return {
                  id: fc.id ?? '',
                  name: result.name,
                  response: compact,
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
              lastToolResponseSentAtRef.current = Date.now();
              session.sendToolResponse({ functionResponses: responses });
              armStallWatchdog('tool_response_sent');
            } catch {
              // noop
            }
          });
          return;
        }

        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            const textPart = String((part as any)?.text || '').trim();
            if (textPart) {
              clearStallWatchdog();
              useLiveUiSessionStore.getState().setTranscript('assistant', textPart);
              window.dispatchEvent(new CustomEvent('freeflow:live-assistant-part', {
                detail: {
                  sessionId: sid,
                  text: textPart,
                },
              }));

              const userTranscript = latestUserTranscriptRef.current || '';
              const hasRecentGps = !!readRecentGpsHint();
              const now = Date.now();
              const canAutoRecover =
                hasRecentGps
                && looksLikeLocationRequest(textPart)
                && looksLikeDiscoveryUserIntent(userTranscript)
                && !autoNearbyRecoveryInFlightRef.current
                && (now - autoNearbyRecoveryLastTsRef.current) > AUTO_RECOVERY_COOLDOWN_MS;

              if (canAutoRecover) {
                autoNearbyRecoveryInFlightRef.current = true;
                autoNearbyRecoveryLastTsRef.current = now;
                useLiveUiSessionStore.getState().setProcessing('Sprawdzam miejsca w poblizu...');
                void relay({
                  id: `auto_find_nearby_${now}`,
                  name: 'find_nearby',
                  args: {},
                })
                  .catch(() => {
                    // auto-recovery relay failed — silent
                  })
                  .finally(() => {
                    autoNearbyRecoveryInFlightRef.current = false;
                  });
              }
            }
            const blob = (part as { inlineData?: { data?: string; mimeType?: string } }).inlineData;
            if (blob?.data && blob.mimeType?.startsWith('audio/')) {
              if (lastToolResponseSentAtRef.current) {
                perfTimings.push({ stage: 'tts_generation', ms: Date.now() - lastToolResponseSentAtRef.current });
                flushPerf();
                lastToolResponseSentAtRef.current = null;
              }
              clearStallWatchdog();
              player.enqueueBase64(blob.data);
            }
          }
        }

        if (msg.serverContent?.interrupted) {
          clearStallWatchdog();
          player.stop();
        }

        const sru = (msg as any).serverContent?.sessionResumptionUpdate;
        if (sru?.resumable && sru.newHandle) {
          sessionResumptionHandleRef.current = sru.newHandle;
          saveResumptionHandle(sru.newHandle);
        }

        const goAway = (msg as any).serverContent?.goAway;
        if (goAway) {
          console.log('[LIVE] GoAway received — reconnect with resumption handle pending');
        }
      };

      reportPromptSize(new TextEncoder().encode(activeInstruction).length);

      const session = await ai.live.connect({
        model: activeModel,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: activeInstruction,
          realtimeInputConfig: LIVE_VAD_CONFIG,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Aoede' },
            },
          },
          tools: [{ functionDeclarations: LIVE_FUNCTION_DECLARATIONS }],
          ...(sessionResumptionHandleRef.current
            ? { sessionResumption: { transparent: true, handle: sessionResumptionHandleRef.current } }
            : {}),
        },
        callbacks: {
          onopen: () => {
            reconnectAttemptRef.current = 0;
            clearReconnectTimer();
            clearStallWatchdog();
            setReconnectHalted(false);
            useLiveUiSessionStore.getState().setListening('Slucham...');
            // Report actual frontend model to backend metrics snapshot
            const relaySocket = wsRef.current;
            if (relaySocket && relaySocket.readyState === WebSocket.OPEN) {
              try {
                relaySocket.send(JSON.stringify({
                  type: 'client_metrics',
                  liveModel: activeModel,
                }));
              } catch {
                // noop
              }
            }
            // Fix #4: restore cached state on reconnect
            const cached = liveSessionCache.get(sid);
            if (cached) {
              useConversationStore.setState(cached);
            }
          },
          onmessage: handleMessage,
          onerror: (e: ErrorEvent) => {
            const message = e.message || 'gemini_live_error';
            setError(message);
            useLiveUiSessionStore.getState().setPaused(`Wstrzymano LIVE: ${message}`);
            cleanupRuntime(false);
            scheduleReconnect();
          },
          onclose: (event?: { code?: number; reason?: string }) => {
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
            cleanupRuntime(false);
            // Do NOT reconnect on intentional close (user stop / cleanup / 1000 / 1001 equivalent)
            if (wasIntentional || !desiredActiveRef.current) {
              useLiveUiSessionStore.getState().setPaused();
              return;
            }
            useLiveUiSessionStore.getState().setProcessing('Wznawiam sesje LIVE...');
            scheduleReconnect();
          },
        },
      });

      sessionRef.current = session;
      activeRef.current = true;
      setIsActive(true);
      useLiveUiSessionStore.getState().setListening('Slucham...');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'failed_to_start';
      setError(msg);
      useLiveUiSessionStore.getState().setPaused(`Wstrzymano LIVE: ${msg}`);
      cleanupRuntime(false);
      scheduleReconnect();
    } finally {
      startInFlightRef.current = false;
    }
  }, [enabled, relay, cleanupRuntime, clearReconnectTimer, clearStallWatchdog, armStallWatchdog]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onLiveModelChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ model?: string; previousModel?: string; source?: string }>).detail;
      const nextModel = String(detail?.model || '').trim();
      const previousModel = String(detail?.previousModel || '').trim();
      if (!nextModel || (previousModel && nextModel === previousModel)) return;

      const isSessionActive = Boolean(activeRef.current || sessionRef.current || desiredActiveRef.current);
      if (!isSessionActive) return;
      if (modelSwitchRestartRef.current) return;
      modelSwitchRestartRef.current = true;

      stop();
      window.setTimeout(() => {
        void start().finally(() => {
          modelSwitchRestartRef.current = false;
        });
      }, 200);
    };

    window.addEventListener(LIVE_MODEL_CHANGED_EVENT, onLiveModelChanged as EventListener);
    return () => {
      window.removeEventListener(LIVE_MODEL_CHANGED_EVENT, onLiveModelChanged as EventListener);
    };
  }, [start, stop]);

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;   // unmount = intentional, suppress reconnect
      desiredActiveRef.current = false;
      clearReconnectTimer();
      sessionResumptionHandleRef.current = null;
      cleanupRuntime(true);
      playerRef.current.close();
    };
  }, [cleanupRuntime, clearReconnectTimer]);

  return { start, stop, isActive, error, reconnectHalted };
}

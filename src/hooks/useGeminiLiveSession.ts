import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityHandling,
  EndSensitivity,
  GoogleGenAI,
  Modality,
  StartSensitivity,
  ThinkingLevel,
  TurnCoverage,
  type Session,
  type LiveServerMessage,
} from '@google/genai';
import { startPCM16Stream } from '../lib/audioStream';
import { getAccessToken } from '../lib/supabase';
import { AudioPlayer } from '../lib/audioPlayback';
import { LIVE_FUNCTION_DECLARATIONS } from '../lib/liveToolDeclarations';
import { composeLiveSystemInstruction } from '../lib/liveSystemInstruction';
import {
  extractFoodDiscoveryQuery,
  looksLikeFoodDiscoveryFailure,
  looksLikeFoodDiscoveryIntent,
} from '../lib/liveDiscoveryRecovery';
import {
  useGeminiFunctionRelay,
  type GeminiFunctionCall,
} from './useGeminiFunctionRelay';
import { useConversationStore } from '../store/useConversationStore';
import { useLiveUiSessionStore } from '../state/liveUiSession';
import { getApiUrl } from '../lib/config';
import { normalizeRestaurants, normalizeMenuItems, normalizeCartItems } from '../lib/normalizeData';
import { activeSessionMap } from '../state/ActiveSessionMap';
import { generateTurnId, logBridge, postBridgeTelemetry } from '../lib/interactionBridge';
import { getActiveDemoContextPayload } from '../lib/demoContext';
import { createSessionClosureLatch } from '../lib/liveSessionClosure';

const DEFAULT_LIVE_MODEL =
  (import.meta.env.VITE_GEMINI_LIVE_MODEL as string | undefined) ||
  'gemini-2.5-flash-native-audio-preview-12-2025';
const LIVE_MODEL_OVERRIDE_KEY = 'ff_live_model_override';
const LIVE_MODEL_CHANGED_EVENT = 'freeflow:live-model-changed';

const MIC_MIME = 'audio/pcm;rate=16000';
const RECONNECT_DELAYS_MS = [1000, 2000, 5000] as const;
const RECONNECT_STABLE_RESET_MS = 15_000;
const AUTO_RECOVERY_COOLDOWN_MS = 7000;
const LIVE_STALL_WARNING_MS = 9000;
const SESSION_RESUMPTION_HANDLE_KEY = 'ff_live_resumption_handle';

// ── Live Performance Instrumentation ──
const PERF_ENDPOINT = '/api/live/perf';
const PERF_LOG_HISTORY_KEY = 'ff_live_perf_log';

type PerfTiming = { stage: string; ms: number; metadata?: Record<string, unknown> };

function postPerfTimings(sessionId: string, model: string, timings: PerfTiming[], turnId?: string | null): void {
  if (!timings.length) return;
  const body = { entries: timings.map(t => ({ ...t, session_id: sessionId, model, turn_id: turnId || undefined })) };
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

function postLiveDiag(stage: string, sessionId: string | null | undefined, turnId: string | null | undefined, metadata: Record<string, unknown>, ms = 0): void {
  try {
    postBridgeTelemetry([{
      stage,
      session_id: String(sessionId || 'unknown'),
      turn_id: String(turnId || ''),
      ms,
      metadata,
    }]);
  } catch {
    // diagnostics must never affect live flow
  }
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
  'PYTANIA O DANIE: „czy X to Y?”, „co to jest?”, pytania o skład, alergeny, cenę i dostępność są informacyjne. Odpowiedz na podstawie aktualnego menu. Nie dodawaj nic do koszyka, dopóki użytkownik wyraźnie nie powie „dodaj”, „zamawiam”, „poproszę” albo nie poda konkretnej ilości w turze zamówienia.',
  // ORDER: after explicit purchase intent, add immediately. Do not ask for redundant confirmation.
  'ZAMÓWIENIE: gdy znasz restaurację, dokładną pozycję i ilość, po naturalnej prośbie użytkownika NATYCHMIAST wywołaj add_item_to_cart albo add_items_to_cart. Koszyk jest odwracalnym ekranem kontroli, więc nie pytaj drugi raz „potwierdzasz?” i nie każ użytkownikowi powtarzać pełnej nazwy dania. Dopiero finalne zamówienie i płatność użytkownik zatwierdza ręcznie w interfejsie.',
  'EDYCJA KOSZYKA: wykonuj od razu — update_cart_item_quantity, remove_item_from_cart, replace_cart_item.',
  'DUŻE MENU: jeśli użytkownik prosi o danie którego nie widzisz w bieżącej liście — NATYCHMIAST wywołaj search_menu_items z nazwą dania. Menu może mieć więcej pozycji niż pokazano. search_menu_items szuka w całej karcie restauracji.',

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

export const SYSTEM_INSTRUCTION_STANDARD = BASE_SYSTEM_INSTRUCTION;
export const SYSTEM_INSTRUCTION_SILESIAN = `${BASE_SYSTEM_INSTRUCTION} ${SILESIAN_STYLE_INSTRUCTION}`;

export type LiveRuntimeConfig = {
  fetched: boolean;
  liveModel: string;
  liveVoice: string;
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

export async function fetchLiveRuntimeConfig(): Promise<LiveRuntimeConfig> {
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
    liveVoice: 'Aoede',
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
    const liveVoice = typeof json.live_voice === 'string' && json.live_voice.trim() ? json.live_voice.trim() : 'Aoede';
    return {
      fetched: true,
      liveModel,
      liveVoice,
      speechStyle,
      amberPrompt,
      promptSource: String(json.prompt_source || (amberPrompt ? 'system_config:amber_prompt' : `speech_style:${speechStyle}`)),
    };
  } catch {
    return fallback;
  }
}

async function fetchLiveAccessToken(
  model: string,
  sessionId: string,
  demoContext: ReturnType<typeof getActiveDemoContextPayload>,
): Promise<string> {
  const accessToken = await getAccessToken();
  const response = await fetch(getApiUrl('/api/voice/live/token'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      model,
      session_id: sessionId,
      demo_context: demoContext,
    }),
  });
  const payload = await response.json().catch(() => null);
  const token = typeof payload?.token === 'string' ? payload.token.trim() : '';
  if (!response.ok || !token) {
    const code = typeof payload?.error === 'string' ? payload.error : 'live_token_unavailable';
    throw new Error(code);
  }
  return token;
}

export interface UseGeminiLiveSessionOptions {
  wsRef: React.MutableRefObject<WebSocket | null>;
  enabled?: boolean;
  sessionId?: string;
  onTerminalFailure?: (failure: LiveProviderFailure) => void;
}

export type LiveProviderFailureKind = 'microphone' | 'provider';

export interface LiveProviderFailure {
  kind: LiveProviderFailureKind;
  provider: 'gemini' | 'openai';
  code: string;
}

export type LiveTextSendResult =
  | {
      accepted: true;
      provider: 'gemini' | 'openai';
      turnId: string;
    }
  | {
      accepted: false;
      reason: 'live_not_ready' | 'provider_transition' | 'provider_error';
      message: string;
    };

export interface UseGeminiLiveSessionResult {
  start: () => Promise<boolean>;
  stop: () => void;
  sendText: (text: string) => Promise<LiveTextSendResult>;
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

export function compactToolResponse(
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
      compact.restaurants = list.slice(0, 5).map((x: any) => {
        const filterFeedback = Array.isArray(x.discovery_filter_feedback)
          ? x.discovery_filter_feedback
            .slice(0, 3)
            .map((entry: any) => ({
              id: String(entry?.id || '').trim(),
              dimension: String(entry?.dimension || '').trim(),
              state: String(entry?.state || '').trim(),
            }))
            .filter((entry: { id: string }) => Boolean(entry.id))
          : [];
        return {
          id: x.id,
          name: x.name,
          cuisine: x.cuisine_type || x.cuisine || x.category || null,
          rating: x.maps_rating ?? x.rating ?? null,
          ratingsTotal: x.maps_ratings_total ?? null,
          distance: x.distance ?? null,
          city: x.city || null,
          ...(filterFeedback.length > 0 ? { filterFeedback } : {}),
        };
      });
      break;
    }
    case 'show_menu':
    case 'select_restaurant': {
      const fullMenu = Array.isArray(response.menu) ? (response.menu as any[]) : [];
      const shortlist = Array.isArray(response.menuItems) ? (response.menuItems as any[]) : [];
      const items = fullMenu.length > 0 ? fullMenu : shortlist;
      const hints = buildMenuSpeechHints(items);
      const menuItemsLimit = items.length <= 25 ? items.length : 20;
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
    case 'confirm_add_to_cart': {
      const cart = (response.cart as any) ?? {};
      const mutationObserved = cartChangedByMeta || Boolean(liveToolMeta.cartChanged);
      compact.cartCount = Array.isArray(cart.items) ? cart.items.length : 0;
      compact.cartTotal = cart.total ?? null;
      compact.cartChanged = mutationObserved;
      compact.actionStatus = mutationObserved ? 'added' : 'not_added';
      if (!mutationObserved) compact.mustClarify = true;
      compact.cartItems = Array.isArray(cart.items)
        ? cart.items.map((i: any) => ({ name: i.name, qty: i.qty ?? i.quantity ?? 1, price: i.price ?? i.price_pln ?? null, tags: i.item_tags || [], spicy: !!i.spicy, is_vege: !!i.is_vege, dietary_flags: i.dietary_flags || [], ...(i.special_instructions ? { special_instructions: i.special_instructions } : {}) }))
        : [];
      break;
    }
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
      const clarifyNotAdded = responseIntent === 'clarify_order'
        || liveToolMeta.clarifyNotAdded === true
        || (!mutationObserved && (toolName === 'add_item_to_cart' || toolName === 'add_items_to_cart'));
      compact.actionStatus = clarifyNotAdded ? 'not_added_clarify' : 'added';
      if (clarifyNotAdded) {
        compact.mustClarify = true;
        const responseContext = (response.context || response.contextUpdates || {}) as Record<string, unknown>;
        const expectedContext = String(responseContext.expectedContext || '').trim();
        const hasPendingOrder = Boolean(responseContext.pendingOrder);
        if (expectedContext === 'confirm_add_to_cart' || hasPendingOrder) {
          compact.confirmationRequired = true;
          compact.nextAction = 'confirm_add_to_cart';
        }
      }
      break;
    }
    case 'search_menu_items': {
      const found = Array.isArray(response.menuItems) ? (response.menuItems as any[]) : [];
      compact.menuItems = found.map((x: any) => ({
        id: x.id,
        name: x.name,
        price: x.price ?? null,
        tags: Array.isArray(x.tags) ? x.tags : [],
        variant: x.variant || null,
      }));
      compact.menuFound = found.length;
      compact.menuSearchQuery = String((response.meta as any)?.query || '?');
      break;
    }
    default:
      break;
  }

  return compact;
}

export function applyToolResultToStore(
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
  onTerminalFailure,
}: UseGeminiLiveSessionOptions): UseGeminiLiveSessionResult {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectHalted, setReconnectHalted] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const stopMicRef = useRef<(() => void) | null>(null);
  // P4-C: sesja live konczy sie na potwierdzeniu zamowienia, ale dopiero PO
  // wybrzmieniu odpowiedzi. Warunek zamkniecia mieszka w czystym kontrakcie,
  // tu zostaje samo podpiecie sygnalow.
  const closureLatchRef = useRef(createSessionClosureLatch());
  const endSessionRef = useRef<(() => void) | null>(null);

  const playerRef = useRef(new AudioPlayer((isPlaying) => {
    const liveUi = useLiveUiSessionStore.getState();
    if (isPlaying) {
      closureLatchRef.current.notePlaybackStarted();
      liveUi.setSpeaking('Amber odpowiada...');
      return;
    }
    if (closureLatchRef.current.notePlaybackStopped()) {
      // Zamowienie potwierdzone glosem i Amber skonczyla mowic - koniec sesji.
      // Bez `return` UI ustawiloby zaraz potem 'Słucham...' w martwej sesji.
      endSessionRef.current?.();
      return;
    }
    if (activeRef.current) {
      liveUi.setListening('Słucham...');
    }
  }));

  const activeRef = useRef(false);
  const startInFlightRef = useRef(false);
  const stopInFlightRef = useRef(false);
  const desiredActiveRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectStableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modelSwitchRestartRef = useRef(false);
  const latestUserTranscriptRef = useRef<string | null>(null);
  const latestUserTranscriptTurnIdRef = useRef<string | null>(null);
  const textTurnSenderRef = useRef<((text: string, turnId: string) => void) | null>(null);
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
  const onTerminalFailureRef = useRef(onTerminalFailure);
  useEffect(() => { onTerminalFailureRef.current = onTerminalFailure; }, [onTerminalFailure]);

  const { relay } = useGeminiFunctionRelay({
    wsRef,
    getLatestTranscript: () => latestUserTranscriptRef.current,
    takeLatestTranscript: () => {
      const value = latestUserTranscriptRef.current;
      latestUserTranscriptRef.current = null;
      latestUserTranscriptTurnIdRef.current = null;
      return value;
    },
    getTranscriptForTurn: (requestedTurnId) => {
      if (!requestedTurnId || latestUserTranscriptTurnIdRef.current !== requestedTurnId) {
        return null;
      }
      return latestUserTranscriptRef.current;
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

  const clearReconnectStableTimer = useCallback(() => {
    if (reconnectStableTimerRef.current) {
      clearTimeout(reconnectStableTimerRef.current);
      reconnectStableTimerRef.current = null;
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
    clearReconnectStableTimer();
    clearStallWatchdog();
    stopMicRef.current?.();
    stopMicRef.current = null;

    if (closeSession && sessionRef.current) {
      try { sessionRef.current.close(); } catch { /* noop */ }
    }
    sessionRef.current = null;
    textTurnSenderRef.current = null;

    activeRef.current = false;
    setIsActive(false);
    playerRef.current.stop();
  }, [clearReconnectStableTimer, clearStallWatchdog]);

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
      latestUserTranscriptTurnIdRef.current = null;
      autoNearbyRecoveryInFlightRef.current = false;
      autoNearbyRecoveryLastTsRef.current = 0;
      lastToolResponseSentAtRef.current = null;
      clearStallWatchdog();
      sessionResumptionHandleRef.current = null;
      clearResumptionHandle();
      closureLatchRef.current.reset();
      cleanupRuntime(true);
      setError(null);
      useLiveUiSessionStore.getState().setPaused();
    } finally {
      stopInFlightRef.current = false;
      startInFlightRef.current = false;
    }
  }, [cleanupRuntime, clearReconnectTimer, clearStallWatchdog]);

  // P4-C: zatrzask konczy sesje przez `stop`, a nie przez samo `cleanupRuntime` -
  // cleanup zostawilby desiredActive i reconnect otworzylby sesje z powrotem
  // sekunde po jej zamknieciu. Uchwyt przez ref, bo odtwarzacz powstaje
  // wczesniej niz `stop` i domkniecie zlapaloby wersje nieaktualna.
  useEffect(() => {
    endSessionRef.current = stop;
  }, [stop]);

  const sendText = useCallback(async (text: string): Promise<LiveTextSendResult> => {
    const sanitized = text.trim();
    const sender = textTurnSenderRef.current;
    if (!sanitized || !activeRef.current || !sessionRef.current || !sender) {
      return {
        accepted: false,
        reason: 'live_not_ready',
        message: 'Sesja Gemini Live nie jest jeszcze gotowa na wiadomość tekstową.',
      };
    }

    const textTurnId = generateTurnId(sessionIdRef.current || 'unknown');
    try {
      sender(sanitized, textTurnId);
      return { accepted: true, provider: 'gemini', turnId: textTurnId };
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'gemini_live_text_send_failed';
      setError(message);
      return {
        accepted: false,
        reason: 'provider_error',
        message: 'Nie udało się wysłać tekstu do Gemini Live.',
      };
    }
  }, []);

  const start = useCallback(async () => {
    if (!enabled) return false;

    // Fix #2: singleton guard â€” check sessionRef too
    if (sessionRef.current || activeRef.current || startInFlightRef.current) {
      // session already active â€“ skip start');
      return activeRef.current;
    }

    startInFlightRef.current = true;
    // Resolve the deterministic scenario before requesting microphone access.
    const activeDemoContext = getActiveDemoContextPayload();
    latestUserTranscriptRef.current = null;
    latestUserTranscriptTurnIdRef.current = null;
    autoNearbyRecoveryInFlightRef.current = false;
    autoNearbyRecoveryLastTsRef.current = 0;
    lastToolResponseSentAtRef.current = null;
    desiredActiveRef.current = true;
    setError(null);
    setReconnectHalted(false);
    useLiveUiSessionStore.getState().setProcessing('Łączę z sesją Live...');
    const scheduleReconnect = () => {
      if (!desiredActiveRef.current || stopInFlightRef.current) return;
      if (reconnectTimerRef.current) return;

      const nextAttempt = reconnectAttemptRef.current + 1;
      if (nextAttempt > RECONNECT_DELAYS_MS.length) {
        desiredActiveRef.current = false;
        setReconnectHalted(true);
        setError('Live reconnect halted');
        useLiveUiSessionStore.getState().setProcessing('Gemini Live jest niedostępne. Uruchamiam tryb zapasowy...');
        onTerminalFailureRef.current?.({
          kind: 'provider',
          provider: 'gemini',
          code: 'gemini_reconnect_halted',
        });
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
    try {
      cleanupRuntime(true);

      let firstAudioFrameAt = 0;
      let lastTranscriptAt = 0;
      let lastToolCallAt = 0;
      let turnId: string | null = null;
      let assistantTranscriptBuffer = '';
      const perfTimings: PerfTiming[] = [];

      // Acquire and resume audio immediately from the click gesture. Fetching
      // config/token first can leave Chrome's AudioContext suspended until the
      // user clicks the dock a second time.
      const stopMic = await startPCM16Stream((pcm16: ArrayBuffer) => {
        if (!sessionRef.current || !activeRef.current) return;
        const now = Date.now();
        if (!firstAudioFrameAt) {
          firstAudioFrameAt = now;
          assistantTranscriptBuffer = '';
          turnId = generateTurnId(sessionIdRef.current || 'unknown');
          logBridge('user_input_received', { turn_id: turnId, session_id: sessionIdRef.current, source: 'live_audio' });
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
      if (!desiredActiveRef.current) {
        cleanupRuntime(true);
        return false;
      }

      const runtimeConfig = await fetchLiveRuntimeConfig();
      const activeModel = runtimeConfig.liveModel || DEFAULT_LIVE_MODEL;
      if (!activeModel) throw new Error('LIVE model not configured');
      const sid = sessionIdRef.current ?? 'unknown';
      const defaultInstruction = runtimeConfig.speechStyle === 'silesian'
        ? SYSTEM_INSTRUCTION_SILESIAN
        : SYSTEM_INSTRUCTION_STANDARD;
      const GPS_SAFETY_PREFIX =
        'ZASADA #1: NIGDY nie pytaj o miasto, lokalizację ani adres. Backend ma GPS.';
      const hasGpsRule = (s: string) =>
        /\b(lokalizacj|GPS|współrzędn|miasto.*pytaj|pytaj.*miasto)\b/i.test(s);
      let customStylePrompt = runtimeConfig.amberPrompt;
      if (!runtimeConfig.amberPrompt && !runtimeConfig.fetched) {
        try {
          const stored = localStorage.getItem('amber_live_prompt');
          if (stored && stored.trim().length > 40) customStylePrompt = stored.trim();
        } catch { /* noop */ }
      }
      const activeInstruction = composeLiveSystemInstruction({
        baseInstruction: defaultInstruction,
        customStylePrompt,
        gpsSafetyPrefix: hasGpsRule(defaultInstruction) ? '' : GPS_SAFETY_PREFIX,
        demoContext: activeDemoContext,
      });
      const modelSpecificConfig = activeModel.startsWith('gemini-3.1-')
        ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }
        : {};
      const ephemeralToken = await fetchLiveAccessToken(activeModel, sid, activeDemoContext);
      if (!desiredActiveRef.current) {
        cleanupRuntime(true);
        return false;
      }
      const ai = new GoogleGenAI({
        apiKey: ephemeralToken,
        httpOptions: { apiVersion: 'v1alpha' },
      });
      const player = playerRef.current;
      closureLatchRef.current.reset();
      let perfModel = runtimeConfig.liveModel || DEFAULT_LIVE_MODEL;

      const emitAssistantSpeechPart = (rawTextPart: unknown): string => {
        const rawText = String(rawTextPart || '');
        const textPart = rawText.trim();
        if (!textPart) return '';

        assistantTranscriptBuffer += rawText;
        clearStallWatchdog();
        useLiveUiSessionStore.getState().setTranscript('assistant', assistantTranscriptBuffer.trim());
        window.dispatchEvent(new CustomEvent('freeflow:live-assistant-part', {
          detail: {
            sessionId: sessionIdRef.current || 'unknown',
            text: textPart,
            transcript: assistantTranscriptBuffer,
          },
        }));
        return textPart;
      };

      const tryAutoNearbyRecovery = (assistantText: string, forceAfterMissedTool = false): void => {
        const userTranscript = latestUserTranscriptRef.current || '';
        const now = Date.now();
        const canAutoRecover =
          (forceAfterMissedTool || looksLikeFoodDiscoveryFailure(assistantText))
          && looksLikeFoodDiscoveryIntent(userTranscript)
          && !autoNearbyRecoveryInFlightRef.current
          && (now - autoNearbyRecoveryLastTsRef.current) > AUTO_RECOVERY_COOLDOWN_MS;

        if (!canAutoRecover) return;

        autoNearbyRecoveryInFlightRef.current = true;
        autoNearbyRecoveryLastTsRef.current = now;
        player.stop();
        useLiveUiSessionStore.getState().setProcessing('Sprawdzam miejsca w pobliżu...');
        const query = extractFoodDiscoveryQuery(userTranscript);
        void relay({
          id: `auto_find_nearby_${now}`,
          name: 'find_nearby',
          args: query ? { query } : {},
          turnId: turnId ?? undefined,
        })
          .then((result) => {
            const responseForUi = (result.response ?? {}) as Record<string, unknown>;
            applyToolResultToStore(result.name, responseForUi);
            logBridge('ui_update_applied', {
              turn_id: turnId,
              session_id: sessionIdRef.current,
              tool: result.name,
              source: 'auto_recovery',
            });
          })
          .catch(() => {
            // auto-recovery relay failed — regular provider flow remains available
          })
          .finally(() => {
            autoNearbyRecoveryInFlightRef.current = false;
          });
      };

      const flushPerf = () => {
        if (!perfTimings.length) return;
        const sid = sessionIdRef.current || 'unknown';
        const tid = turnId || undefined;
        // total_e2e = from first audio frame (start of speech) to now (Amber's first audio byte)
        const e2e = firstAudioFrameAt ? Date.now() - firstAudioFrameAt : 0;
        if (e2e > 0) perfTimings.push({ stage: 'total_e2e', ms: e2e });
        console.log(`[LivePerf] ${sid.slice(0,8)} turn=${tid || '?'} ${perfTimings.map(t => `${t.stage}=${t.ms}ms`).join(' | ')}`);
        postPerfTimings(sid, perfModel, [...perfTimings], tid);
        perfTimings.length = 0;
        // Reset per-turn state for next interaction
        turnId = null;
        assistantTranscriptBuffer = '';
        firstAudioFrameAt = 0;
        lastTranscriptAt = 0;
        lastToolCallAt = 0;
      };

      const handleMessage = (msg: LiveServerMessage) => {
        const possibleTranscript =
          (msg as any)?.serverContent?.inputTranscription?.text
          || (msg as any)?.serverContent?.inputTranscription?.transcript
          || (msg as any)?.serverContent?.inputTranscript?.text
          || null;
        if (typeof possibleTranscript === 'string' && possibleTranscript.trim()) {
          const now = Date.now();
          if (firstAudioFrameAt) {
            // audio_to_transcript_ms = speech duration + post-speech silence + server-side VAD commit + transcription.
            // Gemini Live SDK does not expose client-side speech_end events, so precise
            // speech_end_to_transcript_ms cannot currently be measured.
            perfTimings.push({ stage: 'audio_to_transcript_ms', ms: now - firstAudioFrameAt });
          }
          lastTranscriptAt = now;
          const normalizedTranscript = possibleTranscript.trim();
          latestUserTranscriptRef.current = normalizedTranscript;
          latestUserTranscriptTurnIdRef.current = turnId;
          logBridge('transcript_received', { turn_id: turnId, session_id: sessionIdRef.current, text: normalizedTranscript.slice(0, 80) });
          const liveUiStore = useLiveUiSessionStore.getState();
          liveUiStore.setTranscript('user', normalizedTranscript);
          liveUiStore.setProcessing('Analizuje...');
          armStallWatchdog('transcript_final');
        }

        const possibleAssistantTranscript =
          (msg as any)?.serverContent?.outputTranscription?.text
          || (msg as any)?.serverContent?.outputTranscription?.transcript
          || (msg as any)?.serverContent?.outputTranscript?.text
          || (msg as any)?.serverContent?.outputTranscript?.transcript
          || null;
        const emittedOutputTranscript = emitAssistantSpeechPart(possibleAssistantTranscript);
        if (emittedOutputTranscript) {
          tryAutoNearbyRecovery(assistantTranscriptBuffer);
        }

        if (msg.toolCall?.functionCalls?.length) {
          lastToolCallAt = Date.now();
          perfTimings.push({ stage: 'transcript_to_toolcall', ms: lastToolCallAt - (lastTranscriptAt || firstAudioFrameAt || lastToolCallAt) });
          const toolNames = msg.toolCall.functionCalls.map((fc: any) => fc.name || '?').join(',');
          logBridge('toolcall_received', { turn_id: turnId, session_id: sessionIdRef.current, tools: toolNames });
          postLiveDiag('live_function_call_received', sessionIdRef.current, turnId, {
            tools: toolNames,
            count: msg.toolCall.functionCalls.length,
          });
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
                turnId: turnId ?? undefined,
              };
              try {
                const relayStart = Date.now();
                const result = await relay(geminiCall);
                const relayMs = Date.now() - relayStart;
                // P4-C: potwierdzenie zamowienia zbroi zamkniecie sesji. Zbroimy
                // na WYNIKU, nie na wywolaniu - narzedzie zakonczone bledem nie
                // konczy rozmowy, bo klient nadal ma co poprawic.
                if (!((result.response ?? {}) as Record<string, unknown>).error) {
                  closureLatchRef.current.armForTool(result.name);
                }
                const backendMs = (result.response as any)?.backend_ms;
                perfTimings.push({ stage: 'http_roundtrip', ms: relayMs });
                if (typeof backendMs === 'number') {
                  perfTimings.push({ stage: 'backend_execution', ms: backendMs, metadata: { tool: result.name } });
                }
                // HTTP fallback bridge: when WS is not connected, sync structured
                // response to useConversationStore so the UI renders menus, cart, etc.
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                  const applyStart = Date.now();
                  const responseForUi = (result.response ?? {}) as Record<string, unknown>;
                  applyToolResultToStore(
                    result.name,
                    responseForUi,
                  );
                  logBridge('action_result_received', { turn_id: turnId, session_id: sessionIdRef.current, tool: result.name, source: 'http_fallback' });
                  logBridge('ui_update_applied', { turn_id: turnId, duration_ms: Date.now() - applyStart });
                  postLiveDiag('live_ui_restaurants_applied', sessionIdRef.current, turnId, {
                    source: 'http_fallback',
                    tool: result.name,
                    restaurants_count: Array.isArray((responseForUi as any).restaurants) ? (responseForUi as any).restaurants.length : 0,
                    menu_count: Array.isArray((responseForUi as any).menu || (responseForUi as any).menuItems) ? ((responseForUi as any).menu || (responseForUi as any).menuItems).length : 0,
                    intent: (responseForUi as any).intent || null,
                  }, Date.now() - applyStart);
                }
                const compactStart = Date.now();
                const compact = compactToolResponse(
                  result.name,
                  (result.response ?? {}) as Record<string, unknown>,
                );
                perfTimings.push({ stage: 'compact_response', ms: Math.max(1, Date.now() - compactStart) });
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
            const rawTextPart = String((part as any)?.text || '');
            const textPart = emittedOutputTranscript ? rawTextPart.trim() : emitAssistantSpeechPart(rawTextPart);
            if (textPart) {
              tryAutoNearbyRecovery(assistantTranscriptBuffer || textPart);
            }
            const blob = (part as { inlineData?: { data?: string; mimeType?: string } }).inlineData;
            if (blob?.data && blob.mimeType?.startsWith('audio/')) {
              if (lastToolResponseSentAtRef.current) {
                perfTimings.push({ stage: 'tts_generation', ms: Date.now() - lastToolResponseSentAtRef.current });
                logBridge('first_audio_output', { turn_id: turnId, session_id: sessionIdRef.current });
                flushPerf();
                lastToolResponseSentAtRef.current = null;
              }
              clearStallWatchdog();
              player.enqueueBase64(blob.data);
            }
          }
        }

        if (msg.serverContent?.interrupted) {
          assistantTranscriptBuffer = '';
          clearStallWatchdog();
          player.stop();
        }

        if ((msg as any)?.serverContent?.turnComplete) {
          if (closureLatchRef.current.noteTurnComplete()) {
            endSessionRef.current?.();
          }
        }

        if ((msg as any)?.serverContent?.turnComplete && !lastToolCallAt) {
          const currentRestaurantId = useConversationStore.getState().currentRestaurant?.id;
          if (!currentRestaurantId) {
            tryAutoNearbyRecovery(assistantTranscriptBuffer, true);
          }
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
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          realtimeInputConfig: LIVE_VAD_CONFIG,
          ...modelSpecificConfig,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: runtimeConfig.liveVoice || 'Aoede' },
            },
          },
          tools: [{ functionDeclarations: LIVE_FUNCTION_DECLARATIONS }],
          ...(sessionResumptionHandleRef.current
            ? { sessionResumption: { transparent: true, handle: sessionResumptionHandleRef.current } }
            : {}),
        },
        callbacks: {
          onopen: () => {
            clearReconnectTimer();
            clearReconnectStableTimer();
            reconnectStableTimerRef.current = setTimeout(() => {
              if (activeRef.current && desiredActiveRef.current) {
                reconnectAttemptRef.current = 0;
              }
              reconnectStableTimerRef.current = null;
            }, RECONNECT_STABLE_RESET_MS);
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
            console.error('[GEMINI_LIVE_ERROR]', {
              message,
              type: e.type || 'error',
              model: activeModel,
            });
            setError(message);
            useLiveUiSessionStore.getState().setProcessing('Wznawiam połączenie Gemini Live...');
            cleanupRuntime(false);
            scheduleReconnect();
          },
          onclose: (event?: { code?: number; reason?: string }) => {
            console.warn('[GEMINI_LIVE_CLOSE]', {
              code: event?.code ?? null,
              reason: event?.reason || null,
              model: activeModel,
              reconnectAttempt: reconnectAttemptRef.current,
            });
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
      textTurnSenderRef.current = (text, textTurnId) => {
        turnId = textTurnId;
        assistantTranscriptBuffer = '';
        firstAudioFrameAt = 0;
        lastTranscriptAt = Date.now();
        latestUserTranscriptRef.current = text;
        latestUserTranscriptTurnIdRef.current = textTurnId;
        player.stop();

        const liveUi = useLiveUiSessionStore.getState();
        liveUi.setTranscript('user', text);
        liveUi.setProcessing('Analizuję...');
        logBridge('user_input_received', {
          turn_id: textTurnId,
          session_id: sessionIdRef.current,
          source: 'voicebar_text_live',
          text: text.slice(0, 80),
        });
        logBridge('transcript_received', {
          turn_id: textTurnId,
          session_id: sessionIdRef.current,
          source: 'voicebar_text_live',
          text: text.slice(0, 80),
        });
        session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text }] }],
          turnComplete: true,
        });
        armStallWatchdog('text_turn_sent');
      };
      activeRef.current = true;
      setIsActive(true);
      useLiveUiSessionStore.getState().setListening('Słucham...');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'failed_to_start';
      const errorName = err instanceof Error ? err.name : '';
      const microphoneFailure =
        errorName === 'NotAllowedError'
        || errorName === 'SecurityError'
        || errorName === 'NotFoundError'
        || /permission|microphone|audio input device/i.test(msg);
      setError(msg);
      cleanupRuntime(false);
      if (microphoneFailure) {
        desiredActiveRef.current = false;
        const code = errorName === 'NotFoundError' ? 'microphone_unavailable' : 'microphone_permission_denied';
        useLiveUiSessionStore.getState().setError(
          code === 'microphone_unavailable'
            ? 'Nie znaleziono mikrofonu.'
            : 'Zezwól aplikacji na dostęp do mikrofonu.',
        );
        onTerminalFailureRef.current?.({ kind: 'microphone', provider: 'gemini', code });
        return false;
      }
      useLiveUiSessionStore.getState().setProcessing('Wznawiam połączenie Gemini Live...');
      scheduleReconnect();
      return false;
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

  return { start, stop, sendText, isActive, error, reconnectHalted };
}

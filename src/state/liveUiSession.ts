import { create } from 'zustand';
import {
  LiveUiSessionState,
  mapLiveToolResultToUiState,
} from '../lib/liveUiSessionAdapter';

type TranscriptRole = 'user' | 'assistant';
type TranscriptQuality = 'unknown' | 'trusted' | 'low_confidence';

interface LiveUiSessionStore {
  sessionState: LiveUiSessionState;
  statusText: string;
  isLiveActive: boolean;
  isPaused: boolean;
  lastTool: string | null;
  lastIntent: string | null;
  lastUserTranscript: string | null;
  lastAssistantTranscript: string | null;
  lastModelInputText: string | null;
  lastTranscriptQuality: TranscriptQuality;
  selectedRestaurantName: string | null;
  selectedItemSummary: string | null;
  cartSummary: string | null;
  setSessionState: (
    nextState: LiveUiSessionState,
    patch?: Partial<Pick<
      LiveUiSessionStore,
      'statusText' | 'isLiveActive' | 'isPaused' | 'lastTool' | 'lastIntent' | 'selectedRestaurantName' | 'selectedItemSummary' | 'cartSummary'
    >>,
  ) => void;
  setListening: (statusText?: string) => void;
  setProcessing: (statusText?: string, toolName?: string | null) => void;
  setSpeaking: (statusText?: string) => void;
  setError: (statusText?: string) => void;
  setPaused: (statusText?: string) => void;
  setIdle: (statusText?: string) => void;
  setTranscript: (role: TranscriptRole, text: string | null | undefined) => void;
  applyToolResult: (toolName: string | null, response: Record<string, any> | null | undefined) => void;
}

function compactText(value: unknown, maxLen = 160): string {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}...` : text;
}

function readTraceValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>).value || '').trim();
  }
  return '';
}

function normalizeLoose(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasMeaningfulOverlap(left: string, right: string): boolean {
  const leftTokens = normalizeLoose(left).split(' ').filter((token) => token.length >= 3);
  const rightTokens = normalizeLoose(right).split(' ').filter((token) => token.length >= 3);
  if (!leftTokens.length || !rightTokens.length) return false;
  return leftTokens.some((token) => rightTokens.includes(token));
}

function evaluateTranscriptQuality(response: Record<string, any> | null | undefined): TranscriptQuality {
  const turnTrace = response?.meta?.liveTool?.turnTrace;
  if (!turnTrace || typeof turnTrace !== 'object') return 'unknown';

  const warnings = Array.isArray(turnTrace.warnings) ? turnTrace.warnings : [];
  if (warnings.some((warning: any) => String(warning?.code || '') === 'TEXT_DISH_MISMATCH')) {
    return 'low_confidence';
  }

  const finalTranscript = readTraceValue(turnTrace?.stt?.final_transcript);
  const modelInputText = readTraceValue(turnTrace?.model?.input_text);
  if (finalTranscript && modelInputText && !hasMeaningfulOverlap(finalTranscript, modelInputText)) {
    return 'low_confidence';
  }

  if (finalTranscript || modelInputText) return 'trusted';
  return 'unknown';
}

export const useLiveUiSessionStore = create<LiveUiSessionStore>((set, get) => ({
  sessionState: 'idle',
  statusText: 'Gotowe.',
  isLiveActive: false,
  isPaused: false,
  lastTool: null,
  lastIntent: null,
  lastUserTranscript: null,
  lastAssistantTranscript: null,
  lastModelInputText: null,
  lastTranscriptQuality: 'unknown',
  selectedRestaurantName: null,
  selectedItemSummary: null,
  cartSummary: null,

  setSessionState: (nextState, patch = {}) => {
    set((state) => ({
      ...state,
      sessionState: nextState,
      ...patch,
    }));
  },

  setListening: (statusText = 'Słucham...') => {
    get().setSessionState('listening', {
      statusText,
      isLiveActive: true,
      isPaused: false,
    });
  },

  setProcessing: (statusText = 'Analizuję...', toolName = null) => {
    get().setSessionState('processing', {
      statusText,
      isLiveActive: true,
      isPaused: false,
      lastTool: toolName || get().lastTool,
    });
  },

  setPaused: (statusText = 'Wstrzymano LIVE. Wznów, aby kontynuować.') => {
    get().setSessionState('paused', {
      statusText,
      isLiveActive: false,
      isPaused: true,
    });
  },

  setIdle: (statusText = 'Gotowe.') => {
    get().setSessionState('idle', {
      statusText,
      isLiveActive: false,
      isPaused: false,
    });
  },

  setTranscript: (role, text) => {
    const compact = compactText(text);
    if (!compact) return;
    if (role === 'user') {
      set({ lastUserTranscript: compact, lastTranscriptQuality: 'trusted' });
      return;
    }
    set({ lastAssistantTranscript: compact });
  },

  setSpeaking: (statusText = 'Amber odpowiada...') => {
    get().setSessionState('speaking', {
      statusText,
      isLiveActive: true,
      isPaused: false,
    });
  },

  setError: (statusText = 'Tryb Live jest chwilowo niedostępny.') => {
    get().setSessionState('error', {
      statusText,
      isLiveActive: false,
      isPaused: true,
    });
  },

  applyToolResult: (toolName, response) => {
    const mapped = mapLiveToolResultToUiState({ toolName, response });
    const previous = get();
    const nextAssistantTranscript = mapped.assistantTranscript || previous.lastAssistantTranscript;
    const turnTrace = response?.meta?.liveTool?.turnTrace;
    const modelInputText = compactText(readTraceValue(turnTrace?.model?.input_text));
    const transcriptQuality = evaluateTranscriptQuality(response);
    get().setSessionState(mapped.state, {
      statusText: mapped.statusText,
      isLiveActive: true,
      isPaused: false,
      lastTool: toolName || previous.lastTool,
      lastIntent: mapped.intent || previous.lastIntent,
      selectedRestaurantName: mapped.selectedRestaurantName ?? previous.selectedRestaurantName,
      selectedItemSummary: mapped.selectedItemSummary ?? previous.selectedItemSummary,
      cartSummary: mapped.cartSummary ?? previous.cartSummary,
    });
    set({
      ...(nextAssistantTranscript ? { lastAssistantTranscript: compactText(nextAssistantTranscript) } : {}),
      ...(modelInputText ? { lastModelInputText: modelInputText } : {}),
      lastTranscriptQuality: transcriptQuality,
    });
  },
}));


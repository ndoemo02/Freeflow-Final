import { create } from 'zustand';
import {
  LiveUiSessionState,
  mapLiveToolResultToUiState,
} from '../lib/liveUiSessionAdapter';

type TranscriptRole = 'user' | 'assistant';

interface LiveUiSessionStore {
  sessionState: LiveUiSessionState;
  statusText: string;
  isLiveActive: boolean;
  isPaused: boolean;
  lastTool: string | null;
  lastIntent: string | null;
  lastUserTranscript: string | null;
  lastAssistantTranscript: string | null;
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

function logLiveState(nextState: LiveUiSessionState) {
  console.log(`[UI_LIVE_STATE] ${nextState}`);
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
  selectedRestaurantName: null,
  selectedItemSummary: null,
  cartSummary: null,

  setSessionState: (nextState, patch = {}) => {
    const prevState = get().sessionState;
    if (prevState !== nextState) {
      logLiveState(nextState);
    }
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
      set({ lastUserTranscript: compact });
      return;
    }
    set({ lastAssistantTranscript: compact });
  },

  applyToolResult: (toolName, response) => {
    const mapped = mapLiveToolResultToUiState({ toolName, response });
    const previous = get();
    const nextAssistantTranscript = mapped.assistantTranscript || previous.lastAssistantTranscript;
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
    if (nextAssistantTranscript) {
      set({ lastAssistantTranscript: compactText(nextAssistantTranscript) });
    }
  },
}));


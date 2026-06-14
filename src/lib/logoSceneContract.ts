import type { LiveUiSessionState } from './liveUiSessionAdapter';

export type LogoScenePhase = 'idle' | 'intent' | 'compact' | 'results';

interface LogoSceneInput {
  uiMode?: string | null;
  isListening?: boolean;
  isThinking?: boolean;
  liveSessionActive?: boolean;
  liveUiState?: LiveUiSessionState;
  hasSuggestedRestaurants?: boolean;
}

export interface LogoMotionPlan {
  transitionMs: number;
  retractDrip: boolean;
  wobblePx: number;
  pulse: boolean;
}

const RESULT_LIVE_STATES = new Set<LiveUiSessionState>([
  'results_ready',
  'restaurant_selected',
  'item_selected',
  'cart_ready',
]);

export function deriveLogoScenePhase({
  uiMode,
  isListening = false,
  isThinking = false,
  liveSessionActive,
  liveUiState,
  hasSuggestedRestaurants = false,
}: LogoSceneInput): LogoScenePhase {
  const effectiveLiveUiState = liveSessionActive === false ? undefined : liveUiState;

  if (uiMode === 'list' && hasSuggestedRestaurants) return 'results';
  if (uiMode === 'restaurant' || uiMode === 'checkout') return 'compact';
  if (effectiveLiveUiState && RESULT_LIVE_STATES.has(effectiveLiveUiState)) return 'results';
  if (isListening || effectiveLiveUiState === 'listening') return 'intent';
  if (isThinking || effectiveLiveUiState === 'processing') return 'compact';
  return 'idle';
}

export function getLogoMotionPlan(phase: LogoScenePhase, reduceMotion: boolean): LogoMotionPlan {
  if (reduceMotion) {
    return {
      transitionMs: 0,
      retractDrip: false,
      wobblePx: 0,
      pulse: false,
    };
  }

  if (phase === 'intent') {
    return {
      transitionMs: 680,
      retractDrip: true,
      wobblePx: 3,
      pulse: false,
    };
  }

  if (phase === 'compact' || phase === 'results') {
    return {
      transitionMs: 620,
      retractDrip: true,
      wobblePx: 2,
      pulse: true,
    };
  }

  return {
    transitionMs: 560,
    retractDrip: false,
    wobblePx: 0,
    pulse: false,
  };
}

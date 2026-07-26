export type VoiceContext = 'order' | 'places' | 'menu';

interface VoiceContextInput {
  uiMode?: string | null;
  hasSuggestedRestaurants?: boolean;
}

export function deriveVoiceContext({
  uiMode,
  hasSuggestedRestaurants = false,
}: VoiceContextInput): VoiceContext {
  if (uiMode === 'restaurant') return 'menu';
  if (uiMode === 'list' && hasSuggestedRestaurants) return 'places';
  return 'order';
}

export function getVoiceContextLabel(context: VoiceContext): 'Order' | 'Places' | 'Menu' {
  switch (context) {
    case 'places':
      return 'Places';
    case 'menu':
      return 'Menu';
    default:
      return 'Order';
  }
}

import { useConversationStore } from '../store/useConversationStore';

/**
 * Derives the 4 UI states for the consumer stack.
 *
 * IDLE   — no active content (phase=idle or no items)
 * STACK  — items present, peek snap, no card focused yet
 * FOCUS  — items present, peek snap, a specific card is highlighted
 * LIST   — expanded snap, full scrollable list
 *
 * Note: snap is not tracked here — STACK vs LIST comes from the sheet's own snap state.
 * Callers who need snap state use the sheet context directly.
 */
export type StackMode = 'idle' | 'stack' | 'focus' | 'list';

export interface ConsumerStackState {
  mode: StackMode;
  hasItems: boolean;
  isConsumerPhase: boolean;
}

const CONSUMER_PHASES = new Set(['restaurant_selected', 'ordering', 'checkout']);

export function useConsumerStackState(
  highlightedId: string | null,
  snap: 'closed' | 'peek' | 'expanded',
): ConsumerStackState {
  const phase = useConversationStore((s) => s.conversationPhase);
  const menuItems = useConversationStore((s) => s.menuItems);
  const restaurants = useConversationStore((s) => s.suggestedRestaurants);

  const isConsumerPhase = CONSUMER_PHASES.has(phase);
  const hasItems = isConsumerPhase
    ? Array.isArray(menuItems) && menuItems.length > 0
    : Array.isArray(restaurants) && restaurants.length > 0;

  let mode: StackMode = 'idle';

  if (hasItems || isConsumerPhase) {
    if (snap === 'expanded') {
      mode = 'list';
    } else if (highlightedId) {
      mode = 'focus';
    } else {
      mode = 'stack';
    }
  }

  return { mode, hasItems, isConsumerPhase };
}

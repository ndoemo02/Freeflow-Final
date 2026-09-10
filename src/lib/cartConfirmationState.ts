export type ConversationUiMode = 'list' | 'restaurant' | 'checkout';

export interface CartConfirmationState<TRestaurant = unknown, TMenuItem = unknown, TOrder = unknown, TCart = unknown> {
  currentRestaurant: TRestaurant | null;
  selectedRestaurantPreviewId: string | null;
  menuItems: TMenuItem[] | null;
  pendingOrder: TOrder | null;
  expectedContext: string | null;
  cart: TCart | null;
  conversationPhase: string;
  uiMode: ConversationUiMode;
}

interface ResolveCartConfirmationStateOptions<TRestaurant, TMenuItem, TOrder, TCart> {
  previous: CartConfirmationState<TRestaurant, TMenuItem, TOrder, TCart>;
  incoming: CartConfirmationState<TRestaurant, TMenuItem, TOrder, TCart>;
  intent?: unknown;
  toolName?: unknown;
  context?: Record<string, unknown>;
}

const CONFIRMATION_CONTEXT = 'confirm_add_to_cart';
const CONFIRMATION_CANCELLATIONS = new Set([
  'cancel_add_to_cart',
  'decline_add_to_cart',
]);

function normalizeContractTag(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function cartSnapshotsDiffer(previous: unknown, incoming: unknown): boolean {
  try {
    return JSON.stringify(previous) !== JSON.stringify(incoming);
  } catch {
    return previous !== incoming;
  }
}

export function resolveCartConfirmationState<TRestaurant, TMenuItem, TOrder, TCart>({
  previous,
  incoming,
  intent,
  toolName,
  context,
}: ResolveCartConfirmationStateOptions<TRestaurant, TMenuItem, TOrder, TCart>) {
  const normalizedIntent = normalizeContractTag(intent);
  const normalizedTool = normalizeContractTag(toolName);
  const explicitConfirmation = normalizedIntent === CONFIRMATION_CONTEXT
    || normalizedTool === CONFIRMATION_CONTEXT;
  const explicitCancellation = CONFIRMATION_CANCELLATIONS.has(normalizedIntent)
    || CONFIRMATION_CANCELLATIONS.has(normalizedTool);
  // Missing context is not a reset. A server-authored null draft and a new
  // expected context are authoritative (including menu revalidation rejection).
  const clearedByServer = context?.pendingOrder === null
    && Object.prototype.hasOwnProperty.call(context, 'expectedContext')
    && context.expectedContext !== undefined
    && context.expectedContext !== CONFIRMATION_CONTEXT;
  const explicitlyResolved = explicitCancellation || clearedByServer
    || (explicitConfirmation && cartSnapshotsDiffer(previous.cart, incoming.cart));
  const incomingRequestsConfirmation = incoming.expectedContext === CONFIRMATION_CONTEXT;
  const previousAwaitedConfirmation = previous.expectedContext === CONFIRMATION_CONTEXT;
  const incomingCarriesLegacyDraft = incoming.pendingOrder != null && (
    normalizedTool === 'add_item_to_cart'
    || normalizedTool === 'add_items_to_cart'
    || normalizedIntent === 'clarify_order'
    || normalizedIntent === 'open_checkout'
  );
  const isAwaitingCartConfirmation = !explicitlyResolved
    && (incomingRequestsConfirmation || previousAwaitedConfirmation || incomingCarriesLegacyDraft);

  if (!isAwaitingCartConfirmation) {
    return {
      ...incoming,
      pendingOrder: explicitlyResolved ? null : incoming.pendingOrder,
      expectedContext: explicitCancellation || (explicitConfirmation && incoming.expectedContext === CONFIRMATION_CONTEXT)
        ? null : incoming.expectedContext,
      cart: explicitCancellation ? previous.cart : incoming.cart,
      isAwaitingCartConfirmation: false,
      suppressCartActions: explicitCancellation,
    };
  }

  const pendingOrder = incoming.pendingOrder ?? previous.pendingOrder;
  const activePhase = previous.conversationPhase === 'restaurant_selected'
    || previous.conversationPhase === 'ordering'
    ? previous.conversationPhase
    : 'ordering';

  return {
    ...incoming,
    currentRestaurant: previous.currentRestaurant ?? incoming.currentRestaurant,
    selectedRestaurantPreviewId: previous.selectedRestaurantPreviewId
      ?? incoming.selectedRestaurantPreviewId,
    menuItems: previous.menuItems?.length ? previous.menuItems : incoming.menuItems,
    pendingOrder,
    expectedContext: CONFIRMATION_CONTEXT,
    cart: previous.cart,
    conversationPhase: activePhase,
    uiMode: 'restaurant' as const,
    isAwaitingCartConfirmation: true,
    suppressCartActions: true,
  };
}

// Every transport exposes the same accepted snapshot to Home/ActionDispatcher.
// Keeping the store safe alone is insufficient: actions can also mutate CartContext.
export function cartConfirmationResponseForUi(response: Record<string, any>, state: {
  cart: unknown; pendingOrder: unknown; expectedContext: string | null; suppressCartActions: boolean;
}) {
  return {
    ...response,
    cart: state.cart,
    meta: { ...(response.meta || {}), cart: state.cart },
    context: { ...(response.context || {}), cart: state.cart,
      pendingOrder: state.pendingOrder, expectedContext: state.expectedContext },
    actions: state.suppressCartActions && Array.isArray(response.actions)
      ? response.actions.filter((action: any) => !['SYNC_CART', 'SHOW_CART', 'CLEAR_CART'].includes(action?.type))
      : response.actions,
  };
}

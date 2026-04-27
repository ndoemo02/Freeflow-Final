export type LiveUiSessionState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'results_ready'
  | 'restaurant_selected'
  | 'item_selected'
  | 'cart_ready'
  | 'paused';

export type LiveToolResultInput = {
  toolName: string | null;
  response: Record<string, any> | null | undefined;
};

export type LiveToolResultOutput = {
  state: LiveUiSessionState;
  statusText: string;
  assistantTranscript: string | null;
  selectedRestaurantName: string | null;
  selectedItemSummary: string | null;
  cartSummary: string | null;
  intent: string | null;
};

function compactText(value: unknown, maxLen = 140): string {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}...` : text;
}

function normalizeIntent(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function readRestaurantName(response: Record<string, any>): string | null {
  const name =
    response?.context?.currentRestaurant?.name
    || response?.context?.current_restaurant?.name
    || response?.currentRestaurant?.name
    || response?.restaurant?.name
    || response?.restaurant_name
    || null;
  const trimmed = String(name || '').trim();
  return trimmed || null;
}

function readItemSummary(response: Record<string, any>): string | null {
  const pendingItems = response?.context?.pendingOrder?.items;
  if (Array.isArray(pendingItems) && pendingItems.length > 0) {
    const first = pendingItems[0] || {};
    const qty = Number(first?.quantity || first?.qty || 1);
    const dish = String(first?.name || first?.dish || '').trim();
    if (dish) {
      return `${qty} x ${dish}`;
    }
  }

  const dish = String(response?.meta?.dish || response?.dish || '').trim();
  if (dish) return dish;
  return null;
}

function readCartSummary(response: Record<string, any>): string | null {
  const cartItems = Array.isArray(response?.cart?.items) ? response.cart.items : [];
  if (cartItems.length > 0) {
    return `Koszyk gotowy (${cartItems.length} poz.)`;
  }
  if (normalizeIntent(response?.intent) === 'open_checkout') {
    return 'Koszyk gotowy. Mozesz potwierdzic zamowienie.';
  }
  return null;
}

export function mapLiveToolResultToUiState({
  toolName,
  response,
}: LiveToolResultInput): LiveToolResultOutput {
  const safeResponse = response || {};
  const safeTool = String(toolName || '').trim().toLowerCase();
  const intent = normalizeIntent(safeResponse?.intent || safeResponse?.meta?.liveTool?.runtimeIntent || null) || null;
  const assistantTranscript = compactText(safeResponse?.reply || safeResponse?.text || '');
  const selectedRestaurantName = readRestaurantName(safeResponse);
  const selectedItemSummary = readItemSummary(safeResponse);
  const cartSummary = readCartSummary(safeResponse);

  const isCartReady =
    safeTool === 'open_checkout'
    || safeTool === 'get_cart_state'
    || intent === 'open_checkout'
    || intent === 'confirm_order';

  const isItemSelected =
    safeTool === 'add_item_to_cart'
    || safeTool === 'add_items_to_cart'
    || safeTool === 'update_cart_item_quantity'
    || safeTool === 'remove_item_from_cart'
    || safeTool === 'replace_cart_item'
    || intent === 'create_order'
    || intent === 'confirm_add_to_cart';

  const isRestaurantSelected =
    safeTool === 'select_restaurant'
    || safeTool === 'show_menu'
    || intent === 'select_restaurant'
    || intent === 'show_menu'
    || intent === 'menu_request'
    || Boolean(selectedRestaurantName);

  if (isCartReady) {
    return {
      state: 'cart_ready',
      statusText: cartSummary || 'Koszyk gotowy. Mozesz przejsc dalej.',
      assistantTranscript: assistantTranscript || null,
      selectedRestaurantName,
      selectedItemSummary,
      cartSummary: cartSummary || null,
      intent,
    };
  }

  if (isItemSelected) {
    return {
      state: 'item_selected',
      statusText: selectedItemSummary ? `Wybrano pozycje: ${selectedItemSummary}` : 'Wybrano pozycje.',
      assistantTranscript: assistantTranscript || null,
      selectedRestaurantName,
      selectedItemSummary,
      cartSummary,
      intent,
    };
  }

  if (isRestaurantSelected) {
    return {
      state: 'restaurant_selected',
      statusText: selectedRestaurantName ? `Wybrano restauracje: ${selectedRestaurantName}` : 'Wybrano restauracje.',
      assistantTranscript: assistantTranscript || null,
      selectedRestaurantName,
      selectedItemSummary,
      cartSummary,
      intent,
    };
  }

  return {
    state: 'results_ready',
    statusText: assistantTranscript || 'Wyniki gotowe.',
    assistantTranscript: assistantTranscript || null,
    selectedRestaurantName,
    selectedItemSummary,
    cartSummary,
    intent,
  };
}

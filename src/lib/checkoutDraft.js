export const CHECKOUT_DRAFT_KEY = 'freeflow_checkout_draft_v1';

// One owner-bound snapshot. A Live session is deliberately not its owner.
export function readCheckoutDraft(ownerId) {
  try {
    const draft = JSON.parse(localStorage.getItem(CHECKOUT_DRAFT_KEY) || 'null');
    if (!draft) return null;
    if (draft.ownerId !== ownerId) {
      localStorage.removeItem(CHECKOUT_DRAFT_KEY);
      return null;
    }
    if (draft.version !== 1 || typeof draft.id !== 'string'
      || !Array.isArray(draft.cart) || !draft.cart.length || !draft.restaurant?.id
      || draft.cart.some(item => !item?.id || !Number.isFinite(item.price) || item.price < 0
        || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
      throw new Error('invalid_checkout_snapshot');
    }
    if (draft.submission && (typeof draft.submission.body !== 'string'
      || !/^[a-zA-Z0-9_-]{16,128}$/.test(draft.submission.key))) {
      // Never silently mint another key for a damaged, possibly submitted draft.
      throw new Error('invalid_checkout_attempt');
    }
    return draft;
  } catch (error) {
    throw new Error('Nie można odczytać zapisanego checkoutu. Wyczyść koszyk, aby rozpocząć nowe zamówienie.');
  }
}

export function writeCheckoutDraft(draft) {
  // Must succeed before POST: an uncertain response must remain retryable after reload.
  localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
}

export function removeCheckoutDraft() {
  localStorage.removeItem(CHECKOUT_DRAFT_KEY);
}

/**
 * Stan platnosci zamowienia — jedno zrodlo prawdy dla wszystkich widokow.
 *
 * P4 (WORK_PACKAGES.md, zadanie #4): przed ta zmiana stan platnosci zyl
 * w markerze `[stripe_test_paid:…]` doklejanym do `notes`. Marker byl obejsciem
 * CHECK-a starej bazy, ktory nie dopuszczal statusu 'confirmed' — nie decyzja
 * projektowa. Nowa baza dopuszcza 'confirmed' i ma kolumne `confirmed_at`,
 * wiec stan wraca tam, gdzie jego miejsce.
 *
 * 'confirmed' i 'accepted' to DWA ROZNE zdarzenia:
 *   confirmed = klient zaplacil
 *   accepted  = restauracja przyjela
 * Dlatego przejscie zamowienia w 'preparing' nie kasuje faktu zaplaty —
 * swiadkiem pozostaje `confirmed_at`.
 */

export interface OrderPaymentFields {
    status?: unknown;
    confirmed_at?: unknown;
    // Zamowienie niesie kilkanascie innych pol (notes, items, total_price...).
    // Zaden z nich nie wplywa na stan platnosci - ale musza dac sie przekazac.
    [key: string]: unknown;
}

export function isOrderPaid(order: OrderPaymentFields | null | undefined): boolean {
    if (!order) return false;

    const confirmedAt = String(order.confirmed_at ?? '').trim();
    if (confirmedAt) return true;

    return String(order.status ?? '').trim().toLowerCase() === 'confirmed';
}

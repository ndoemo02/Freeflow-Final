export function formatDemoOrderNumber(orderId: unknown): string {
  const cleaned = String(orderId || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (!cleaned) return '';
  return cleaned.slice(-4).padStart(4, '0');
}

export function formatDemoOrderLabel(orderId: unknown): string {
  const number = formatDemoOrderNumber(orderId);
  return number ? `Zamówienie demo ${number}` : 'Zamówienie demo';
}

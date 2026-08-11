export const SESSION_ID_MAX_LENGTH = 128;
export const SESSION_ID_PATTERN = /^sess_[a-z0-9_]+$/;

export function isCanonicalSessionId(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= SESSION_ID_MAX_LENGTH
    && SESSION_ID_PATTERN.test(value);
}

export function generateSessionId(namespace = ''): string {
  const safeNamespace = String(namespace).toLowerCase().replace(/[^a-z0-9_]/g, '');
  const random = Math.random().toString(36).slice(2, 8).padEnd(6, '0').slice(0, 6);
  return `sess_${safeNamespace ? `${safeNamespace}_` : ''}${Date.now()}_${random}`;
}

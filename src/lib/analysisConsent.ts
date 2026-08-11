import { getApiUrl } from './config';
import { getAccessToken } from './supabase';

const PENDING_KEY = 'freeflow-pending-analysis-consent-v1';
const PENDING_OAUTH_KEY = 'freeflow-pending-oauth-analysis-consent-v1';
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
const PENDING_OAUTH_TTL_MS = 15 * 60 * 1000;

export type AnalysisConsent = {
  quality_enabled: boolean;
  audio_enabled: boolean;
  capture_mode: 'off' | 'full';
  notice_version: string;
};

async function authHeaders(explicitToken?: string | null): Promise<Record<string, string>> {
  const token = explicitToken || await getAccessToken();
  if (!token) throw new Error('unauthorized');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function getAnalysisConsent(): Promise<AnalysisConsent> {
  const response = await fetch(getApiUrl('/api/account/analysis-consent'), {
    headers: await authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.consent) throw new Error(payload?.error || 'consent_unavailable');
  return payload.consent;
}

export async function updateAnalysisConsent(
  qualityEnabled: boolean,
  audioEnabled: boolean,
  source: 'signup' | 'profile',
  explicitToken?: string | null,
): Promise<AnalysisConsent> {
  const response = await fetch(getApiUrl('/api/account/analysis-consent'), {
    method: 'PUT',
    headers: await authHeaders(explicitToken),
    body: JSON.stringify({
      quality_enabled: qualityEnabled,
      audio_enabled: audioEnabled,
      source,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.consent) throw new Error(payload?.error || 'consent_update_failed');
  if (source === 'profile') clearPendingSignupConsent();
  return payload.consent;
}

export function rememberPendingSignupConsent(userId: string, qualityEnabled: boolean) {
  if (typeof window === 'undefined') return;
  if (!userId || !qualityEnabled) {
    window.localStorage.removeItem(PENDING_KEY);
    return;
  }
  window.localStorage.setItem(PENDING_KEY, JSON.stringify({
    userId,
    qualityEnabled: true,
    audioEnabled: false,
    createdAt: Date.now(),
  }));
}

export function clearPendingSignupConsent() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PENDING_KEY);
  window.sessionStorage.removeItem(PENDING_OAUTH_KEY);
}

export function rememberPendingOAuthSignupConsent(qualityEnabled: boolean) {
  if (typeof window === 'undefined') return;
  if (!qualityEnabled) {
    window.sessionStorage.removeItem(PENDING_OAUTH_KEY);
    return;
  }
  window.sessionStorage.setItem(PENDING_OAUTH_KEY, JSON.stringify({
    qualityEnabled: true,
    audioEnabled: false,
    createdAt: Date.now(),
  }));
}

async function consumePendingConsent(
  storage: Storage,
  key: string,
  userId: string,
  accessToken: string | null | undefined,
  ttlMs: number,
  expectedUserId: boolean,
) {
  const raw = storage.getItem(key);
  if (!raw) return false;

  let pending: { userId?: string; qualityEnabled: boolean; audioEnabled: boolean; createdAt: number };
  try {
    pending = JSON.parse(raw);
  } catch {
    storage.removeItem(key);
    return false;
  }

  if ((expectedUserId && (!pending.userId || pending.userId !== userId))
      || !Number.isFinite(pending.createdAt)
      || Date.now() - pending.createdAt > ttlMs
      || pending.qualityEnabled !== true) {
    storage.removeItem(key);
    return false;
  }

  // Consume before the network request. A stale retry must never be able to
  // silently restore consent after a later explicit profile revocation.
  storage.removeItem(key);
  await updateAnalysisConsent(Boolean(pending.qualityEnabled), Boolean(pending.audioEnabled), 'signup', accessToken);
  return true;
}

export async function syncPendingSignupConsent(userId: string, accessToken?: string | null) {
  if (typeof window === 'undefined') return;
  const synchronizedBoundChoice = await consumePendingConsent(
    window.localStorage,
    PENDING_KEY,
    userId,
    accessToken,
    PENDING_TTL_MS,
    true,
  );
  if (synchronizedBoundChoice) return;

  await consumePendingConsent(
    window.sessionStorage,
    PENDING_OAUTH_KEY,
    userId,
    accessToken,
    PENDING_OAUTH_TTL_MS,
    false,
  );
}

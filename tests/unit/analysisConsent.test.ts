import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPendingSignupConsent,
  rememberPendingOAuthSignupConsent,
  rememberPendingSignupConsent,
  syncPendingSignupConsent,
  updateAnalysisConsent,
} from '../../src/lib/analysisConsent';

const PENDING_KEY = 'freeflow-pending-analysis-consent-v1';
const PENDING_OAUTH_KEY = 'freeflow-pending-oauth-analysis-consent-v1';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('signup consent synchronization', () => {
  it('never applies one signup choice to a different signed-in user', async () => {
    rememberPendingSignupConsent('user-1', true);
    await syncPendingSignupConsent('user-2', 'token-2');
    expect(fetch).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('synchronizes the optional choice only for its verified signup identity', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        consent: {
          quality_enabled: true,
          audio_enabled: false,
          capture_mode: 'full',
          notice_version: 'amber-quality-demo-v1',
        },
      }),
    } as Response);
    rememberPendingSignupConsent('user-1', true);

    await syncPendingSignupConsent('user-1', 'token-1');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/account/analysis-consent'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          quality_enabled: true,
          audio_enabled: false,
          source: 'signup',
        }),
      }),
    );
    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('expires a signup choice after 24 hours without calling the API', async () => {
    rememberPendingSignupConsent('user-1', true);
    const pending = JSON.parse(window.localStorage.getItem(PENDING_KEY) || '{}');
    window.localStorage.setItem(PENDING_KEY, JSON.stringify({
      ...pending,
      createdAt: Date.now() - 25 * 60 * 60 * 1000,
    }));

    await syncPendingSignupConsent('user-1', 'token-1');

    expect(fetch).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('synchronizes an OAuth signup choice only within the short-lived browser flow', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ consent: {
        quality_enabled: true,
        audio_enabled: false,
        capture_mode: 'full',
        notice_version: 'amber-quality-demo-v1',
      } }),
    } as Response);
    rememberPendingOAuthSignupConsent(true);

    await syncPendingSignupConsent('verified-oauth-user', 'oauth-token');

    expect(fetch).toHaveBeenCalledOnce();
    expect(window.sessionStorage.getItem(PENDING_OAUTH_KEY)).toBeNull();
  });

  it('expires an abandoned OAuth choice after fifteen minutes', async () => {
    rememberPendingOAuthSignupConsent(true);
    const pending = JSON.parse(window.sessionStorage.getItem(PENDING_OAUTH_KEY) || '{}');
    window.sessionStorage.setItem(PENDING_OAUTH_KEY, JSON.stringify({
      ...pending,
      createdAt: Date.now() - 16 * 60 * 1000,
    }));

    await syncPendingSignupConsent('verified-oauth-user', 'oauth-token');

    expect(fetch).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(PENDING_OAUTH_KEY)).toBeNull();
  });

  it('consumes pending consent before a failed request so it cannot be replayed', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    rememberPendingSignupConsent('user-1', true);

    await expect(syncPendingSignupConsent('user-1', 'token-1')).rejects.toThrow('offline');
    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('does not persist an unchecked optional signup choice', () => {
    rememberPendingSignupConsent('user-1', false);
    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('clears pending signup state after an authoritative profile update', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ consent: {
        quality_enabled: false,
        audio_enabled: false,
        capture_mode: 'off',
        notice_version: 'amber-quality-demo-v1',
      } }),
    } as Response);
    rememberPendingSignupConsent('user-1', true);

    await updateAnalysisConsent(false, false, 'profile', 'token-1');

    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('allows explicit cleanup during sign-out', () => {
    rememberPendingSignupConsent('user-1', true);
    clearPendingSignupConsent();
    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(PENDING_OAUTH_KEY)).toBeNull();
  });
});

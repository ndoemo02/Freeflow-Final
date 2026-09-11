import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ getSession: vi.fn(), callback: null }));
vi.mock('../lib/supabase', () => ({ SUPABASE_RUNTIME: {}, supabase: { auth: {
  getSession: mock.getSession,
  onAuthStateChange: callback => { mock.callback = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
} } }));
vi.mock('../lib/analysisConsent', () => ({
  syncPendingSignupConsent: vi.fn().mockResolvedValue(undefined), clearPendingSignupConsent: vi.fn(),
  rememberPendingOAuthSignupConsent: vi.fn(), rememberPendingSignupConsent: vi.fn(),
}));
import { AuthProvider, useAuth } from './auth';
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
beforeEach(() => { mock.getSession.mockReset(); });
afterEach(cleanup);

it('distinguishes unresolved auth from a signed-in owner', async () => {
  let resolve;
  mock.getSession.mockImplementation(() => new Promise(done => { resolve = done; }));
  const { result } = renderHook(() => useAuth(), { wrapper });
  expect(result.current.isLoading).toBe(true);
  await act(async () => resolve({ data: { session: { user: { id: 'a' } } } }));
  expect(result.current.isLoading).toBe(false);
  expect(result.current.user.id).toBe('a');
});

it('does not restore an old owner after a newer sign-out event', async () => {
  let resolve;
  mock.getSession.mockImplementation(() => new Promise(done => { resolve = done; }));
  const { result } = renderHook(() => useAuth(), { wrapper });
  await act(async () => mock.callback('SIGNED_OUT', null));
  await act(async () => resolve({ data: { session: { user: { id: 'a' } } } }));
  expect(result.current.user).toBeNull();
  expect(result.current.isLoading).toBe(false);
});

it('resolves a failed auth hydration as signed out', async () => {
  mock.getSession.mockRejectedValue(new Error('storage unavailable'));
  const { result } = renderHook(() => useAuth(), { wrapper });
  await act(async () => {});
  expect(result.current.user).toBeNull();
  expect(result.current.isLoading).toBe(false);
});

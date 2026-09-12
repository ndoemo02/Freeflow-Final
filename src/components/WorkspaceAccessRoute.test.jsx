import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ auth: null, token: vi.fn(), fetch: vi.fn() }));
vi.mock('../state/auth', () => ({ useAuth: () => mock.auth }));
vi.mock('../lib/supabase', () => ({ getAccessToken: mock.token }));
vi.mock('../lib/config', () => ({ getApiUrl: path => path }));
import { WorkspaceAccessRoute } from './WorkspaceAccessRoute';

function Harness() {
  return <MemoryRouter initialEntries={['/workspace']}><Routes>
    <Route path="/workspace" element={<WorkspaceAccessRoute><div>Protected workspace</div></WorkspaceAccessRoute>} />
    <Route path="/panel/client" element={<div>Consumer panel</div>} />
    <Route path="/" element={<div>Home</div>} />
  </Routes></MemoryRouter>;
}
const reply = (id, allowed) => ({ ok: true, json: async () => ({ ok: true, user_id: id, workspace_access: allowed }) });
beforeEach(() => {
  mock.auth = { user: { id: 'owner' }, isLoading: false };
  mock.token.mockReset().mockResolvedValue('current-jwt');
  mock.fetch.mockReset();
  vi.stubGlobal('fetch', mock.fetch);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each(['owner', 'staff'])('%s reaches workspace after backend allows, without metadata', async id => {
  mock.auth.user = { id };
  mock.fetch.mockResolvedValue(reply(id, true));
  render(<Harness />);
  expect(await screen.findByText('Protected workspace')).toBeTruthy();
  expect(screen.queryByText('Consumer panel')).toBeNull();
});
it('consumer is redirected even with former allowlist email and forged metadata', async () => {
  mock.auth.user = { id: 'consumer', email: 'ndoemo02@gmail.com',
    user_metadata: { workspace_access: true, role: 'owner', is_admin: true }, app_metadata: { workspace_access: true } };
  mock.fetch.mockResolvedValue(reply('consumer', false));
  render(<Harness />);
  expect(await screen.findByText('Consumer panel')).toBeTruthy();
  expect(screen.queryByText('Protected workspace')).toBeNull();
});
it('waits for auth hydration and delayed authorization before redirecting or rendering', async () => {
  mock.auth = { user: null, isLoading: true };
  let resolve;
  mock.fetch.mockImplementation(() => new Promise(done => { resolve = done; }));
  const view = render(<Harness />);
  expect(view.container.textContent).toBe('');
  expect(mock.fetch).not.toHaveBeenCalled();
  mock.auth = { user: { id: 'owner' }, isLoading: false };
  view.rerender(<Harness />);
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledTimes(1));
  expect(view.container.textContent).toBe('');
  await act(async () => resolve(reply('owner', true)));
  expect(await screen.findByText('Protected workspace')).toBeTruthy();
});
it('ignores late owner response after switching to a consumer', async () => {
  let resolveOwner, resolveConsumer;
  mock.fetch.mockImplementationOnce(() => new Promise(done => { resolveOwner = done; }))
    .mockImplementationOnce(() => new Promise(done => { resolveConsumer = done; }));
  const view = render(<Harness />);
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledTimes(1));
  mock.auth = { user: { id: 'consumer' }, isLoading: false };
  view.rerender(<Harness />);
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledTimes(2));
  await act(async () => resolveOwner(reply('owner', true)));
  expect(view.container.textContent).toBe('');
  await act(async () => resolveConsumer(reply('consumer', false)));
  expect(await screen.findByText('Consumer panel')).toBeTruthy();
});
it('revokes a resolved owner result immediately on sign-out', async () => {
  mock.fetch.mockResolvedValue(reply('owner', true));
  const view = render(<Harness />);
  await screen.findByText('Protected workspace');
  mock.auth = { user: null, isLoading: false };
  view.rerender(<Harness />);
  expect(screen.queryByText('Protected workspace')).toBeNull();
  expect(await screen.findByText('Home')).toBeTruthy();
});
it.each(['http', 'network', 'no-token'])('%s failure never opens the workspace', async kind => {
  if (kind === 'http') mock.fetch.mockResolvedValue({ ok: false });
  if (kind === 'network') mock.fetch.mockRejectedValue(new Error('offline'));
  if (kind === 'no-token') mock.token.mockResolvedValue(null);
  render(<Harness />);
  expect(await screen.findByText('Consumer panel')).toBeTruthy();
  expect(screen.queryByText('Protected workspace')).toBeNull();
});

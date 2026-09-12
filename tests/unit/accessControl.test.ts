import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const mock = vi.hoisted(() => ({ token: vi.fn(), fetch: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ getAccessToken: mock.token }));
vi.mock('../../src/lib/config', () => ({ getApiUrl: (path: string) => `https://backend.test${path}` }));
import { canAccessWorkspacePanels } from '../../src/lib/accessControl';
beforeEach(() => {
  mock.token.mockReset().mockResolvedValue('current-token');
  mock.fetch.mockReset();
  vi.stubGlobal('fetch', mock.fetch);
});
afterEach(() => vi.unstubAllGlobals());
const reply = (body: unknown) => mock.fetch.mockResolvedValue({ ok: true, json: async () => body });
describe('workspace access transport', () => {
  it('asks backend with current JWT and binds authorization to the requested user', async () => {
    reply({ ok: true, user_id: 'owner', workspace_access: true });
    expect(await canAccessWorkspacePanels('owner')).toBe(true);
    expect(mock.fetch).toHaveBeenCalledWith('https://backend.test/api/owner/workspace-access', expect.objectContaining({
      headers: { Authorization: 'Bearer current-token' }, cache: 'no-store',
    }));
    mock.token.mockResolvedValue('refreshed-token');
    await canAccessWorkspacePanels('owner');
    expect(mock.fetch.mock.lastCall?.[1].headers.Authorization).toBe('Bearer refreshed-token');
  });
  it.each([
    { ok: true, user_id: 'consumer', workspace_access: false },
    { ok: true, user_id: 'other-owner', workspace_access: true },
    { ok: true, user_id: 'consumer', workspace_access: 'true' },
    { user_id: 'consumer', workspace_access: true },
    null,
  ])('denies non-authoritative or negative responses %j', async body => {
    reply(body);
    expect(await canAccessWorkspacePanels('consumer')).toBe(false);
  });
  it('does not fetch without identity or token', async () => {
    expect(await canAccessWorkspacePanels('')).toBe(false);
    mock.token.mockResolvedValue(null);
    expect(await canAccessWorkspacePanels('owner')).toBe(false);
    expect(mock.fetch).not.toHaveBeenCalled();
  });
  it('does not trust an HTTP error carrying an allow body', async () => {
    mock.fetch.mockResolvedValue({ ok: false, json: async () => ({ ok: true, user_id: 'owner', workspace_access: true }) });
    await expect(canAccessWorkspacePanels('owner')).rejects.toThrow('workspace_access_unavailable');
  });
});

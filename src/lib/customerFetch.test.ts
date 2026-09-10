import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('./supabase', () => ({ getAccessToken: vi.fn() }));
import { getAccessToken } from './supabase';
import { customerFetch } from './customerFetch';
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('authenticated customer transport', () => {
  it('sends the current JWT and preserves body and content headers', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('fresh-token');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    await customerFetch('/api/orders', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer stale' } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/orders');
    expect(init.body).toBe('{}');
    expect(init.headers.get('Authorization')).toBe('Bearer fresh-token');
    expect(init.headers.get('Content-Type')).toBe('application/json');
  });
  it('does not send customer data without login', async () => {
    vi.mocked(getAccessToken).mockResolvedValue(null);
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(customerFetch('/api/orders')).rejects.toThrow('Zaloguj');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

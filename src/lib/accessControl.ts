import { getApiUrl } from './config';
import { getAccessToken } from './supabase';

// Membership capabilities from the backend are authoritative, never email/metadata.
export async function canAccessWorkspacePanels(userId: string, signal?: AbortSignal): Promise<boolean> {
  if (!userId) return false;
  const token = await getAccessToken();
  if (!token || signal?.aborted) return false;
  const response = await fetch(getApiUrl('/api/owner/workspace-access'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error('workspace_access_unavailable');
  const data = await response.json();
  return data?.ok === true && data.user_id === userId && data.workspace_access === true;
}

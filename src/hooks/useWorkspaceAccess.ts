import { useEffect, useState } from 'react';
import { useAuth } from '../state/auth';
import { canAccessWorkspacePanels } from '../lib/accessControl';

export function useWorkspaceAccess() {
  const { user, isLoading } = useAuth();
  const [result, setResult] = useState<{ user: typeof user; allowed: boolean } | null>(null);

  useEffect(() => {
    if (isLoading || !user?.id) return;
    const controller = new AbortController();
    canAccessWorkspacePanels(user.id, controller.signal)
      .then(allowed => {
        if (!controller.signal.aborted) setResult({ user, allowed });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ user, allowed: false });
      });
    return () => controller.abort();
  }, [user, isLoading]);

  // Bind the result to this auth snapshot, including token refresh/sign-out.
  const current = result?.user === user;
  return {
    isLoading: isLoading || (!!user?.id && !current),
    allowed: !isLoading && !!user?.id && current && result?.allowed === true,
  };
}

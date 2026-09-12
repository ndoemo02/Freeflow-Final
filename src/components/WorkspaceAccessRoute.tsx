import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/auth';
import { useWorkspaceAccess } from '../hooks/useWorkspaceAccess';
import { ROUTES } from '../app/routeConfig';

export function WorkspaceAccessRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  const access = useWorkspaceAccess();
  if (access.isLoading) return null;
  if (!user?.id) return <Navigate to={ROUTES.HOME} replace />;
  if (!access.allowed) return <Navigate to={ROUTES.PANEL_CLIENT} replace />;
  return children;
}

import { useAuth } from '../state/auth'
import { Navigate } from 'react-router-dom'

export default function AdminRoute({ children }) {
  const { user, role, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  if (role !== 'admin') return <Navigate to="/panel/profile" replace />
  return children
}



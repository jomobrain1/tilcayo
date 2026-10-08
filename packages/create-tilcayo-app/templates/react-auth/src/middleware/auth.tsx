import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../app/auth'
import { returnPath } from '../lib/auth-feedback'

// These guards control navigation. The API must still authorize every request.
export function RequireAuth({ role }: { role?: string }) {
  const { initialized, isAuthenticated, user } = useAuth()
  const location = useLocation()
  if (!initialized) return <p role="status">Checking your session…</p>
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
  if (role && !user?.roles?.includes(role)) return <Navigate to="/forbidden" replace />
  return <Outlet />
}

export const ProtectedRoute = RequireAuth

export function GuestOnly() {
  const { initialized, isAuthenticated } = useAuth()
  const location = useLocation()
  if (!initialized) return <p role="status">Checking your session…</p>
  return isAuthenticated ? <Navigate to={returnPath(location.state)} replace /> : <Outlet />
}

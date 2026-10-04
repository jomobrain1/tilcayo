import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../app/auth'
import { returnPath } from '../lib/auth-feedback'

// These guards control navigation. The API must still authorize every request.
export function RequireAuth() {
  const { initialized, isAuthenticated } = useAuth()
  const location = useLocation()
  if (!initialized) return <p role="status">Checking your session…</p>
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
}

export function GuestOnly() {
  const { initialized, isAuthenticated } = useAuth()
  const location = useLocation()
  if (!initialized) return <p role="status">Checking your session…</p>
  return isAuthenticated ? <Navigate to={returnPath(location.state)} replace /> : <Outlet />
}

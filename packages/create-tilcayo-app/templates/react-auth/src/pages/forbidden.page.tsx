import { useAuth } from '../app/auth'
import { ErrorPage } from '../components/error-page'

export function ForbiddenPage() {
  const { isAuthenticated } = useAuth()
  return <ErrorPage code="403" title="Access denied" description={isAuthenticated ? "You're signed in, but this page needs permissions your account doesn't have. Your dashboard is still available." : 'Sign in with an account that has permission to view this page, or return to the home page.'} primary={{ to: isAuthenticated ? '/dashboard' : '/login', label: isAuthenticated ? 'My dashboard' : 'Log in' }} secondary={{ to: '/', label: 'Back to home' }} note="Need access? Contact your administrator for help." />
}

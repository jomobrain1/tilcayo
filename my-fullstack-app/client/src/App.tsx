import { SessionSkeleton } from './components/session-skeleton'
import { BrowserRouter, useRoutes } from 'react-router'
import { routes } from './routes'
import { AuthBootstrap } from './app/auth'
import './App.css'

function AppRoutes() {
  return useRoutes(routes)
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap fallback={<SessionSkeleton />}>
        <AppRoutes />
      </AuthBootstrap>
    </BrowserRouter>
  )
}

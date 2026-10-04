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
      <AuthBootstrap fallback={<p className="tl-container starter-main" role="status">Checking your session...</p>}>
        <AppRoutes />
      </AuthBootstrap>
    </BrowserRouter>
  )
}

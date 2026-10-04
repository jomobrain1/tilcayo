import { BrowserRouter, useRoutes } from 'react-router'
import { routes } from './routes'
import './App.css'

function AppRoutes() {
  return useRoutes(routes)
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

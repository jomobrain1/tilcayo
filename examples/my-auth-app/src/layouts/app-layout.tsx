import { Outlet } from 'react-router'
import { Navigation } from '../components/navigation'
import { Toaster } from '../components/toaster'

export function AppLayout() {
  return (
    <>
      <a className="starter-skip" href="#main">Skip to content</a>
      <header className="starter-header"><Navigation /></header>
      <main id="main" className="tl-container starter-main" tabIndex={-1}>
        <Outlet />
      </main>
      <Toaster />
    </>
  )
}

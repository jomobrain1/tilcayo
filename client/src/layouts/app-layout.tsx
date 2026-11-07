import { Outlet } from 'react-router'
import { SiteHeader } from '../components/site-header'

export function AppLayout() {
  return (
    <div className="starter-site">
      <a className="starter-skip" href="#main">Skip to content</a>
      <SiteHeader />
      <main id="main" className="tl-container starter-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router'
import { HomePage } from './pages/home.page'
import { ElementsPage } from './pages/elements.page'
import { AboutPage } from './pages/about.page'
import { AuthBootstrap, useAuth } from './app/auth'
import { RequireAuth, GuestOnly } from './middleware/auth'
import { LoginPage } from './pages/login.page'
import { RegisterPage } from './pages/register.page'
import { DashboardPage } from './pages/dashboard.page'
import './App.css'

function Navigation() {
  const { isAuthenticated, logout, logoutStatus } = useAuth()
  const [notice, setNotice] = useState('')
  async function signOut() {
    setIsOpen(false)
    setNotice('')
    try { await logout() } catch { setNotice('Signed out on this device. The server could not confirm sign-out; please try again when connected.') }
  }
  const [isOpen, setIsOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 48rem)')
    const closeOnResize = () => setIsOpen(false)
    desktop.addEventListener('change', closeOnResize)
    return () => desktop.removeEventListener('change', closeOnResize)
  }, [])

  return (
    <nav
      className="tl-container starter-nav"
      aria-label="Main navigation"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          setIsOpen(false)
          toggleRef.current?.focus()
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
      }}
    >
      <Link className="starter-brand" to="/" onClick={() => setIsOpen(false)}>Tilcayo</Link>
      <button
        ref={toggleRef}
        className="starter-menu-toggle"
        type="button"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls="starter-navigation-links"
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d={isOpen ? 'M6 6l12 12M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'} />
        </svg>
      </button>
      <div id="starter-navigation-links" className={`starter-nav-links${isOpen ? ' is-open' : ''}`}>
        <NavLink to="/" end onClick={() => setIsOpen(false)}>Home</NavLink>
        <NavLink to="/elements" onClick={() => setIsOpen(false)}>Elements</NavLink>
        <NavLink to="/about" onClick={() => setIsOpen(false)}>About</NavLink>
        {isAuthenticated ? <>
          <NavLink to="/dashboard" onClick={() => setIsOpen(false)}>Dashboard</NavLink>
          <button className="tl-btn tl-btn-outline" type="button" onClick={signOut} disabled={logoutStatus.isLoading}>Log out</button>
        </> : <>
          <NavLink to="/login" onClick={() => setIsOpen(false)}>Log in</NavLink>
          <NavLink to="/register" onClick={() => setIsOpen(false)}>Register</NavLink>
        </>}
        {notice && <p role="status">{notice}</p>}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap fallback={<p className="tl-container starter-main" role="status">Checking your session?</p>}>
      <a className="starter-skip" href="#main">Skip to content</a>
      <header className="starter-header">
        <Navigation />
      </header>
      <main id="main" className="tl-container starter-main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/elements" element={<ElementsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
          <Route path="*" element={<section className="tl-stack"><h1 className="tl-heading-1">404 - Page not found</h1><div><Link className="tl-btn tl-btn-primary" to="/">Back to home</Link></div></section>} />
        </Routes>
      </main>
      </AuthBootstrap>
    </BrowserRouter>
  )
}

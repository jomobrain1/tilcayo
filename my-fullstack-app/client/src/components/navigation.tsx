import { Skeleton } from '@tilcayo/ui'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '../app/auth'
import { BrandMark } from './starter-visuals'
import { AccountIcon } from './account-icon'

const adminEnabled = false

export function Navigation() {
  const { user, initialized, isAuthenticated, logout, logoutStatus } = useAuth()
  const [notice, setNotice] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)
  const accountToggleRef = useRef<HTMLButtonElement>(null)
  const accountId = useId()
  const canAdmin = adminEnabled && ((user?.platformRole === 'superadmin' && !user?.tenant) || user?.roles?.includes('admin') || !!user?.adminTabs?.length)
  const close = () => { setIsOpen(false); setAccountOpen(false) }
  async function signOut() {
    close(); setNotice('')
    try { await logout() } catch { setNotice('Signed out on this device. The server could not confirm sign-out; please try again when connected.') }
  }
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 48rem)')
    const closeOnResize = () => setIsOpen(false)
    const closeOutside = (event: PointerEvent) => { if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false) }
    desktop.addEventListener('change', closeOnResize)
    document.addEventListener('pointerdown', closeOutside)
    return () => { desktop.removeEventListener('change', closeOnResize); document.removeEventListener('pointerdown', closeOutside) }
  }, [])
  return <nav className="starter-nav" aria-label="Main navigation" onKeyDown={event => {
    if (event.key === 'Escape') {
      if (accountOpen) { setAccountOpen(false); accountToggleRef.current?.focus() }
      else if (isOpen) { setIsOpen(false); toggleRef.current?.focus() }
    }
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close() }}>
    <Link className="starter-brand" to="/" onClick={close}><BrandMark />Tilcayo</Link>
    <button ref={toggleRef} className="starter-menu-toggle" type="button" aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isOpen} aria-controls="starter-navigation-links" onClick={() => { setIsOpen(!isOpen); setAccountOpen(false) }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d={isOpen ? 'M6 6l12 12M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
    </button>
    <div id="starter-navigation-links" className={`starter-nav-panel${isOpen ? ' is-open' : ''}`}>
      <div className="starter-nav-links">
        <NavLink to="/" end onClick={close}>Home</NavLink>
        <NavLink to="/elements" onClick={close}>Elements</NavLink>
        <NavLink to="/about" onClick={close}>About</NavLink>
      </div>
      {initialized && !isAuthenticated && <div className="starter-nav-actions">
        <NavLink to="/login" onClick={close}>Log in</NavLink>
        <NavLink className="starter-get-started" to="/register" onClick={close}>Get Started</NavLink>
      </div>}
    </div>
    {!initialized && <div className="starter-account" aria-label="Checking session"><Skeleton width={38} height={38} circle /></div>}
    {isAuthenticated && <div className="starter-account" ref={accountRef} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setAccountOpen(false) }}>
      <button ref={accountToggleRef} className="starter-account-toggle" type="button" aria-label="Open account menu" aria-expanded={accountOpen} aria-controls={accountId} onClick={() => { setAccountOpen(!accountOpen); setIsOpen(false) }}>
        <span className="starter-account-avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user?.name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'Me'}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {accountOpen && <div className="starter-account-popover" id={accountId}>
        <div className="starter-account-summary"><strong>{user?.name}</strong><span>{user?.email}</span></div>
        <NavLink to="/dashboard" onClick={close}><AccountIcon name="dashboard" /> My dashboard</NavLink>
        {user?.platformRole === 'superadmin' && !user.tenant && <><NavLink to="/admin" onClick={close}><AccountIcon name="shield" /> Platform administration</NavLink><NavLink to="/admin/workspaces" onClick={close}><AccountIcon name="dashboard" /> Tenant administration</NavLink></>}
        {canAdmin && !(user?.platformRole === 'superadmin' && !user.tenant) && <NavLink to="/admin" onClick={close}><AccountIcon name="shield" /> {user?.tenancyEnabled ? 'Workspace administration' : 'Admin'}</NavLink>}
        <NavLink to="/profile" onClick={close}><AccountIcon name="user" /> Profile &amp; settings</NavLink>
        <div className="starter-account-divider" />
        <button type="button" onClick={() => void signOut()} disabled={logoutStatus.isLoading}><AccountIcon name="logout" /> {logoutStatus.isLoading ? 'Signing out...' : 'Sign out'}</button>
      </div>}
    </div>}
    {notice && <p className="starter-nav-notice" role="status">{notice}</p>}
  </nav>
}

import { ProfilePhoto } from '../components/profile-photo'
import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../app/auth'
import { AccountIcon } from '../components/account-icon'
import { authErrorMessage } from '../lib/auth-feedback'
import { toast } from '../lib/toast'

export function ProfilePage() {
  const { user, updateProfile, updateProfileStatus, logout, logoutStatus } = useAuth()
  const navigate = useNavigate()
  const { hash } = useLocation()
  useEffect(() => {
    if (hash !== '#account-security' && hash !== '#account-details') return
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(frame)
  }, [hash])
  const [editing, setEditing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [locale, setLocale] = useState(() => {
    try { return localStorage.getItem('tilcayo-date-format') === 'en-GB' ? 'en-GB' : 'en-US' } catch { return 'en-US' }
  })
  const initials = user?.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'Me'
  const role = user?.platformRole === 'superadmin' && !user?.tenant ? 'Super Admin' : user?.roles?.includes('admin') ? 'Administrator' : user?.adminTabs?.length ? 'Staff' : 'Member'
  const date = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)) : 'Not available'
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      await updateProfile({ name: String(new FormData(event.currentTarget).get('name') ?? '').trim() })
      setEditing(false)
      toast.success('Profile updated.')
    } catch (failure) { setError(authErrorMessage(failure)) }
  }
  async function signOut(reset = false) {
    try { await logout() } catch { toast.warning('Signed out on this browser. The server could not confirm sign-out.') }
    navigate(reset ? '/forgot-password' : '/login')
  }
  return <section className="account-dashboard" aria-labelledby="account-title">
    <header className="account-page-heading"><h1 id="account-title">Profile &amp; settings</h1><p>Manage your profile, security, and activity.</p></header>
    <div className="account-grid">
      <div className="account-column">
        <section className="account-card account-identity" aria-label="Your profile">
          <span className="account-avatar" aria-hidden="true">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}</span>
          <div className="account-identity-copy"><h2>{user?.name}</h2><p>{user?.email}</p><span className="account-role">{role}</span></div>
          <button className="tl-btn tl-btn-primary account-edit" onClick={() => { setEditing(!editing); setError('') }} aria-expanded={editing} aria-controls="account-edit-form"><AccountIcon name="edit" /> Edit profile</button>
          {editing && <form id="account-edit-form" className="account-edit-form" onSubmit={saveProfile}>
            <div className="tl-form-group"><label className="tl-label" htmlFor="account-name">Display name</label><input className="tl-input" id="account-name" name="name" defaultValue={user?.name} required minLength={2} maxLength={100} autoComplete="name" autoFocus /></div>
            {error && <p className="tl-alert tl-alert-danger" role="alert">{error}</p>}
            <div className="account-form-actions"><button className="tl-btn tl-btn-outline" type="button" onClick={() => setEditing(false)}>Cancel</button><button className="tl-btn tl-btn-primary" disabled={updateProfileStatus.isLoading}>{updateProfileStatus.isLoading ? 'Saving...' : 'Save changes'}</button></div>
          </form>}
          <ProfilePhoto />
        </section>
        <section className="account-card" id="account-details"><h2>Account details</h2>
          <dl className="account-details">
            <div><dt><AccountIcon name="mail" /> Email</dt><dd>{user?.email}</dd></div>
            <div><dt><AccountIcon name="user" /> Display name</dt><dd>{user?.name}</dd></div>
            <div><dt><AccountIcon name="calendar" /> Joined</dt><dd>{date(user?.createdAt)}</dd></div>
          </dl>
        </section>
        <section className="account-card" id="account-security"><h2>Security</h2>
          <div className="account-security-row"><span><AccountIcon name="lock" /> Password</span><button onClick={() => setResetting(!resetting)} aria-expanded={resetting} aria-controls="account-reset">Reset password <AccountIcon name="arrow" /></button></div>
          {resetting && <div id="account-reset" className="account-reset-note"><p>Continue to sign out and reset your password by email.</p><button className="tl-btn tl-btn-outline" disabled={logoutStatus.isLoading} onClick={() => void signOut(true)}>Continue to password reset</button></div>}
          <div className="account-security-row"><span><AccountIcon name="shield" /> Access level</span><span className="account-role">{role}</span></div>
          <div className="account-security-row"><span><AccountIcon name="monitor" /> This browser</span><button disabled={logoutStatus.isLoading} onClick={() => void signOut()}>Sign out <AccountIcon name="arrow" /></button></div>
        </section>
      </div>
      <div className="account-column">
        <section className="account-card"><h2>Quick actions</h2><div className="account-quick-actions">
          <button onClick={() => { setEditing(true); setError('') }}><span className="account-icon-tile"><AccountIcon name="edit" /></span><span>Edit profile</span><AccountIcon name="arrow" /></button>
          <a href="#account-security" onClick={() => setResetting(true)}><span className="account-icon-tile"><AccountIcon name="lock" /></span><span>Reset password</span><AccountIcon name="arrow" /></a>
          <a href="#account-security"><span className="account-icon-tile"><AccountIcon name="monitor" /></span><span>Review security</span><AccountIcon name="arrow" /></a>
        </div></section>
        <section className="account-card"><h2>Account activity</h2><div className="account-activity">
          <div><span className="account-icon-tile"><AccountIcon name="monitor" /></span><p><strong>Current session</strong><span>Signed in on this browser</span></p></div>
          {user?.updatedAt && <div><span className="account-icon-tile"><AccountIcon name="edit" /></span><p><strong>Account last updated</strong><span>{date(user.updatedAt)}</span></p></div>}
          {user?.createdAt && <div><span className="account-icon-tile"><AccountIcon name="user" /></span><p><strong>Account created</strong><span>{date(user.createdAt)}</span></p></div>}
        </div></section>
        <section className="account-card"><h2>Preferences</h2><div className="account-preference"><label htmlFor="account-date-format"><AccountIcon name="globe" /> Date format</label><select id="account-date-format" className="tl-select" value={locale} onChange={event => { setLocale(event.target.value); try { localStorage.setItem('tilcayo-date-format', event.target.value) } catch { /* Preference works for this visit. */ } }}><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option></select></div><p className="account-preference-note">Used for dates on this profile page.</p></section>
      </div>
    </div>
  </section>
}

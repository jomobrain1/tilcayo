import { Link } from 'react-router'
import { useAuth } from '../app/auth'
import { AccountIcon } from '../components/account-icon'

export function DashboardPage() {
  const { user } = useAuth()
  const firstName = user?.name.trim().split(/\s+/)[0] || 'there'
  const role = user?.platformRole === 'superadmin' && !user?.tenant ? 'Super Admin' : user?.roles?.includes('admin') ? 'Administrator' : user?.adminTabs?.length ? 'Staff' : 'Member'
  const joined = user?.createdAt && Number.isFinite(Date.parse(user.createdAt))
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(user.createdAt)) : 'Not available'
  return <section className="account-dashboard user-dashboard" aria-labelledby="dashboard-title">
    <header className="account-page-heading"><h1 id="dashboard-title">Dashboard</h1><p>Welcome back, {firstName}. Here’s your workspace at a glance.</p></header>
    <div className="user-dashboard-summary">
      <section className="account-card user-summary-card"><span className="account-icon-tile"><AccountIcon name="user" /></span><div><p>Account type</p><h2>{role}</h2></div></section>
      <section className="account-card user-summary-card"><span className="account-icon-tile"><AccountIcon name="calendar" /></span><div><p>Member since</p><h2>{joined}</h2></div></section>
      <section className="account-card user-summary-card"><span className="account-icon-tile"><AccountIcon name="shield" /></span><div><p>Current session</p><h2><span className="user-session-dot" /> Signed in</h2></div></section>
    </div>
    <div className="user-dashboard-grid">
      <div className="account-column">
        <section className="account-card user-workspace"><div className="user-card-heading"><h2>Your workspace</h2><p>Pick up where you left off.</p></div>
          <div className="user-workspace-links">
            <Link to="/elements"><span className="account-icon-tile"><AccountIcon name="dashboard" /></span><div><h3>Explore elements</h3><p>Find the building blocks for your next idea.</p></div><AccountIcon name="arrow" /></Link>
            <Link to="/profile"><span className="account-icon-tile"><AccountIcon name="user" /></span><div><h3>Profile &amp; settings</h3><p>Update your details and account preferences.</p></div><AccountIcon name="arrow" /></Link>
            <Link to="/profile#account-security"><span className="account-icon-tile"><AccountIcon name="lock" /></span><div><h3>Account security</h3><p>Review your sign-in and password options.</p></div><AccountIcon name="arrow" /></Link>
          </div>
        </section>
        <section className="account-card user-getting-started"><span className="account-icon-tile"><AccountIcon name="globe" /></span><div><h2>Get to know Tilcayo</h2><p>Learn more about the toolkit behind your workspace.</p><Link to="/about">About Tilcayo <AccountIcon name="arrow" /></Link></div></section>
      </div>
      <aside className="account-column" aria-label="Account overview">
        <section className="account-card user-account-snapshot"><h2>Account overview</h2><span className="account-avatar" aria-hidden="true">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user?.name.trim().split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase() || 'Me'}</span><h3>{user?.name}</h3><p>{user?.email}</p><span className="account-role">{role}</span><Link className="tl-btn tl-btn-outline" to="/profile">View profile &amp; settings <AccountIcon name="arrow" /></Link></section>
        <section className="account-card user-dashboard-note"><span className="account-icon-tile"><AccountIcon name="shield" /></span><div><h2>You’re in control</h2><p>Your profile, password reset, and browser sign-out are together in Profile &amp; settings.</p></div></section>
      </aside>
    </div>
  </section>
}

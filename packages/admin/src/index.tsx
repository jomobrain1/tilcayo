import { useId, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useSearchParams } from "react-router";
import { Alert, Badge, Button, Card, Table } from "@tilcayo/ui";

export interface AdminUser {
  name: string;
  email: string;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}
export interface AdminLink { label: string; to: string }
export interface AdminDirectoryUser extends AdminUser { id: string }
export interface AdminStats {
  totalUsers: number;
  adminUsers: number;
  recentUsers: number;
}
export interface AdminUsersResponse {
  items: AdminDirectoryUser[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    lastPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  stats: AdminStats;
}
interface AdminLayoutProps {
  sections?: { id: string; label: string }[];
  title?: string;
  basePath?: string;
  user?: AdminUser | null;
  links?: AdminLink[];
  onLogout?: () => unknown | Promise<unknown>;
  children?: ReactNode;
}

export type AdminIconKind = 'users' | 'shield' | 'plus' | 'box' | 'check' | 'alert' | 'close' | 'profile' | 'settings' | 'lock';
export type AdminTone = 'blue' | 'green' | 'purple' | 'amber' | 'red';
export function AdminIcon({ kind = 'users', tone = 'blue' }: { kind?: AdminIconKind; tone?: AdminTone }) {
  const paths = {
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8m6 10v-2a4 4 0 0 0-3-3M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Z',
    plus: 'M12 5v14M5 12h14',
    box: 'm12 3 9 5v8l-9 5-9-5V8Zm0 10v8M3 8l9 5 9-5M7.5 5.5l9 5',
    check: 'm8 12 3 3 5-6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    alert: 'm12 3 10 18H2ZM12 9v4m0 3v.1',
    close: 'm9 9 6 6m0-6-6 6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',
    lock: 'M5 11h14v10H5ZM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
    profile: 'M20 21v-2a8 8 0 0 0-16 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  };
  return <span className={'tl-admin-icon tl-admin-tone-' + tone} aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]} /></svg></span>;
}

export function AdminMetricCard({ label, value, note, icon = 'users', tone = 'blue' }: { label: string; value?: number; note: string; icon?: AdminIconKind; tone?: AdminTone }) {
  return <Card className="tl-admin-metric"><AdminIcon kind={icon} tone={tone} /><div><span>{label}</span><strong>{value?.toLocaleString() ?? '—'}</strong><small>{note}</small></div></Card>;
}

export function AdminUserStats({ stats, extraMetric }: { stats?: AdminStats; extraMetric?: ReactNode }) {
  return <div className={extraMetric ? "tl-admin-stats tl-admin-overview-stats" : "tl-admin-stats"}>
    <AdminMetricCard label="Total users" value={stats?.totalUsers} note="Registered accounts" />
    <AdminMetricCard label="Administrators" value={stats?.adminUsers} note="Users with the admin role" icon="shield" tone="green" />
    <AdminMetricCard label="New this week" value={stats?.recentUsers} note="Joined in the last 7 days" icon="plus" tone="purple" />
    {extraMetric}
  </div>;
}

function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <span className="tl-admin-avatar" aria-hidden="true">{initials || '?'}</span>;
}

function UserIdentity({ user, showEmail = true }: { user: AdminUser; showEmail?: boolean }) {
  return <div className="tl-admin-person">
    <Avatar name={user.name} />
    <div><strong>{user.name}</strong>{showEmail && <small>{user.email}</small>}</div>
  </div>;
}

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });
function JoinedDate({ value }: { value?: string }) {
  if (!value || Number.isNaN(Date.parse(value))) return <>—</>;
  return <time dateTime={value}>{dateFormat.format(new Date(value))}</time>;
}

function NavIcon({ index }: { index: number }) {
  const paths = ["M3 10 12 3l9 7v11h-6v-7H9v7H3Z", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8m6 10v-2a4 4 0 0 0-3-3M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z", "m12 3 9 5v8l-9 5-9-5V8Zm0 10v8M3 8l9 5 9-5M7.5 5.5l9 5", "M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"];
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[index] ?? "M4 4h16v16H4ZM4 10h16M10 10v10"} /></svg>;
}

// Route protection belongs to the surrounding app's auth guard.
export function AdminLayout({ title = "Tilcayo", basePath = "/admin", user, links = [], sections = [], onLogout, children }: AdminLayoutProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('section') ?? sections[0]?.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const menuId = useId();
  async function logout() {
    setBusy(true);
    setError("");
    try { await onLogout?.(); }
    catch { setError("Unable to complete server logout. Please try again."); }
    finally { setBusy(false); }
  }
  const navigation = [
    { label: "Overview", to: basePath },
    { label: "Users", to: `${basePath}/users` },
    { label: "Products", to: `${basePath}/products` },
    { label: "Profile", to: `${basePath}/profile` },
    ...links,
  ];
  return <div className="tl-admin-shell">
    <a className="tl-admin-skip" href="#admin-main">Skip to content</a>
    <header className="tl-admin-header">
      <div className="tl-admin-brand">
        <span className="tl-admin-logo" aria-hidden="true">{title.slice(0, 1)}</span>
        <div><strong>{title}</strong><small>Administration</small></div>
      </div>
      <Button className="tl-admin-toggle" variant="outline" aria-controls={menuId} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>Menu</Button>
    </header>
    <aside id={menuId} className={`tl-admin-sidebar${menuOpen ? " tl-admin-sidebar-open" : ""}`}>
      <nav aria-label="Admin navigation">
        {navigation.map((link, index) => (
          <NavLink key={link.to} to={link.to} end={link.to === basePath} onClick={() => setMenuOpen(false)}>
            <NavIcon index={index} /><span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <footer className="tl-admin-account">
        {user && <span className="tl-admin-account-email" title={user.email}>{user.email}</span>}
        {onLogout && <Button variant="outline" disabled={busy} onClick={() => void logout()}>
          {busy ? "Signing out..." : "Sign out"}
        </Button>}
      </footer>
    </aside>
    <div className="tl-admin-topbar">
      {sections.length > 0 && <div className="tl-admin-section-tabs" role="group" aria-label="Page sections">
        {sections.map(tab => <button type="button" key={tab.id} aria-pressed={section === tab.id || (!sections.some(item => item.id === section) && tab.id === sections[0].id)} onClick={() => {
          const next = new URLSearchParams(searchParams);
          next.set('section', tab.id);
          setSearchParams(next);
          setMenuOpen(false);
        }}>{tab.label}</button>)}
      </div>}
      {user && <div className="tl-admin-topbar-actions">
        <Link className="tl-admin-notifications" to={`${basePath}?section=summary`} aria-label="View recent activity" title="Recent activity">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        </Link>
        <details className="tl-admin-topbar-user" onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
        }} onKeyDown={event => {
          if (event.key === 'Escape') {
            event.currentTarget.open = false;
            event.currentTarget.querySelector('summary')?.focus();
          }
        }}>
          <summary><UserIdentity user={user} showEmail={false} /><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>
          <div className="tl-admin-account-menu">
            <span title={user.email}>{user.email}</span>
            <Link to={`${basePath}/profile`} onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}>Your profile</Link>
            {onLogout && <button type="button" disabled={busy} onClick={event => {
              event.currentTarget.closest('details')?.removeAttribute('open');
              void logout();
            }}>{busy ? 'Signing out...' : 'Sign out'}</button>}
          </div>
        </details>
      </div>}
    </div>
    <main id="admin-main" tabIndex={-1} className="tl-admin-main">
      {error && <Alert variant="danger">{error}</Alert>}
      {children ?? <Outlet />}
    </main>
  </div>;
}

export function AdminDashboard({ user, stats, extraMetric, children }: { user?: AdminUser | null; stats?: AdminStats; extraMetric?: ReactNode; children?: ReactNode }) {
  return <ResourceLayout title={`Welcome${user ? `, ${user.name}` : ''}`} description="Manage your application resources and keep your community in view.">
    <AdminUserStats stats={stats} extraMetric={extraMetric} />
    {children}
  </ResourceLayout>;
}

export function AdminUsersTable({ users }: { users: AdminDirectoryUser[] }) {
  return <Table>
    <caption className="tl-sr-only">Registered users and their roles</caption>
    <thead><tr><th scope="col">User</th><th scope="col">Email address</th><th scope="col">Roles</th><th scope="col">Joined</th></tr></thead>
    <tbody>
      {users.map(user => <tr key={user.id}>
        <td><UserIdentity user={user} showEmail={false} /></td>
        <td className="tl-admin-user-email">{user.email}</td>
        <td><div className="tl-admin-roles">
          {(user.roles?.length ? user.roles : ['member']).map(role => (
            <Badge key={role} variant={role === 'admin' ? 'success' : 'neutral'}>{role}</Badge>
          ))}
        </div></td>
        <td><JoinedDate value={user.createdAt} /></td>
      </tr>)}
      {!users.length && <tr><td colSpan={4}><div className="tl-admin-empty">
        <strong>No users found</strong><p>Try a different name, email, or role filter.</p>
      </div></td></tr>}
    </tbody>
  </Table>;
}

export function AdminUserList({ users, showJoined = false }: { users: AdminDirectoryUser[]; showJoined?: boolean }) {
  return <ul className="tl-admin-user-preview">
    {users.map(user => <li key={user.id}>
      <Avatar name={user.name} />
      <div><strong>{user.name}</strong><small>{showJoined ? <>Joined <JoinedDate value={user.createdAt} /></> : user.email}</small></div>
      <Badge variant={user.roles?.includes('admin') ? 'success' : 'neutral'}>{user.roles?.includes('admin') ? 'admin' : 'member'}</Badge>
    </li>)}
    {!users.length && <li className="tl-admin-preview-empty">No accounts to show yet.</li>}
  </ul>;
}

function ProfilePanel({ title, note, icon, tone, actions, children }: { title: string; note: string; icon: AdminIconKind; tone: AdminTone; actions?: ReactNode; children: ReactNode }) {
  return <Card className="tl-admin-detail-panel tl-admin-profile-panel">
    <header><AdminIcon kind={icon} tone={tone} /><div><h2>{title}</h2><p>{note}</p></div>{actions}</header>
    {children}
  </Card>;
}

export function AdminProfile({ user, basePath = '/admin', onRefreshSession }: { user?: AdminUser | null; basePath?: string; onRefreshSession?: () => Promise<unknown> }) {
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const roles = user?.roles?.length ? user.roles : ['member'];
  const isAdmin = roles.includes('admin');
  async function refreshSession() {
    setRefreshing(true);
    setFeedback(null);
    try {
      await onRefreshSession?.();
      setFeedback({ message: 'Your account details are up to date.', error: false });
    } catch {
      setFeedback({ message: 'Unable to refresh your session. Please try again.', error: true });
    } finally { setRefreshing(false); }
  }
  return <ResourceLayout title="My profile" description="Your personal details, account information and access at a glance.">
    {feedback && <Alert variant={feedback.error ? 'danger' : 'success'}>{feedback.message}</Alert>}
    <div className="tl-admin-profile-grid">
      <Card className="tl-admin-profile-identity">
        <Avatar name={user?.name ?? '?'} />
        <div><h2>{user?.name ?? 'Your account'}</h2><p className="tl-admin-profile-subtitle">{isAdmin ? 'Application administrator' : 'Application member'}</p></div>
        <div className="tl-admin-roles">{roles.map(role => <Badge key={role} variant={role === 'admin' ? 'success' : 'neutral'}>{role}</Badge>)}</div>
        <div className="tl-admin-profile-contact">
          <div><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 5h18v14H3Zm0 0 9 8 9-8" /></svg><span>{user?.email ?? '—'}</span></div>
          <div><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16" /></svg><span>Member since <JoinedDate value={user?.createdAt} /></span></div>
        </div>
        <div className="tl-admin-profile-account-note"><AdminIcon kind="shield" tone="green" /><div><strong>{isAdmin ? 'Administrator access' : 'Member access'}</strong><small>{isAdmin ? 'Manage your application from one place.' : 'Access your application account.'}</small></div></div>
      </Card>
      <div className="tl-admin-profile-panels">
        <ProfilePanel title="Personal information" note="Your name and contact details." icon="profile" tone="blue">
          <dl><dt>Full name</dt><dd>{user?.name ?? '—'}</dd><dt>Email address</dt><dd>{user?.email ?? '—'}</dd></dl>
        </ProfilePanel>
        <ProfilePanel title="Account details" note="Your account and membership." icon="settings" tone="green">
          <dl><dt>Account type</dt><dd><Badge variant={isAdmin ? 'success' : 'neutral'}>{isAdmin ? 'Administrator' : 'Member'}</Badge></dd><dt>Member since</dt><dd><JoinedDate value={user?.createdAt} /></dd><dt>Last updated</dt><dd><JoinedDate value={user?.updatedAt} /></dd></dl>
        </ProfilePanel>
        <ProfilePanel title="Security" note="Your current sign-in and recovery." icon="lock" tone="purple" actions={onRefreshSession && <Button variant="outline" disabled={refreshing} onClick={() => void refreshSession()}>{refreshing ? 'Refreshing...' : 'Refresh session'}</Button>}>
          <dl><dt>Session</dt><dd><Badge variant={user ? 'success' : 'neutral'}>{user ? 'Signed in' : 'Signed out'}</Badge></dd><dt>Recovery email</dt><dd>{user?.email ?? '—'}</dd></dl>
          <p className="tl-admin-panel-note">To reset your password, sign out and choose Forgot password on the login screen.</p>
        </ProfilePanel>
        <ProfilePanel title="Permissions & roles" note="The access assigned to your account." icon="shield" tone="amber">
          <dl><dt>Roles</dt><dd><div className="tl-admin-roles">{roles.map(role => <Badge key={role} variant={role === 'admin' ? 'success' : 'neutral'}>{role}</Badge>)}</div></dd><dt>Access level</dt><dd>{isAdmin ? 'Application administration' : 'Member access'}</dd></dl>
          <p className="tl-admin-panel-note">{isAdmin ? 'Manage users, products, inventory and orders.' : 'Contact your administrator to request additional access.'}</p>
        </ProfilePanel>
      </div>
    </div>
    {isAdmin && <section className="tl-admin-directory" aria-label="Management shortcuts">
      <header className="tl-admin-directory-heading"><div><h2>Your workspace</h2><p>Quick access to the areas you manage.</p></div></header>
      <div className="tl-admin-quick-actions">{[
        { to: basePath + '/users', title: 'User management', note: 'Accounts and access roles', icon: 'users' as const, tone: 'blue' as const },
        { to: basePath + '/products', title: 'Product catalog', note: 'Products and inventory', icon: 'box' as const, tone: 'green' as const },
        { to: basePath + '/products?section=orders', title: 'Orders', note: 'Review and track orders', icon: 'check' as const, tone: 'purple' as const },
      ].map(link => <Link key={link.to} to={link.to}><AdminIcon kind={link.icon} tone={link.tone} /><div><strong>{link.title}</strong><small>{link.note}</small></div><span className="tl-admin-action-arrow" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg></span></Link>)}</div>
    </section>}
  </ResourceLayout>;
}

export function ResourceLayout({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return <section className="tl-admin-resource tl-stack">
    <header className="tl-admin-page-heading">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {actions}
    </header>
    {children}
  </section>;
}

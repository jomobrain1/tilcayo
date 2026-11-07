import { useId, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useSearchParams } from "react-router";
import { Alert, Badge, Button, Card, Table, Skeleton, PageSkeleton } from "@tilcayo/ui";

export interface AdminUser {
  avatarUrl?: string;
  name: string;
  email: string;
  roles?: string[];
  adminTabs?: string[];
  platformRole?: 'superadmin';
  tenancyEnabled?: boolean;
  tenant?: { id: string; name: string; slug: string };
  createdAt?: string;
  updatedAt?: string;
  suspendedAt?: string | null;
}
export interface AdminLink { label: string; to: string; group?: string; tab?: string }
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
  pending?: boolean;
  sections?: { id: string; label: string }[];
  title?: string;
  basePath?: string;
  homePath?: string;
  user?: AdminUser | null;
  links?: AdminLink[];
  onLogout?: () => unknown | Promise<unknown>;
  children?: ReactNode;
  showGroupHeadings?: boolean;
  accountContent?: ReactNode;
  onGroupHeadingsChange?: (value: boolean) => void;
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

export function AdminMetricCard({ label, value, note, icon = 'users', tone = 'blue', loading = false }: { label: string; value?: number; note: string; icon?: AdminIconKind; tone?: AdminTone; loading?: boolean }) {
  return <Card className="tl-admin-metric"><AdminIcon kind={icon} tone={tone} /><div><span>{label}</span><strong aria-label={loading ? 'Loading ' + label : undefined}>{loading ? <Skeleton width={64} height={28} /> : value?.toLocaleString() ?? '—'}</strong><small>{note}</small></div></Card>;
}

export function AdminUserStats({ stats, extraMetric }: { stats?: AdminStats; extraMetric?: ReactNode }) {
  return <div className={extraMetric ? "tl-admin-stats tl-admin-overview-stats" : "tl-admin-stats"}>
    <AdminMetricCard label="Total users" value={stats?.totalUsers} note="Registered accounts" />
    <AdminMetricCard label="Administrators" value={stats?.adminUsers} note="Users with the admin role" icon="shield" tone="green" />
    <AdminMetricCard label="New this week" value={stats?.recentUsers} note="Joined in the last 7 days" icon="plus" tone="purple" />
    {extraMetric}
  </div>;
}

function Avatar({ name, src }: { name: string; src?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <span className="tl-admin-avatar" aria-hidden="true">{src ? <img src={src} alt="" /> : initials || '?'}</span>;
}

function UserIdentity({ user, showEmail = true }: { user: AdminUser; showEmail?: boolean }) {
  return <div className="tl-admin-person">
    <Avatar name={user.name} src={user.avatarUrl} />
    <div><strong>{user.name}</strong>{showEmail && <small>{user.email}</small>}</div>
  </div>;
}

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });
function JoinedDate({ value }: { value?: string }) {
  if (!value || Number.isNaN(Date.parse(value))) return <>—</>;
  return <time dateTime={value}>{dateFormat.format(new Date(value))}</time>;
}

function NavIcon({ index }: { index: number }) {
  const paths = ["M3 10 12 3l9 7v11h-6v-7H9v7H3Z", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8m6 10v-2a4 4 0 0 0-3-3M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z", "m12 3 9 5v8l-9 5-9-5V8Zm0 10v8M3 8l9 5 9-5M7.5 5.5l9 5", "M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z", "M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Zm-4 9 3 3 5-6", "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7", "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z"];
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[index] ?? "M4 4h16v16H4ZM4 10h16M10 10v10"} /></svg>;
}

// Route protection belongs to the surrounding app's auth guard.
export function AdminLayout({ pending = false, title = "Tilcayo", basePath = "/admin", homePath = "/", user, links = [], sections = [], onLogout, children, showGroupHeadings = false, accountContent, onGroupHeadingsChange }: AdminLayoutProps) {
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
  const canSee = (tab: string) => user?.adminTabs === undefined || user.adminTabs.includes(tab);
  const navigation: AdminLink[] = [
    ...(canSee('overview') ? [{ label: "Dashboard", to: basePath, group: "General" }] : []),
    ...(canSee('users') ? [{ label: "Users", to: `${basePath}/users`, group: "Management" }] : []),
    ...(['catalog', 'inventory', 'categories', 'orders'].some(canSee) ? [{ label: "Products", to: `${basePath}/products`, group: "Management" }] : []),
    { label: "Profile", to: `${basePath}/profile`, group: "Account" },
    ...links.filter(link => !link.tab || canSee(link.tab)),
  ];
  const navigationGroups = new Map<string, (AdminLink & { iconIndex: number })[]>();
  navigation.forEach(link => {
    const iconIndex = [basePath, `${basePath}/users`, `${basePath}/products`, `${basePath}/profile`, `${basePath}/access`, `${basePath}/trash`, `${basePath}/settings`].indexOf(/^https?:\/\//.test(link.to) ? new URL(link.to).pathname : link.to);
    const group = link.group?.trim() || "Resources";
    const items = navigationGroups.get(group) ?? [];
    items.push({ ...link, iconIndex });
    navigationGroups.set(group, items);
  });
  return <div className={`tl-admin-shell${showGroupHeadings ? ' tl-admin-show-headings' : ''}`}>
    <a className="tl-admin-skip" href="#admin-main">Skip to content</a>
    <header className="tl-admin-header">
      <Link className="tl-admin-brand" to={homePath} aria-label={`${title} home`}>
        <span className="tl-admin-logo" aria-hidden="true"><svg viewBox="0 0 32 32" fill="currentColor"><path d="M3 4h12l-5 7H3l5-7Zm14 0h12L10 28H0L17 4Z" /></svg></span>
        <div><strong>{title}</strong><small className={user?.tenancyEnabled ? "tl-admin-workspace-caption" : undefined}>{user?.tenancyEnabled ? user.tenant?.name ?? "Platform" : "Administration"}</small></div>
      </Link>
      <Button className="tl-admin-toggle" variant="outline" aria-controls={menuId} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>Menu</Button>
    </header>
    <aside id={menuId} className={`tl-admin-sidebar${menuOpen ? " tl-admin-sidebar-open" : ""}`}>
      <nav aria-label="Admin navigation">
        {Array.from(navigationGroups, ([group, items], index) => (
          <section className="tl-admin-nav-group" key={group} aria-labelledby={showGroupHeadings ? `${menuId}-group-${index}` : undefined}>
            {showGroupHeadings && <h2 className="tl-admin-nav-heading" id={`${menuId}-group-${index}`}>{group}</h2>}
            {items.map(link => (
              <NavLink key={link.to} to={link.to} end={link.to === basePath} onClick={() => setMenuOpen(false)}>
                <NavIcon index={link.iconIndex} /><span>{link.label}</span>
              </NavLink>
            ))}
          </section>
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
      {pending && <div className="tl-admin-topbar-actions" aria-label="Checking session"><Skeleton width={38} height={38} circle /></div>}
      {!pending && user && <div className="tl-admin-topbar-actions">
        {canSee('overview') && <Link className="tl-admin-notifications" to={`${basePath}?section=summary`} aria-label="View recent activity" title="Recent activity">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        </Link>}
        <details className="tl-admin-topbar-user" onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
        }} onKeyDown={event => {
          if (event.key === 'Escape') {
            event.currentTarget.open = false;
            event.currentTarget.querySelector('summary')?.focus();
          }
        }}>
          <summary aria-label="Open account menu"><UserIdentity user={user} showEmail={false} /><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>
          <div className="tl-admin-account-menu">
            <span title={user.email}>{user.email}</span>
            {accountContent}
            <Link to="/dashboard" onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}><NavIcon index={0} />My dashboard</Link>
            {user.platformRole === 'superadmin' && !user.tenant ? <>
              <Link to={basePath} onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}><NavIcon index={4} />Platform administration</Link>
              <Link to={basePath + '/workspaces'} onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}><NavIcon index={7} />Tenant administration</Link>
            </> : <Link to={basePath} onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}><NavIcon index={4} />{user.tenancyEnabled ? 'Workspace administration' : 'Admin'}</Link>}
            <Link to={`${basePath}/profile`} onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}><NavIcon index={3} />Profile &amp; settings</Link>
            {onGroupHeadingsChange && <label className="tl-admin-heading-toggle"><input type="checkbox" checked={showGroupHeadings} onChange={event => onGroupHeadingsChange(event.target.checked)} />Sidebar headings</label>}
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
      {pending ? <PageSkeleton variant="content" label="Checking your session" /> : children ?? <Outlet />}
    </main>
  </div>;
}

export function AdminDashboard({ user, stats, extraMetric, children }: { user?: AdminUser | null; stats?: AdminStats; extraMetric?: ReactNode; children?: ReactNode }) {
  return <ResourceLayout title="Dashboard" description="A quick look at your application.">
    <AdminUserStats stats={stats} extraMetric={extraMetric} />
    {children}
  </ResourceLayout>;
}

export function AdminUsersTable({ users, renderActions }: { users: AdminDirectoryUser[]; renderActions?: (user: AdminDirectoryUser) => ReactNode }) {
  return <Table>
    <caption className="tl-sr-only">Registered users and their roles</caption>
    <thead><tr><th scope="col">User</th><th scope="col">Email address</th><th scope="col">Roles</th><th scope="col">Status</th><th scope="col">Joined</th>{renderActions && <th scope="col">Actions</th>}</tr></thead>
    <tbody>
      {users.map(user => <tr key={user.id}>
        <td><UserIdentity user={user} showEmail={false} /></td>
        <td className="tl-admin-user-email">{user.email}</td>
        <td><div className="tl-admin-roles">
          {(user.roles?.length ? user.roles : ['member']).map(role => (
            <Badge key={role} variant={['admin','superadmin'].includes(role) ? 'success' : 'neutral'}>{role}</Badge>
          ))}
        </div></td>
        <td><Badge variant={user.suspendedAt ? 'warning' : 'success'}>{user.suspendedAt ? 'Suspended' : 'Active'}</Badge></td>
        <td><JoinedDate value={user.createdAt} /></td>
        {renderActions && <td>{renderActions(user)}</td>}
      </tr>)}
      {!users.length && <tr><td colSpan={renderActions ? 6 : 5}><div className="tl-admin-empty">
        <strong>No users found</strong><p>Try a different name, email, or role filter.</p>
      </div></td></tr>}
    </tbody>
  </Table>;
}

export function AdminUserList({ users, showJoined = false }: { users: AdminDirectoryUser[]; showJoined?: boolean }) {
  return <ul className="tl-admin-user-preview">
    {users.map(user => <li key={user.id}>
      <Avatar name={user.name} src={user.avatarUrl} />
      <div><strong>{user.name}</strong><small>{showJoined ? <>Joined <JoinedDate value={user.createdAt} /></> : user.email}</small></div>
      <Badge variant={user.roles?.includes('admin') ? 'success' : 'neutral'}>{user.roles?.includes('admin') ? 'admin' : 'member'}</Badge>
    </li>)}
    {!users.length && <li className="tl-admin-preview-empty">No accounts to show yet.</li>}
  </ul>;
}

export function AdminProfile({ user, onRefreshSession, photoControls }: { photoControls?: ReactNode; user?: AdminUser | null; basePath?: string; onRefreshSession?: () => Promise<unknown> }) {
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const roles = user?.roles?.length ? user.roles : ['member'];
  const platform = user?.platformRole === 'superadmin' && !user?.tenant;
  const isAdmin = roles.includes('admin') || platform;
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
  return <ResourceLayout title="My profile" description="Your account and current session.">
    {feedback && <Alert variant={feedback.error ? 'danger' : 'success'}>{feedback.message}</Alert>}
    <div className="tl-admin-profile-overview">
      <Card className="tl-admin-detail-panel tl-admin-profile-account" aria-label="Account information">
        <div className="tl-admin-profile-summary"><Avatar name={user?.name ?? '?'} src={user?.avatarUrl} /><div><h2>{user?.name ?? 'Your account'}</h2><p>{user?.email ?? 'Not available'}</p><div className="tl-admin-roles">{roles.map(role => <Badge key={role} variant={['admin','superadmin'].includes(role) ? 'success' : 'neutral'}>{role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Administrator' : role === 'member' ? 'Member' : role}</Badge>)}</div></div></div>
        {photoControls}
        <dl className="tl-admin-profile-metadata"><dt>Member since</dt><dd><JoinedDate value={user?.createdAt} /></dd><dt>Last updated</dt><dd><JoinedDate value={user?.updatedAt} /></dd>{user?.tenant && <><dt>Workspace</dt><dd>{user.tenant.name}</dd></>}</dl>
        {!platform && <p className="tl-admin-panel-note">{isAdmin ? 'Manage users, products, inventory and orders in your workspace.' : 'Your administrator manages the permissions assigned to this account.'}</p>}
      </Card>
      <Card className="tl-admin-security-card" role="region" aria-label="Security">
        <header><AdminIcon kind="lock" tone="purple" /><div><h2>Security</h2><p className={user ? 'tl-admin-session-state is-active' : 'tl-admin-session-state'}><span aria-hidden="true" />{user ? 'Signed in' : 'Signed out'}</p></div></header>
        {onRefreshSession && <Button className="tl-admin-session-refresh" variant="outline" disabled={refreshing} onClick={() => void refreshSession()}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M18 18a8 8 0 0 1-13-3" /></svg>{refreshing ? 'Refreshing...' : 'Refresh session'}</Button>}
      </Card>
    </div>
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

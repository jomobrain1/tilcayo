import type { GeneratedSource } from "./frontend.js";
import { adminProductFiles } from "./adminProductFrontend.js";
import { adminSectionFiles } from './adminSectionsFrontend.js';

export function adminFiles(): GeneratedSource[] {
  const file = (name: string, source: string): GeneratedSource => ({ folder: "features/admin", name, source });
  return [
    ...adminProductFiles(),
    ...adminSectionFiles(),
    file("admin-layout.tsx", `import { AdminLayout } from '@tilcayo/admin';
import { useAuth } from '../../app/auth';
import { useLocation } from 'react-router';

export function ManagementLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const sections = pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/dashboard'
    ? [{ id: 'summary', label: 'Summary' }, { id: 'users', label: 'Users' }, { id: 'inventory', label: 'Inventory' }]
    : pathname === '/admin/products'
      ? [{ id: 'catalog', label: 'Catalog' }, { id: 'inventory', label: 'Inventory' }, { id: 'categories', label: 'Categories' }, { id: 'orders', label: 'Orders' }]
      : [];
  return <AdminLayout user={user} onLogout={logout} links={[]} sections={sections} />;
}
`),
    file("admin.api.ts", `import type { AdminUsersResponse } from '@tilcayo/admin';
import type { TilcayoResponse } from '@tilcayo/react';
import { tilcayoApi } from '../../app/api';

export interface UsersQuery { page: number; search: string; role: 'all' | 'admin' | 'member' }
export const adminApi = tilcayoApi.injectEndpoints({
  endpoints: builder => ({
    getAdminUsers: builder.query<TilcayoResponse<AdminUsersResponse>, UsersQuery>({
      query: query => ({ url: '/admin/users', query: { ...query, perPage: 10 } }),
    }),
  }),
});
export const { useGetAdminUsersQuery } = adminApi;
`),
    file("users.page.tsx", `import { useState, type FormEvent } from 'react';
import { AdminDashboard, AdminUsersTable, AdminUserStats, AdminMetricCard, ResourceLayout } from '@tilcayo/admin';
import { Alert, Button, Input, Spinner } from '@tilcayo/ui';
import { useAuth } from '../../app/auth';
import { useGetAdminUsersQuery, type UsersQuery } from './admin.api';
import { DemoUserHighlights } from './users-demo-highlights';

export function UsersPage({ overview = false }: { overview?: boolean }) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<UsersQuery>({ page: 1, search: '', role: 'all' });
  const { currentData, isFetching, isError, refetch } = useGetAdminUsersQuery(query, { refetchOnMountOrArgChange: true });
  const directory = currentData?.data;
  const stats = isError ? undefined : directory?.stats;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery({ ...query, search: search.trim(), page: 1 });
  }
  const content = <section id="admin-user-directory" className="tl-admin-directory" aria-label="User directory" aria-busy={isFetching}>
    <header className="tl-admin-directory-heading">
      <div><h2>Users</h2><p>People in your application and their access roles.</p></div>
      <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>Refresh</Button>
    </header>
    <div className="tl-admin-tabs" role="group" aria-label="Filter users by role">
      {(['all', 'admin', 'member'] as const).map(role => <Button key={role} variant="ghost" aria-pressed={query.role === role} onClick={() => setQuery({ ...query, role, page: 1 })}>{role === 'all' ? 'All users' : role === 'admin' ? 'Administrators' : 'Members'}</Button>)}
    </div>
    <form className="tl-admin-toolbar" onSubmit={submit} role="search">
      <Input aria-label="Search users by name or email" placeholder="Search name or email…" maxLength={100} value={search} onChange={event => setSearch(event.target.value)} />
      <Button type="submit">Search</Button>
    </form>
    {isError ? <div className="tl-admin-empty"><Alert variant="danger">Unable to load users. Check your connection and try Refresh.</Alert></div>
      : directory ? <AdminUsersTable users={directory.items} />
      : <div className="tl-admin-empty"><Spinner label="Loading users" /></div>}
    {directory && !isError && <footer className="tl-admin-directory-footer">
      <span>{directory.pagination.total.toLocaleString()} matching users · Page {query.page} of {directory.pagination.lastPage}</span>
      <nav aria-label="User directory pages" className="tl-flex tl-gap-2">
        <Button variant="outline" disabled={isFetching || !directory.pagination.hasPreviousPage} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Previous</Button>
        <Button variant="outline" disabled={isFetching || !directory.pagination.hasNextPage} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Next</Button>
      </nav>
    </footer>}
  </section>;
  return overview
    ? <AdminDashboard user={user} stats={isError ? undefined : directory?.stats}>{content}</AdminDashboard>
    : <ResourceLayout title="Users" description="A clear view of your community and their roles.">
      <AdminUserStats stats={stats} extraMetric={<AdminMetricCard label="Members" value={stats ? stats.totalUsers - stats.adminUsers : undefined} note="Accounts without admin access" icon="profile" tone="amber" />} />
      <div className="tl-admin-users-grid">{content}<DemoUserHighlights /></div>
    </ResourceLayout>;
}
`),
    file('users-demo-highlights.tsx', `import { useState } from 'react';
import { Badge, Button, Card } from '@tilcayo/ui';

// Presentation-only examples; these records are never written to the API.
const featured = [
  { name: 'Agnes Njeri', initials: 'AN', role: 'Admin', title: 'System Administrator', school: 'Sunrise Primary' },
  { name: 'James Mwangi', initials: 'JM', role: 'Teacher', title: 'Senior Teacher', school: 'Woodlands Academy' },
  { name: 'David Kimani', initials: 'DK', role: 'Student', title: 'Form 2 Student', school: 'Ridgeview High School' },
  { name: 'Sarah Muthoni', initials: 'SM', role: 'Teacher', title: 'Mathematics Teacher', school: 'Woodlands Academy' },
  { name: 'Lilian Wanjiku', initials: 'LW', role: 'Teacher', title: 'Science Teacher', school: 'Maplecrest School' },
  { name: 'Tom Ochieng', initials: 'TO', role: 'Parent', title: 'Parent Representative', school: 'Greenfield Secondary' },
];
const recent = [
  { name: 'David Kimani', initials: 'DK', role: 'Student', joined: 'Joined 2 hours ago' },
  { name: 'Caroline Mesago', initials: 'CM', role: 'Parent', joined: 'Joined 1 day ago' },
  { name: 'Brian Otieno', initials: 'BO', role: 'Student', joined: 'Joined 2 days ago' },
  { name: 'Sarah Muthoni', initials: 'SM', role: 'Teacher', joined: 'Joined 3 days ago' },
  { name: 'Agnes Njeri', initials: 'AN', role: 'Admin', joined: 'Joined 4 days ago' },
];

function DemoRole({ role }: { role: string }) {
  return <Badge className={'tl-admin-demo-role-' + role.toLowerCase()}>{role}</Badge>;
}

export function DemoUserHighlights() {
  const [allProfiles, setAllProfiles] = useState(false);
  const [allJoins, setAllJoins] = useState(false);
  return <aside className="tl-admin-user-highlights" aria-label="Sample community highlights">
    <Card className="tl-admin-highlight-card">
      <header><div><h2>Featured profiles</h2><p>Meet members of your school community.</p></div><Button variant="outline" aria-expanded={allProfiles} onClick={() => setAllProfiles(!allProfiles)}>{allProfiles ? 'Show less' : 'View all'}</Button></header>
      <ul className="tl-admin-user-preview">{featured.slice(0, allProfiles ? featured.length : 4).map(profile => <li key={profile.name}>
        <span className="tl-admin-avatar" aria-hidden="true">{profile.initials}</span>
        <div><strong>{profile.name}</strong><small>{profile.title}</small><small>{profile.school}</small></div>
        <DemoRole role={profile.role} />
      </li>)}</ul>
    </Card>
    <Card className="tl-admin-highlight-card">
      <header><div><h2>Recent joins</h2><p>Latest members of the school community.</p></div><Button variant="outline" aria-expanded={allJoins} onClick={() => setAllJoins(!allJoins)}>{allJoins ? 'Show less' : 'View all'}</Button></header>
      <ul className="tl-admin-user-preview">{recent.slice(0, allJoins ? recent.length : 3).map(profile => <li key={profile.name}>
        <span className="tl-admin-avatar" aria-hidden="true">{profile.initials}</span>
        <div><strong>{profile.name}</strong><small>{profile.joined}</small></div>
        <DemoRole role={profile.role} />
      </li>)}</ul>
    </Card>
  </aside>;
}
`),
    file("profile.page.tsx", `import { AdminProfile } from '@tilcayo/admin';
import { useAuth } from '../../app/auth';

export function ProfilePage() {
  const { user, restoreSession } = useAuth();
  return <AdminProfile user={user} onRefreshSession={restoreSession} />;
}
`),
    file("admin.routes.tsx", `import type { RouteObject } from 'react-router';
import { RequireAuth } from '../../middleware/auth';
import { NotFoundPage } from '../../pages/not-found.page';
import { ManagementLayout } from './admin-layout';
import { UsersPage } from './users.page';
import { ProfilePage } from './profile.page';
import { ProductsPage } from './products.page';
import { OverviewPage } from './overview.page';

export const adminRoutes: RouteObject[] = [{
  element: <RequireAuth role="admin" />,
  children: [{ path: '/admin', element: <ManagementLayout />, children: [
    { index: true, element: <OverviewPage /> },
    { path: 'dashboard', element: <OverviewPage /> },
    { path: 'users', element: <UsersPage /> },
    { path: 'products', element: <ProductsPage /> },
    { path: 'profile', element: <ProfilePage /> },
    // Spread createBooksRoutes('books', '/admin/books') here for resource pages.
    { path: '*', element: <NotFoundPage /> },
  ] }],
}];
`),
  ];
}

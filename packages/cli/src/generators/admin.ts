import type { GeneratedSource } from "./frontend.js";
import { adminProductFiles } from "./adminProductFrontend.js";
import { tenancyFrontendFiles } from "./tenancyFrontend.js";
import { adminUserFiles } from "./adminUserFrontend.js";
import { adminSectionFiles } from "./adminSectionsFrontend.js";

export function adminFiles(): GeneratedSource[] {
  const file = (name: string, source: string): GeneratedSource => ({ folder: "features/admin", name, source });
  return [
    file("session-shell.tsx", `import { AdminLayout } from '@tilcayo/admin';

/** Navigation is presentation only; protected routes and queries stay unmounted. */
export function AdminSessionShell() {
  return <AdminLayout pending links={[{ label: 'Settings', to: '/admin/settings', group: 'Account' }]} />;
}
`),
    ...adminProductFiles(),
    ...adminSectionFiles(),
    ...adminUserFiles(),
    ...tenancyFrontendFiles(),
    file("admin-layout.tsx", `import { AdminLayout } from '@tilcayo/admin';
import { useAuth } from '../../app/auth';
import { useLocation } from 'react-router';
import { useAdminAccess } from './permissions';

export function ManagementLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { can } = useAdminAccess();
  const sections = pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/dashboard'
    ? [{ id: 'summary', label: 'Summary', tab: 'overview' }, { id: 'users', label: 'Users', tab: 'users' }, { id: 'inventory', label: 'Inventory', tab: 'inventory' }]
    : pathname === '/admin/products'
      ? [{ id: 'catalog', label: 'Catalog', tab: 'catalog' }, { id: 'inventory', label: 'Inventory', tab: 'inventory' }, { id: 'categories', label: 'Categories', tab: 'categories' }, { id: 'orders', label: 'Orders', tab: 'orders' }]
      : pathname === '/admin/settings'
        ? [{ id: 'users', label: 'Users', tab: 'users' }, { id: 'access', label: 'Roles & access', tab: 'access' }, { id: 'trash', label: 'Trash', tab: 'trash' }]
        : [];
  return <AdminLayout user={user} onLogout={logout} showGroupHeadings={false} links={
    can('tenants') || can('users') || can('access') || can('trash') ? [{ label: 'Settings', to: '/admin/settings', group: 'Account' }] : []
  } sections={sections.filter(section => can(section.tab))} />;
}
`),
    file("admin.api.ts", `import type { AdminUsersResponse } from '@tilcayo/admin';
import type { TilcayoResponse } from '@tilcayo/react';
import { tilcayoApi } from '../../app/api';

export interface AdminRole { key: string; name: string; tabs: string[]; builtIn?: boolean }
export interface UsersQuery { page: number; search: string; role: 'all' | 'admin' | 'member'; status?: 'all' | 'active' | 'suspended'; deleted?: 'active' | 'trash' }
export const adminApi = tilcayoApi.enhanceEndpoints({ addTagTypes: ['AdminUsers', 'AdminRoles'] }).injectEndpoints({
  endpoints: builder => ({
    getAdminRoles: builder.query<TilcayoResponse<AdminRole[]>, void>({ query: () => '/admin/roles', providesTags: ['AdminRoles'] }),
    saveAdminRole: builder.mutation<unknown, { key: string; name: string; tabs: string[] }>({
      query: body => ({ url: '/admin/roles/' + encodeURIComponent(body.key), method: 'PUT', body }), invalidatesTags: ['AdminRoles'],
    }),
    assignAdminRoles: builder.mutation<unknown, { id: string; roles: string[] }>({
      query: ({ id, roles }) => ({ url: '/admin/users/' + encodeURIComponent(id) + '/roles', method: 'PUT', body: { roles } }), invalidatesTags: ['AdminUsers'],
    }),
    createAdminUser: builder.mutation<unknown, { name: string; email: string; password: string; roles: string[] }>({ query: body => ({ url: '/admin/users', method: 'POST', body }), invalidatesTags: ['AdminUsers'] }),
    setAdminUserStatus: builder.mutation<unknown, { id: string; suspended: boolean }>({ query: ({ id, suspended }) => ({ url: '/admin/users/' + encodeURIComponent(id) + '/status', method: 'PUT', body: { suspended } }), invalidatesTags: ['AdminUsers'] }),
    deleteAdminUser: builder.mutation<unknown, string>({ query: id => ({ url: '/admin/users/' + encodeURIComponent(id), method: 'DELETE' }), invalidatesTags: ['AdminUsers'] }),
    restoreAdminUser: builder.mutation<unknown, string>({ query: id => ({ url: '/admin/users/' + encodeURIComponent(id) + '/restore', method: 'POST', body: {} }), invalidatesTags: ['AdminUsers'] }),
    getAdminUsers: builder.query<TilcayoResponse<AdminUsersResponse>, UsersQuery>({
      query: query => ({ url: '/admin/users', query: { ...query, perPage: 10 } }), providesTags: ['AdminUsers'],
    }),
  }),
});
export const { useCreateAdminUserMutation, useSetAdminUserStatusMutation, useGetAdminUsersQuery, useGetAdminRolesQuery, useSaveAdminRoleMutation, useAssignAdminRolesMutation, useDeleteAdminUserMutation, useRestoreAdminUserMutation } = adminApi;
`),
    file("users.page.tsx", `import { useState, type FormEvent } from 'react';
import { AdminDashboard, AdminUsersTable, AdminUserStats, AdminMetricCard, ResourceLayout } from '@tilcayo/admin';
import { Alert, Button, Input, TableSkeleton } from '@tilcayo/ui';
import { useAuth } from '../../app/auth';
import { useGetAdminUsersQuery, type UsersQuery } from './admin.api';
import { RoleAssignment } from './access.page';
import { useAdminAccess } from './permissions';
import { DeleteButton } from './delete-button';
import { useDeleteAdminUserMutation } from './admin.api';
import { CreateUserButton, UserStatusAction } from './user-management';

export function UsersPage({ overview = false }: { overview?: boolean }) {
  const { user } = useAuth();
  const { isAdmin } = useAdminAccess();
  const [remove] = useDeleteAdminUserMutation();
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
    <header className="tl-admin-directory-heading tl-admin-users-heading">
      <div><h2>Users</h2><p>People in your application and their access roles.</p></div>
      <div className="tl-admin-user-heading-actions tl-flex tl-gap-2">{isAdmin && <CreateUserButton />}<Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>Refresh</Button></div>
    </header>
    <div className="tl-admin-tabs" role="group" aria-label="Filter users by role">
      {(['all', 'admin', 'member'] as const).map(role => <Button key={role} variant="ghost" aria-pressed={query.role === role} onClick={() => setQuery({ ...query, role, page: 1 })}>{role === 'all' ? 'All users' : role === 'admin' ? 'Administrators' : 'Members'}</Button>)}
    </div>
    <form className="tl-admin-toolbar" onSubmit={submit} role="search">
      <Input aria-label="Search users by name or email" placeholder="Search name or email..." maxLength={100} value={search} onChange={event => setSearch(event.target.value)} />
      <select className="tl-select" aria-label="Filter users by status" value={query.status ?? 'all'} onChange={event => setQuery({ ...query, status: event.target.value as UsersQuery['status'], page: 1 })}><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
      <Button type="submit">Search</Button>
    </form>
    {isError ? <div className="tl-admin-empty"><Alert variant="danger">Unable to load users. Check your connection and try Refresh.</Alert></div>
      : directory ? <AdminUsersTable users={directory.items} renderActions={account => <div className="tl-admin-row-actions">
        {isAdmin && <>{(!user?.tenancyEnabled || !!user?.tenant) && <RoleAssignment account={account} />}<UserStatusAction account={account} disabled={account.id === user?.id} /></>}
        <DeleteButton iconOnly name={account.name} disabled={account.id === user?.id || (!!account.roles?.includes('admin') && !isAdmin)} onDelete={() => remove(account.id).unwrap()} />
      </div>} />
      : <TableSkeleton label="Loading users" columns={6} />}
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
      {content}
    </ResourceLayout>;
}
`),
    file("users-demo-highlights.tsx", `import { useState } from 'react';
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
import { ProfilePhoto } from '../../components/profile-photo';
import { useAuth } from '../../app/auth';

export function ProfilePage() {
  const { user, restoreSession } = useAuth();
  return <AdminProfile user={user} onRefreshSession={restoreSession} photoControls={<ProfilePhoto />} />;
}
`),
    file("admin.routes.tsx", `import { Navigate, type RouteObject } from 'react-router';
import { RequireAuth } from '../../middleware/auth';
import { NotFoundPage } from '../../pages/not-found.page';
import { ManagementLayout } from './admin-layout';
import { UsersPage } from './users.page';
import { ProfilePage } from './profile.page';
import { ProductsPage } from './products.page';
import { OverviewPage } from './overview.page';
import { AdminAccessGuard } from './access';
import { SettingsPage } from './settings.page';
import { TenantsPage } from '../tenancy/tenants.page';

export const adminRoutes: RouteObject[] = [{
  element: <RequireAuth />,
  children: [{ element: <AdminAccessGuard />, children: [{ path: '/admin', element: <ManagementLayout />, children: [
    { index: true, element: <OverviewPage /> },
    { path: 'dashboard', element: <OverviewPage /> },
    { path: 'users', element: <UsersPage /> },
    { path: 'products', element: <ProductsPage /> },
    { path: 'settings', element: <SettingsPage /> },
    { path: 'workspaces', element: <TenantsPage administrationOnly /> },
    { path: 'access', element: <Navigate to="/admin/settings?section=access" replace /> },
    { path: 'trash', element: <Navigate to="/admin/settings?section=trash" replace /> },
    { path: 'profile', element: <ProfilePage /> },
    // Spread createBooksRoutes('books', '/admin/books') here for resource pages.
    { path: '*', element: <NotFoundPage /> },
  ] }] }],
}];
`),
    file("access.tsx", `import { Navigate, Outlet, useLocation } from 'react-router';
import { useAdminAccess, tabLabels } from './permissions';

export function AdminAccessGuard() {
  const { pathname, search } = useLocation();
  const { can } = useAdminAccess();
  if (!Object.keys(tabLabels).some(can)) return <Navigate to="/forbidden" replace />;
  const section = new URLSearchParams(search).get('section');
  if (pathname === '/admin/settings' && section === 'tenants') return <Navigate to={can('tenants') ? '/admin/workspaces' : '/forbidden'} replace />;
  const settingsTab = can('users') ? 'users' : can('access') ? 'access' : can('trash') ? 'trash' : null;
  if (pathname === '/admin/settings' && !section && settingsTab) return <Navigate to={'/admin/settings?section=' + settingsTab} replace />;
  const productTabs = ['catalog', 'inventory', 'categories', 'orders'];
  const first = productTabs.find(can);
  if (pathname === '/admin/products' && !section && first && first !== 'catalog') return <Navigate to={'/admin/products?section=' + first} replace />;
  if ((pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/dashboard') && !section && !can('overview')) {
    const destination = can('users') ? '/admin/users' : first ? '/admin/products?section=' + first : settingsTab ? '/admin/settings?section=' + settingsTab : null;
    return <Navigate to={destination ?? '/forbidden'} replace />;
  }
  let tab: string | null = null;
  if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/dashboard') tab = section === 'users' ? 'users' : section === 'inventory' ? 'inventory' : 'overview';
  if (pathname === '/admin/products') tab = productTabs.includes(section ?? '') ? section : 'catalog';
  if (pathname === '/admin/settings') tab = section === 'tenants' ? 'tenants' : section === 'users' ? 'users' : section === 'trash' ? 'trash' : 'access';
  if (pathname === '/admin/users') tab = 'users';
  if (pathname === '/admin/workspaces') tab = 'tenants';
  if (pathname === '/admin/access') tab = 'access';
  if (pathname === '/admin/trash') tab = 'trash';
  if (tab && !can(tab)) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
`),
    file("access.page.tsx", `import { useState, type FormEvent } from 'react';
import { ResourceLayout } from '@tilcayo/admin';
import type { AdminDirectoryUser } from '@tilcayo/admin';
import { Alert, Badge, Button, Card, FormField, Input, Modal, ListSkeleton, CardsSkeleton } from '@tilcayo/ui';
import { useAuth } from '../../app/auth';
import { tabLabels } from './permissions';
import { actionError } from './action-error';
import { useGetAdminRolesQuery, useSaveAdminRoleMutation, useAssignAdminRolesMutation, type AdminRole } from './admin.api';

const assignableTabs = Object.keys(tabLabels).filter(key => key !== 'access');
function RoleForm({ role, onDone }: { role?: AdminRole; onDone: () => void }) {
  const [tabs, setTabs] = useState(role?.tabs ?? ['overview']);
  const [save, { isLoading }] = useSaveAdminRoleMutation();
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setError('');
    try { await save({ key: String(form.get('key')), name: String(form.get('name')).trim(), tabs }).unwrap(); onDone(); } catch (error) { setError(actionError(error)); }
  }
  return <form className="tl-stack" onSubmit={submit}>
    {error && <Alert variant="danger">{error}</Alert>}
    <FormField label="Role name" id="role-name">{props => <Input {...props} name="name" required minLength={2} maxLength={80} defaultValue={role?.name} placeholder="Catalog manager" />}</FormField>
    <FormField label="Role key" id="role-key" hint="Lowercase letters, numbers, hyphens and underscores. This key cannot change after creation.">{props => <Input {...props} name="key" required pattern="[a-z][a-z0-9_-]{1,39}" readOnly={!!role} defaultValue={role?.key} placeholder="catalog_manager" />}</FormField>
    <fieldset className="tl-admin-permissions"><legend>Visible tabs</legend>{assignableTabs.map(key => <label key={key}><input type="checkbox" checked={tabs.includes(key)} onChange={event => setTabs(event.target.checked ? [...tabs, key] : tabs.filter(tab => tab !== key))} />{tabLabels[key]}</label>)}</fieldset>
    <p className="tl-help-text">Profile is available to everyone with admin access. Trash also requires access to the record's section. Only administrators can manage roles.</p>
    <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save role'}</Button>
  </form>;
}
export function AccessPage() {
  const { data, isLoading, isError } = useGetAdminRolesQuery();
  const [editing, setEditing] = useState<AdminRole | 'new' | null>(null);
  return <ResourceLayout title="Roles & access" description="Choose which parts of the admin each role can use." actions={<Button onClick={() => setEditing('new')}>Add role</Button>}>
    {isLoading ? <CardsSkeleton label="Loading roles" count={3} /> : isError ? <Alert variant="danger">Unable to load roles.</Alert> : <div className="tl-admin-role-grid">{data?.data.map(role => <Card className="tl-admin-detail-panel" key={role.key}>
      <header><div><h2>{role.name}</h2><p>{role.builtIn ? 'Full access ? Built-in role' : role.key}</p></div>{!role.builtIn && <Button variant="outline" onClick={() => setEditing(role)}>Edit</Button>}</header>
      <div className="tl-flex tl-flex-wrap tl-gap-2">{role.tabs.map(tab => <Badge key={tab}>{tabLabels[tab] ?? tab}</Badge>)}{!role.tabs.length && <p>No admin tabs enabled.</p>}</div>
    </Card>)}</div>}
    <p className="tl-admin-panel-note">Assign roles using the Roles action in Settings / Users. Changes apply on the next API request; users can refresh to update their navigation.</p>
    <Modal open={editing !== null} title={editing === 'new' ? 'Add role' : 'Edit role'} onClose={() => setEditing(null)}>{editing && <RoleForm key={editing === 'new' ? 'new' : editing.key} role={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}</Modal>
  </ResourceLayout>;
}
function AssignmentForm({ account, onDone }: { account: AdminDirectoryUser; onDone: () => void }) {
  const { data, isLoading, isError } = useGetAdminRolesQuery();
  const [roles, setRoles] = useState(account.roles ?? []);
  const [save, { isLoading: saving }] = useAssignAdminRolesMutation();
  const [error, setError] = useState('');
  return <form className="tl-stack" onSubmit={async event => {
    event.preventDefault(); setError('');
    try { await save({ id: account.id, roles }).unwrap(); onDone(); } catch (error) { setError(actionError(error)); }
  }}>
    <p>Choose roles for <strong>{account.name}</strong>. Access combines all selected roles.</p>
    {error && <Alert variant="danger">{error}</Alert>}
    {isLoading ? <ListSkeleton label="Loading roles" rows={3} /> : isError ? <Alert variant="danger">Unable to load roles.</Alert> : <fieldset className="tl-admin-permissions"><legend>Assigned roles</legend>{data?.data.map(role => <label key={role.key}><input type="checkbox" checked={roles.includes(role.key)} onChange={event => setRoles(event.target.checked ? [...roles, role.key] : roles.filter(key => key !== role.key))} />{role.name}</label>)}</fieldset>}
    <p className="tl-help-text">An account with no roles remains a regular member.</p>
    <Button type="submit" disabled={saving || isLoading || isError}>{saving ? 'Saving...' : 'Save access'}</Button>
  </form>;
}
export function RoleAssignment({ account }: { account: AdminDirectoryUser }) {
  const { user } = useAuth(); const [open, setOpen] = useState(false);
  return <><Button variant="ghost" disabled={account.id === user?.id} onClick={() => setOpen(true)}>Roles</Button><Modal open={open} title="Manage user access" onClose={() => setOpen(false)}>{open && <AssignmentForm account={account} onDone={() => setOpen(false)} />}</Modal></>;
}
`),
    file("trash.page.tsx", `import { useGetTenantsQuery, useRestoreTenantMutation } from '../tenancy/tenancy.api';
import { useState } from 'react';
import { ResourceLayout } from '@tilcayo/admin';
import { Alert, Button, Table, TableSkeleton } from '@tilcayo/ui';
import { useAdminAccess } from './permissions';
import { actionError } from './action-error';
import { useGetAdminUsersQuery, useRestoreAdminUserMutation } from './admin.api';
import { useGetAdminProductsQuery, useRestoreAdminProductMutation } from './products.api';
import { useGetAdminOrdersQuery, useRestoreAdminOrderMutation } from './orders.api';

export function TrashPage() {
  const { can } = useAdminAccess();
  const kinds = [{ key: 'tenants', label: 'Tenants', enabled: can('tenants') }, { key: 'users', label: 'Users', enabled: can('users') }, { key: 'products', label: 'Products', enabled: can('catalog') }, { key: 'orders', label: 'Orders', enabled: can('orders') }].filter(kind => kind.enabled);
  const [kind, setKind] = useState(kinds[0]?.key ?? '');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const users = useGetAdminUsersQuery({ page, search: '', role: 'all', deleted: 'trash' }, { skip: kind !== 'users' });
  const products = useGetAdminProductsQuery({ page, search: '', stock: 'all', status: 'all', deleted: 'trash' }, { skip: kind !== 'products' });
  const orders = useGetAdminOrdersQuery({ page, search: '', status: 'all', deleted: 'trash' }, { skip: kind !== 'orders' });
  const tenants = useGetTenantsQuery({ page, search: '', deleted: 'trash' }, { skip: kind !== 'tenants' });
  const [restoreTenant, tenantStatus] = useRestoreTenantMutation();
  const [restoreUser, userStatus] = useRestoreAdminUserMutation();
  const [restoreProduct, productStatus] = useRestoreAdminProductMutation();
  const [restoreOrder, orderStatus] = useRestoreAdminOrderMutation();
  const busy = tenantStatus.isLoading || userStatus.isLoading || productStatus.isLoading || orderStatus.isLoading;
  const result = kind === 'tenants' ? tenants : kind === 'users' ? users : kind === 'products' ? products : orders;
  const rows = kind === 'tenants' ? tenants.currentData?.data.items.map(item => ({ id: item.id, name: item.name, detail: item.slug + ' (' + item.status + ')' })) : kind === 'users' ? users.currentData?.data.items.map(item => ({ id: item.id, name: item.name, detail: item.email })) : kind === 'products' ? products.currentData?.data.items.map(item => ({ id: item._id, name: item.name, detail: item.sku })) : orders.currentData?.data.items.map(item => ({ id: item._id, name: item.productName, detail: item.customerEmail }));
  const pagination = result.currentData?.data.pagination;
  return <ResourceLayout title="Trash" description="Deleted records stay here until you restore them. Nothing is permanently erased.">
    {error && <Alert variant="danger">{error}</Alert>}
    {!kinds.length ? <p>You need access to Users, Catalog or Orders to view deleted records.</p> : <section className="tl-admin-directory">
      <div className="tl-admin-tabs" role="group" aria-label="Deleted record type">{kinds.map(item => <Button key={item.key} variant="ghost" aria-pressed={kind === item.key} onClick={() => { setKind(item.key); setPage(1); setError(''); }}>{item.label}</Button>)}</div>
      {result.isError ? <Alert variant="danger">Unable to load deleted records.</Alert> : result.isFetching && !result.currentData ? <TableSkeleton label="Loading trash" columns={3} /> : <Table><thead><tr><th>Name</th><th>Details</th><th>Action</th></tr></thead><tbody>
        {rows?.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.detail}</td><td><Button variant="outline" disabled={busy} onClick={async () => {
          setError(''); try { await (kind === 'tenants' ? restoreTenant(item.id) : kind === 'users' ? restoreUser(item.id) : kind === 'products' ? restoreProduct(item.id) : restoreOrder(item.id)).unwrap(); } catch (error) { setError(actionError(error)); }
        }}>Restore</Button></td></tr>)}
        {!rows?.length && <tr><td colSpan={3}><div className="tl-admin-empty"><strong>Trash is empty</strong><p>Deleted {kind} will appear here.</p></div></td></tr>}
      </tbody></Table>}
      {pagination && <footer className="tl-admin-directory-footer"><span>{pagination.total} deleted records ? Page {page} of {pagination.lastPage}</span><div className="tl-flex tl-gap-2"><Button variant="outline" disabled={result.isFetching || !pagination.hasPreviousPage} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" disabled={result.isFetching || !pagination.hasNextPage} onClick={() => setPage(page + 1)}>Next</Button></div></footer>}
    </section>}
  </ResourceLayout>;
}
`),
    file("delete-button.tsx", `import { useState } from 'react';
import { actionError } from './action-error';
import { Alert, Button, Modal } from '@tilcayo/ui';

export function DeleteButton({ name, onDelete, disabled = false, iconOnly = false }: { name: string; onDelete: () => Promise<unknown>; disabled?: boolean; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <>
    <Button variant="ghost" className={iconOnly ? "tl-admin-icon-button tl-admin-delete-action" : undefined} title={'Move ' + name + ' to trash'} disabled={disabled} aria-label={'Move ' + name + ' to trash'} onClick={() => { setError(''); setOpen(true); }}>{iconOnly ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg> : 'Delete'}</Button>
    <Modal open={open} title="Move to trash?" onClose={() => { if (!busy) setOpen(false); }}>
      <div className="tl-stack">
        <p><strong>{name}</strong> will be hidden from active lists. You can restore it from Trash.</p>
        {error && <Alert variant="danger">{error}</Alert>}
        <div className="tl-flex tl-gap-3"><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={async () => {
          setBusy(true); setError('');
          try { await onDelete(); setOpen(false); } catch (error) { setError(actionError(error)); } finally { setBusy(false); }
        }}>{busy ? 'Moving...' : 'Move to trash'}</Button></div>
      </div>
    </Modal>
  </>;
}
`),
    file("permissions.ts", `import { useAuth } from '../../app/auth';

export const tabLabels: Record<string, string> = { overview: 'Dashboard', users: 'Users', catalog: 'Catalog', inventory: 'Inventory', categories: 'Categories', orders: 'Orders', access: 'Roles & access', trash: 'Trash', tenants: 'Tenants' };
export function useAdminAccess() {
  const { user } = useAuth();
  const can = (tab: string) => tab === 'tenants' ? user?.platformRole === 'superadmin' && !user?.tenant : user?.roles?.includes('admin') || !!user?.adminTabs?.includes(tab);
  return { can, isAdmin: (user?.platformRole === 'superadmin' && !user?.tenant) || !!user?.roles?.includes('admin') };
}
`),
    file("action-error.ts", `export function actionError(error: unknown) {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Unable to complete this action. Please try again.';
}
`),
    file("settings.page.tsx", `import { useSearchParams } from 'react-router';
import { AccessPage } from './access.page';
import { TrashPage } from './trash.page';
import { UsersPage } from './users.page';

export function SettingsPage() {
  const [params] = useSearchParams();
  return params.get('section') === 'users' ? <UsersPage /> : params.get('section') === 'trash' ? <TrashPage /> : <AccessPage />;
}
`),
  ];
}

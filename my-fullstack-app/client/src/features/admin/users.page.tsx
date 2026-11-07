import { useState, type FormEvent } from 'react';
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

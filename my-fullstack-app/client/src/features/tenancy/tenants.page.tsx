import { useState, type FormEvent } from 'react';
import { ResourceLayout } from '@tilcayo/admin';
import { Alert, Badge, Button, ConfirmDialog, FormField, Input, Modal, Table, CardsSkeleton, TableSkeleton } from '@tilcayo/ui';
import { actionError } from '../admin/action-error';
import { useAuth } from '../../app/auth';
import { useCreateTenantMutation, useDeleteTenantMutation, useGetTenantsQuery, useUpdateTenantMutation, useGetTenantMembersQuery, useSaveTenantMemberMutation, useGetWorkspaceQuery, useGetWorkspacesQuery, workspaceUrl, type Tenant } from './tenancy.api';

function TenantForm({ tenant, onDone }: { tenant?: Tenant; onDone: () => void }) {
  const [create, creating] = useCreateTenantMutation();
  const [update, updating] = useUpdateTenantMutation();
  const [error, setError] = useState('');
  const busy = creating.isLoading || updating.isLoading;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); const form = new FormData(event.currentTarget);
    try {
      if (tenant) await update({ id: tenant.id, name: String(form.get('name')), status: String(form.get('status')) as Tenant['status'] }).unwrap();
      else await create({ name: String(form.get('name')), slug: String(form.get('slug')), adminEmail: String(form.get('email')) }).unwrap();
      onDone();
    } catch (failure) { setError(actionError(failure)); }
  }
  return <form className="tl-stack" onSubmit={submit}>
    {error && <Alert variant="danger">{error}</Alert>}
    <FormField label="Workspace name" id="tenant-name">{props => <Input {...props} name="name" defaultValue={tenant?.name} required minLength={2} maxLength={100} placeholder="Sunrise School" />}</FormField>
    {!tenant ? <><FormField label="Subdomain" id="tenant-slug" hint="Lowercase letters, numbers and hyphens. This address stays fixed.">{props => <Input {...props} name="slug" required pattern="[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?" maxLength={40} placeholder="sunrise" />}</FormField><FormField label="Administrator email" id="tenant-admin-email" hint="Use an existing account. You can create one in Users first.">{props => <Input {...props} name="email" type="email" required maxLength={254} />}</FormField></> : <><p className="tl-help-text">Subdomain: {tenant.slug}</p><label className="tl-label" htmlFor="tenant-status">Status</label><select id="tenant-status" name="status" className="tl-select" defaultValue={tenant.status}><option value="active">Active</option><option value="suspended">Suspended</option></select><p className="tl-help-text">Suspended workspaces cannot be opened. Their records are retained. Reactivated members must sign in again.</p></>}
    <div className="tl-flex tl-gap-2"><Button variant="outline" type="button" disabled={busy} onClick={onDone}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving...' : tenant ? 'Save workspace' : 'Create workspace'}</Button></div>
  </form>;
}
function Members({ tenant }: { tenant: Tenant }) {
  const { data, isFetching, isError } = useGetTenantMembersQuery(tenant.id);
  const [save, { isLoading }] = useSaveTenantMemberMutation();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  return <div className="tl-stack"><p className="tl-help-text">Add an existing user or update their workspace role. This also reactivates an existing membership.</p>
    <form className="tl-stack" onSubmit={async event => { event.preventDefault(); setError(''); setMessage(''); const form = new FormData(event.currentTarget); try { await save({ id: tenant.id, email: String(form.get('email')), role: String(form.get('role')) as 'admin' | 'member' }).unwrap(); setMessage('Membership saved. This user must sign in again to the workspace.'); } catch (failure) { setError(actionError(failure)); } }}>
      <FormField label="User email" id="membership-email">{props => <Input {...props} name="email" type="email" required />}</FormField><label htmlFor="membership-role" className="tl-label">Workspace role</label><select id="membership-role" name="role" className="tl-select"><option value="member">Member</option><option value="admin">Tenant administrator</option></select>
      {error && <Alert variant="danger">{error}</Alert>}{message && <p role="status" className="tl-help-text">{message}</p>}<Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save membership'}</Button>
    </form>
    {isFetching ? <TableSkeleton label="Loading members" columns={3} /> : isError ? <Alert variant="danger">Unable to load members.</Alert> : <Table><thead><tr><th>User</th><th>Role</th><th>Status</th></tr></thead><tbody>{data?.data.map(member => <tr key={member.id}><td><strong>{member.name}</strong><small className="tenant-member-email">{member.email}</small></td><td>{member.roles.includes('admin') ? 'Tenant administrator' : member.roles.length ? member.roles.join(', ') : 'Member'}</td><td><Badge variant={member.suspended ? 'warning' : 'success'}>{member.suspended ? 'Inactive' : 'Active'}</Badge></td></tr>)}</tbody></Table>}
  </div>;
}
export function TenantsPage({ administrationOnly = false }: { administrationOnly?: boolean }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1), [search, setSearch] = useState(''), [draft, setDraft] = useState('');
  const { currentData, isFetching, isError, refetch } = useGetTenantsQuery({ page, search });
  const { data: workspace } = useGetWorkspaceQuery();
  const { data: mine } = useGetWorkspacesQuery();
  const [editing, setEditing] = useState<Tenant | 'new' | null>(null), [members, setMembers] = useState<Tenant | null>(null);
  const [removing, setRemoving] = useState<Tenant | null>(null);
  const [remove] = useDeleteTenantMutation();
  const [changeStatus, statusState] = useUpdateTenantMutation();
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  async function toggleStatus(tenant: Tenant) {
    setError(''); setMessage('');
    try {
      const status = tenant.status === 'active' ? 'suspended' : 'active';
      await changeStatus({ id: tenant.id, name: tenant.name, status }).unwrap();
      setMessage(tenant.name + (status === 'active' ? ' resumed.' : ' suspended.'));
    } catch (failure) { setError(actionError(failure)); }
  }

  if (user?.platformRole !== 'superadmin' || user.tenant) return <Alert variant="danger">Platform Super Admin access required.</Alert>;
  const result = currentData?.data;
  return <ResourceLayout title={administrationOnly ? "Tenant administration" : "Tenants"} description="Create tenants, assign administrators, and manage access." actions={<div className="tl-flex tl-flex-wrap tl-gap-2"><a className="tl-btn tl-btn-outline" href="/admin/settings?section=trash">View Trash</a><Button onClick={() => setEditing('new')}>Create tenant</Button></div>}>
    {error && <Alert variant="danger">{error}</Alert>}{message && <p role="status" className="tl-help-text">{message}</p>}
    <section className="tl-admin-directory"><form className="tl-admin-toolbar tenant-directory-toolbar" role="search" onSubmit={event => { event.preventDefault(); setSearch(draft.trim()); setPage(1); }}><Input aria-label="Search tenants" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Search name or subdomain..." maxLength={100} /><Button type="submit">Search</Button><Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>Refresh</Button></form>
      {isError ? <Alert variant="danger">Unable to load tenants. Try Refresh.</Alert> : isFetching && !result ? <div className="tenant-loading"><CardsSkeleton label="Loading tenants" count={3} /></div> : <div className="tenant-cards">{result?.items.map(tenant => <article key={tenant.id} className="tenant-card" aria-label={tenant.name + ' tenant'}>
        <header><span className="tenant-monogram" aria-hidden="true">{tenant.name.slice(0,1).toUpperCase()}</span><div className="tenant-card-heading"><h2>{tenant.name}</h2><p>{tenant.status === 'active' && workspace?.data.baseDomain ? <a className="tenant-site-link" href={workspaceUrl(tenant.slug, workspace.data.baseDomain, '/')} target="_blank" rel="noopener noreferrer" aria-label={'Open ' + tenant.name + ' site in a new tab'}><span>{tenant.slug}.{workspace.data.baseDomain}</span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7" /></svg></a> : <span>{tenant.slug}{workspace?.data.baseDomain ? '.' + workspace.data.baseDomain : ''}</span>}</p></div><Badge variant={tenant.status === 'active' ? 'success' : tenant.status === 'suspended' ? 'warning' : 'neutral'}>{tenant.status.slice(0, 1).toUpperCase() + tenant.status.slice(1)}</Badge></header>
        {tenant.status !== 'active' && <p className="tenant-card-note">Sign-in is paused. Tenant data is retained.</p>}
        <div className="tenant-card-actions"><Button variant="outline" onClick={() => setMembers(tenant)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m14-18a4 4 0 0 1 0 8m6 10v-2a4 4 0 0 0-3-3M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" /></svg>Members</Button><Button variant="outline" onClick={() => setEditing(tenant)}>Edit</Button><Button variant="outline" disabled={statusState.isLoading} onClick={() => void toggleStatus(tenant)}>{tenant.status === 'active' ? 'Suspend' : 'Resume'}</Button><Button variant="outline" className="tenant-delete" aria-label={'Delete ' + tenant.name} title="Move tenant to Trash" onClick={() => setRemoving(tenant)}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg></Button></div>
        {tenant.status === 'active' && mine?.data.items.some(item => item.id === tenant.id) && workspace?.data.baseDomain && <a className="tenant-open-link" href={workspaceUrl(tenant.slug, workspace.data.baseDomain, '/admin')}>Open administration <span aria-hidden="true">&#8594;</span></a>}
      </article>)}{!result?.items.length && <div className="tl-admin-empty"><strong>No tenants found</strong><p>Create a tenant or adjust your search.</p></div>}</div>}
      {result && <footer className="tl-admin-directory-footer"><span>{result.pagination.total} {result.pagination.total === 1 ? 'tenant' : 'tenants'}</span><div className="tl-flex tl-gap-2"><Button variant="outline" disabled={isFetching || !result.pagination.hasPreviousPage} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" disabled={isFetching || !result.pagination.hasNextPage} onClick={() => setPage(page + 1)}>Next</Button></div></footer>}
    </section>
    <ConfirmDialog open={!!removing} title="Move tenant to Trash?" message={(removing?.name ?? 'This tenant') + ' will be unavailable until restored. Users, memberships, products and orders are retained.'} confirmText="Move to Trash" destructive onClose={() => setRemoving(null)} onConfirm={async () => { if (removing) { await remove(removing.id).unwrap(); setMessage(removing.name + ' moved to Trash.'); } }} />
    <Modal open={editing !== null} title={editing === 'new' ? 'Create tenant' : 'Manage tenant'} onClose={() => setEditing(null)}>{editing && <TenantForm key={editing === 'new' ? 'new' : editing.id} tenant={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}</Modal>
    <Modal open={!!members} title={members ? members.name + ' members' : 'Members'} onClose={() => setMembers(null)}>{members && <Members key={members.id} tenant={members} />}</Modal>
  </ResourceLayout>;
}

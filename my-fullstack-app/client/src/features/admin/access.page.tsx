import { useState, type FormEvent } from 'react';
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

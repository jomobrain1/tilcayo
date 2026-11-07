import type { GeneratedSource } from "./frontend.js";
export function adminUserFiles(): GeneratedSource[] { return [{ folder: "features/admin", name: "user-management.tsx", source: `import { useAuth } from '../../app/auth';
import { useState, type FormEvent } from 'react';
import type { AdminDirectoryUser } from '@tilcayo/admin';
import { Alert, Button, FormField, Input, Modal, Spinner } from '@tilcayo/ui';
import { PasswordField } from '../../components/password-field';
import { useCreateAdminUserMutation, useGetAdminRolesQuery, useSetAdminUserStatusMutation } from './admin.api';
import { actionError } from './action-error';

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const platform = !!user?.tenancyEnabled && !user.tenant;
  const { data, isLoading, isError } = useGetAdminRolesQuery(undefined, { skip: platform });
  const [create, { isLoading: saving }] = useCreateAdminUserMutation();
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    try {
      await create({ name: String(form.get('name')).trim(), email: String(form.get('email')).trim(), password: String(form.get('password')), roles }).unwrap();
      onDone();
    } catch (failure) { setError(actionError(failure)); }
  }
  return <form className="tl-stack tl-admin-user-form" onSubmit={submit}>
    {error && <Alert variant="danger">{error}</Alert>}
    <FormField label="Full name" id="new-user-name">{props => <Input {...props} name="name" required minLength={2} maxLength={100} autoComplete="off" />}</FormField>
    <FormField label="Email address" id="new-user-email">{props => <Input {...props} name="email" type="email" required maxLength={254} autoComplete="off" />}</FormField>
    <PasswordField name="password" label="Initial password" autoComplete="new-password" placeholder="At least 8 characters" />
    <p className="tl-help-text">{user?.tenant ? 'Existing accounts keep their current name and password. For a new account, share the initial password privately.' : 'Share the initial password with the user privately. No email is sent.'}</p>
    {!platform && (isLoading ? <Spinner label="Loading roles" /> : isError ? <Alert variant="danger">Unable to load roles. Close this form and try again.</Alert> : <fieldset className="tl-admin-permissions"><legend>Roles</legend>{data?.data.map(role => <label key={role.key}><input type="checkbox" checked={roles.includes(role.key)} onChange={event => setRoles(event.target.checked ? [...roles, role.key] : roles.filter(key => key !== role.key))} />{role.name}</label>)}</fieldset>)}
    <p className="tl-help-text">{platform ? 'Assign workspace roles from Tenants after creating the account.' : 'Leave roles unchecked to create a regular member.'}</p>
    <div className="tl-flex tl-gap-2"><Button variant="outline" type="button" disabled={saving} onClick={onDone}>Cancel</Button><Button type="submit" disabled={saving || isLoading || isError}>{saving ? 'Creating...' : 'Create user'}</Button></div>
  </form>;
}

export function CreateUserButton() {
  const [open, setOpen] = useState(false);
  return <><Button onClick={() => setOpen(true)}>Add user</Button><Modal open={open} title="Add user" onClose={() => setOpen(false)}>{open && <CreateUserForm onDone={() => setOpen(false)} />}</Modal></>;
}

export function UserStatusAction({ account, disabled }: { account: AdminDirectoryUser; disabled?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [save, { isLoading }] = useSetAdminUserStatusMutation();
  const suspended = !!account.suspendedAt;
  const action = suspended ? 'Reactivate' : 'Suspend';
  return <>
    <Button variant="ghost" disabled={disabled} aria-label={action + ' ' + account.name} onClick={() => { setError(''); setOpen(true); }}>{action}</Button>
    <Modal open={open} title={action + ' user?'} onClose={() => { if (!isLoading) setOpen(false); }}><div className="tl-stack">
      <p>{suspended ? 'Allow ' : 'Suspend '}<strong>{account.name}</strong>{suspended ? ' to sign in again. Previous sessions remain signed out.' : user?.tenant ? ' and sign them out of this workspace until reactivated. Their other workspaces are unaffected.' : ' and sign out all their sessions. They cannot sign in until reactivated.'}</p>
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="tl-flex tl-gap-2"><Button variant="outline" disabled={isLoading} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={isLoading} onClick={async () => { setError(''); try { await save({ id: account.id, suspended: !suspended }).unwrap(); setOpen(false); } catch (failure) { setError(actionError(failure)); } }}>{isLoading ? 'Saving...' : action + ' user'}</Button></div>
    </div></Modal>
  </>;
}
` }]; }

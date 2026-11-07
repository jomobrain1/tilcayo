import { useState } from 'react';
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

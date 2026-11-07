import { useState, type FormEvent } from 'react';
import { Button, FormField, Input } from '@tilcayo/ui';
import type { CreateNoteInput } from '../notes.types';
import { errorMessage } from '../notes.feedback';

interface Props {
  initial?: CreateNoteInput;
  busy: boolean;
  onSave: (input: CreateNoteInput) => Promise<void>;
}


export function NoteForm({ initial, busy, onSave }: Props) {
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const input = {} as CreateNoteInput;
    input.title = String(form.get('title') ?? '').trim();
    if (String(form.get('content') ?? '').trim()) input.content = String(form.get('content') ?? '').trim();
      await onSave(input);
    } catch (cause) { setError(errorMessage(cause)); }
  }
  return <form className="tl-stack" onSubmit={submit}>
    {error && <p className="tl-alert tl-alert-danger" role="alert">{error}</p>}
    <fieldset className="tl-stack" disabled={busy}>
      <legend>Note details</legend>
      <FormField id="title" label="title">
        {props => <Input {...props} name="title" type="text" required defaultValue={initial?.title ?? ''} />}
      </FormField>
      <FormField id="content" label="content">
        {props => <Input {...props} name="content" type="text" defaultValue={initial?.content ?? ''} />}
      </FormField>
      <Button type="submit">{busy ? 'Saving...' : 'Save'}</Button>
    </fieldset>
  </form>;
}

import { PageSkeleton } from '@tilcayo/ui';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useGetNoteQuery, useDeleteNoteMutation } from '../notes.api';
import { errorMessage } from '../notes.feedback';

export function NotePage({ basePath = '/notes' }: { basePath?: string }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetNoteQuery(id, { skip: !id });
  const [remove, { isLoading: deleting }] = useDeleteNoteMutation();
  const [deleteError, setDeleteError] = useState('');
  async function destroy() {
    if (!window.confirm('Delete this note?')) return;
    try { await remove(id).unwrap(); navigate(basePath); }
    catch (cause) { setDeleteError(errorMessage(cause)); }
  }
  if (isLoading) return <PageSkeleton variant="content" label="Loading note" />;
  if (error) return <p role="alert">{errorMessage(error)}</p>;
  if (!data) return <p>Note not found.</p>;
  const item = data.data;
  return <section className="tl-stack">
    <h1>Note</h1>
    <dl><dt>title</dt><dd>{String(item.title ?? '')}</dd><dt>content</dt><dd>{String(item.content ?? '')}</dd></dl>
    {deleteError && <p role="alert">{deleteError}</p>}
    <Link to={basePath}>Back to notes</Link>
    <Link to={basePath + '/' + encodeURIComponent(id) + '/edit'}>Edit</Link>
    <button className="tl-btn tl-btn-danger" disabled={deleting} onClick={() => void destroy()}>{deleting ? 'Deleting...' : 'Delete'}</button>
  </section>;
}

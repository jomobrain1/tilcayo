import { FormSkeleton } from '@tilcayo/ui';
import { useNavigate, useParams } from 'react-router';
import { useGetNoteQuery, useUpdateNoteMutation } from '../notes.api';
import { NoteForm } from '../components/note-form';
import { errorMessage } from '../notes.feedback';

export function EditNotePage({ basePath = '/notes' }: { basePath?: string }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetNoteQuery(id, { skip: !id });
  const [update, { isLoading: saving }] = useUpdateNoteMutation();
  if (isLoading) return <FormSkeleton label="Loading note" />;
  if (error) return <p role="alert">{errorMessage(error)}</p>;
  if (!data) return <p>Note not found.</p>;
  return <section className="tl-stack"><h1>Edit note</h1>
    <NoteForm key={id} initial={data.data} busy={saving} onSave={async changes => {
      await update({ id, changes }).unwrap();
      navigate(basePath + '/' + encodeURIComponent(id));
    }} />
  </section>;
}

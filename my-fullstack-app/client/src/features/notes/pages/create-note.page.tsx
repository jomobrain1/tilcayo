import { useNavigate } from 'react-router';
import { useCreateNoteMutation } from '../notes.api';
import { NoteForm } from '../components/note-form';

export function CreateNotePage({ basePath = '/notes' }: { basePath?: string }) {
  const navigate = useNavigate();
  const [create, { isLoading }] = useCreateNoteMutation();
  return <section className="tl-stack"><h1>Create note</h1>
    <NoteForm busy={isLoading} onSave={async input => {
      const result = await create(input).unwrap();
      navigate(basePath + '/' + encodeURIComponent(result.data._id));
    }} />
  </section>;
}

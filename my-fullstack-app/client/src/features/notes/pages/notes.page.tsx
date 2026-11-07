import { TableSkeleton } from '@tilcayo/ui';
import { Link } from 'react-router';
import { Table } from '@tilcayo/ui';
import { useGetNotesQuery } from '../notes.api';
import { errorMessage } from '../notes.feedback';

export function NotesPage({ basePath = '/notes' }: { basePath?: string }) {
  const { data, isLoading, error, refetch } = useGetNotesQuery();
  if (isLoading) return <TableSkeleton label="Loading notes" />;
  if (error) return <section><p role="alert">{errorMessage(error)}</p><button className="tl-btn" onClick={() => void refetch()}>Retry</button></section>;
  return <section className="tl-stack">
    <h1>Notes</h1>
    <Link className="tl-btn tl-btn-primary" to={basePath + '/new'}>Create note</Link>
    {!data?.data.length ? <p>No notes yet.</p> : <Table>
      <caption>Notes</caption>
      <thead><tr><th scope="col">ID</th><th scope="col">title</th><th scope="col">content</th><th scope="col">Actions</th></tr></thead>
      <tbody>{data.data.map(item => <tr key={item._id}><td>{item._id}</td><td>{String(item.title ?? '')}</td><td>{String(item.content ?? '')}</td><td><Link to={basePath + '/' + encodeURIComponent(item._id)}>View</Link></td></tr>)}</tbody>
    </Table>}
  </section>;
}

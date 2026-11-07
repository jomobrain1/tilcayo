import type { RouteObject } from 'react-router';
import { NotesPage } from './pages/notes.page';
import { NotePage } from './pages/note.page';
import { CreateNotePage } from './pages/create-note.page';
import { EditNotePage } from './pages/edit-note.page';

// Pass ('books', '/admin/books') when nesting under the admin layout.
export function createNotesRoutes(path = 'notes', basePath = '/notes'): RouteObject[] {
  return [{ path, children: [
    { index: true, element: <NotesPage basePath={basePath} /> },
    { path: 'new', element: <CreateNotePage basePath={basePath} /> },
    { path: ':id', element: <NotePage basePath={basePath} /> },
    { path: ':id/edit', element: <EditNotePage basePath={basePath} /> },
  ] }];
}

export const notesRoutes = createNotesRoutes();

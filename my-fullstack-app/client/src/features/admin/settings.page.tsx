import { useSearchParams } from 'react-router';
import { AccessPage } from './access.page';
import { TrashPage } from './trash.page';
import { UsersPage } from './users.page';

export function SettingsPage() {
  const [params] = useSearchParams();
  return params.get('section') === 'users' ? <UsersPage /> : params.get('section') === 'trash' ? <TrashPage /> : <AccessPage />;
}

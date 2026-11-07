import { AdminProfile } from '@tilcayo/admin';
import { ProfilePhoto } from '../../components/profile-photo';
import { useAuth } from '../../app/auth';

export function ProfilePage() {
  const { user, restoreSession } = useAuth();
  return <AdminProfile user={user} onRefreshSession={restoreSession} photoControls={<ProfilePhoto />} />;
}

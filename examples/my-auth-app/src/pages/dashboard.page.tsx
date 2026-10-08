import { useAuth } from '../app/auth'

export function DashboardPage() {
  const { user } = useAuth()
  return <section className="tl-stack">
    <h1 className="tl-heading-1">Your account</h1>
    <p>Welcome, {user?.name}.</p>
    <div className="tl-card tl-stack"><h2 className="tl-heading-3">Profile</h2><p>{user?.email}</p></div>
  </section>
}

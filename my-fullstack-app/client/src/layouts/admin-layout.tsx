import { NavLink, Outlet } from 'react-router'

export function AdminLayout() {
  return <section className="tl-stack">
    <nav aria-label="Admin"><NavLink to="/admin">Dashboard</NavLink>{' '}<NavLink to="/admin/profile">Profile</NavLink></nav>
    <Outlet />
  </section>
}

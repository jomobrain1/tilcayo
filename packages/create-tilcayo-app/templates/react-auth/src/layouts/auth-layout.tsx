import { Outlet } from 'react-router'

export function AuthLayout() {
  return <section className="tl-stack" aria-label="Authentication"><Outlet /></section>
}

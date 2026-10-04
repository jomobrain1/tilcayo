import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="tl-stack">
      <h1 className="tl-heading-1">404 - Page not found</h1>
      <div><Link className="tl-btn tl-btn-primary" to="/">Back to home</Link></div>
    </section>
  )
}

import { Link } from 'react-router'

export function AboutPage() {
  return (
    <section className="tl-stack">
      <h1 className="tl-heading-1">About</h1>
      <p>A React starter with Tilcayo styles and basic routing.</p>
      <div><Link className="tl-btn tl-btn-outline" to="/">Back to home</Link></div>
    </section>
  )
}

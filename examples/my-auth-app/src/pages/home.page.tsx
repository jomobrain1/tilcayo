import { Link } from 'react-router'

export function HomePage() {
  return (
    <>
      <section className="starter-hero">
        <h1 className="tl-heading-1">Welcome to Tilcayo.</h1>
        <p className="tl-text-muted">Your app starts here.</p>
        <div className="tl-flex tl-flex-wrap tl-gap-3 starter-actions">
          <Link className="tl-btn tl-btn-primary" to="/elements">Elements</Link>
          <Link className="tl-btn tl-btn-outline" to="/about">About</Link>
        </div>
      </section>
      <div className="tl-grid tl-grid-cols-2">
        <section className="tl-card tl-stack" aria-labelledby="input-title">
          <h2 id="input-title" className="tl-heading-3">Input</h2>
          <div className="tl-form-group">
            <label className="tl-label" htmlFor="name">Name</label>
            <input className="tl-input" id="name" placeholder="Your name" />
          </div>
        </section>
        <section className="tl-card tl-stack" aria-labelledby="card-title">
          <h2 id="card-title" className="tl-heading-3">Card</h2>
          <p className="tl-text-muted">A simple container for your content.</p>
          <div><span className="tl-badge tl-badge-neutral">Example</span></div>
        </section>
      </div>
    </>
  )
}

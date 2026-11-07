import { Link } from 'react-router'
import { ArrowIcon, StarterIcon } from '../components/starter-visuals'
import { CodePreview } from '../components/code-preview'

export function HomePage() {
  return <>
    <section className="starter-hero starter-toolkit-hero">
      <div className="starter-hero-copy">
        <p className="starter-eyebrow">The full-stack TypeScript toolkit</p>
        <h1>Build full-stack<br className="starter-hero-break" /> apps with Tilcayo.</h1>
        <p className="starter-lead">A modern TypeScript toolkit and framework for building, shipping, and scaling full-stack applications.</p>
        <div className="starter-actions">
          <Link className="tl-btn tl-btn-primary" to="/elements">Get Started <ArrowIcon /></Link>
          <a className="tl-btn tl-btn-outline" href="https://github.com/jomobrain1/tilcayo#readme" target="_blank" rel="noreferrer">View Docs</a>
        </div>
      </div>
      <CodePreview />
    </section>
    <div className="starter-toolkit-features">
      <section className="starter-toolkit-feature"><StarterIcon name="code" /><div><h2>Type-safe APIs</h2><p>Build typed APIs with validation and predictable responses.</p></div></section>
      <section className="starter-toolkit-feature"><StarterIcon name="shield" /><div><h2>Authentication ready</h2><p>Protected routes, roles, and session handling built in.</p></div></section>
      <section className="starter-toolkit-feature"><StarterIcon name="terminal" /><div><h2>CLI scaffolding</h2><p>Create an app and generate resources with the Tilcayo CLI.</p></div></section>
    </div>
  </>
}

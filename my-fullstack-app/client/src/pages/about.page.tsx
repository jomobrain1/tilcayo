import { useId } from 'react'
import { Link } from 'react-router'
import { ArrowIcon, StarterIcon } from '../components/starter-visuals'
import { authArchitectureImage } from '../lib/starter-images'

export function AboutPage() {
  const clipId = useId()
  return <>
    <section className="starter-hero starter-hero-about">
      <div className="starter-hero-copy">
        <p className="starter-eyebrow">About Tilcayo</p>
        <h1>A TypeScript framework for modern web apps.</h1>
        <p className="starter-lead">Tilcayo brings together an API, a clean architecture, and developer tools to help you build, secure, and ship applications faster.</p>
        <div className="starter-actions">
          <Link className="tl-btn tl-btn-primary" to="/elements">Get Started <ArrowIcon /></Link>
          <a className="tl-btn tl-btn-outline" href="https://github.com/jomobrain1/tilcayo" target="_blank" rel="noreferrer">View on GitHub <ArrowIcon diagonal /></a>
        </div>
      </div>
      <div className="starter-hero-media starter-about-art" style={{ clipPath: `url(#${clipId})` }}>
        <svg width="0" height="0" aria-hidden="true" focusable="false"><defs><clipPath id={clipId} clipPathUnits="objectBoundingBox"><path d="M.63 0H1V.95H.21C.025.95-.07.91.045.75Z" /></clipPath></defs></svg>
        <img src={authArchitectureImage} alt="Contemporary dark building with a sharp roofline and warm interior lighting" />
      </div>
    </section>
    <div className="starter-feature-strip">
      <section><StarterIcon name="code" /><div><h2>Type-safe API</h2><p>Express + TypeScript with Zod validation.</p></div></section>
      <section><StarterIcon name="shield" /><div><h2>Authentication</h2><p>JWT with protected routes and roles.</p></div></section>
      <section><StarterIcon name="layers" /><div><h2>CLI &amp; Scaffolding</h2><p>Generate modules, controllers, and routes.</p></div></section>
    </div>
  </>
}

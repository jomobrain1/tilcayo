import { useId } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { BrandMark } from '../components/starter-visuals'
import { authArchitectureImage } from '../lib/starter-images'

export function AuthLayout() {
  const { pathname } = useLocation()
  const clipId = useId()
  return <div className="auth-page"><section className={`auth-scene${pathname === '/register' ? ' auth-scene-register' : ''}`} aria-label="Authentication">
    <div className="auth-scene-content">
      <div className="auth-topbar"><Link className="starter-brand auth-brand" to="/" aria-label="Tilcayo home"><BrandMark />Tilcayo</Link></div>
      <div className="auth-scene-form"><Outlet /></div>
    </div>
    <div className="auth-scene-art" aria-hidden="true" style={{ clipPath: `url(#${clipId})` }}>
      <svg width="0" height="0" focusable="false"><defs><clipPath id={clipId} clipPathUnits="objectBoundingBox"><path d="M.72 0H.97Q1 0 1 .03V.97Q1 1 .97 1H.21C.025 1-.07 .95 .045 .78L.59 .08Q.65 0 .72 0Z" /></clipPath></defs></svg>
      <img src={authArchitectureImage} alt="" />
    </div>
  </section></div>
}

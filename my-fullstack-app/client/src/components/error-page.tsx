import { useId } from 'react'
import { Link } from 'react-router'

type Action = { to: string; label: string }
export function ErrorPage({ code, title, description, primary, secondary, note }: { code: '403' | '404'; title: string; description: string; primary: Action; secondary: Action; note: string }) {
  const titleId = useId()
  return <section className="site-error" aria-labelledby={titleId}>
    <div className="site-error-visual" aria-hidden="true"><span className="site-error-code">{code}</span><span className="site-error-symbol"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{code === '403' ? <><path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7Z" /><path d="M12 8v5m0 3h.01" /></> : <><path d="M13 3H5v18h6M13 3l5 5h-5V3M8 8h2m-2 4h3" /><circle cx="16" cy="16" r="4" /><path d="m19 19 3 3" /></>}</svg></span></div>
    <div className="site-error-content"><p className="site-error-eyebrow">{code === '403' ? 'Access restricted' : 'A missing page'}</p><h1 id={titleId}>{title}</h1><p className="site-error-description">{description}</p><div className="site-error-actions"><Link className="tl-btn tl-btn-primary" to={primary.to}>{primary.label}<span aria-hidden="true">&#8594;</span></Link><Link className="tl-btn tl-btn-outline" to={secondary.to}>{secondary.label}</Link></div><p className="site-error-note">{note}</p></div>
  </section>
}

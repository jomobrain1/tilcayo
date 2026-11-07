import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Navigation } from './navigation'

export function SiteHeader() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return <header className={`starter-header${scrolled ? ' is-scrolled' : ''}`}><Navigation /></header>
}

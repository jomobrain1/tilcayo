import { useLocation } from 'react-router'
import { PageSkeleton } from '@tilcayo/ui'
import { SiteHeader } from './site-header'

export function SessionSkeleton() {
  const { pathname } = useLocation()
  if (/^\/(login|register|forgot-password)(?:\/|$)/.test(pathname)) return <PageSkeleton variant="auth" label="Checking your session" />
  return <div className="starter-site"><SiteHeader /><main className="tl-container starter-main"><PageSkeleton variant="content" label="Checking your session" /></main></div>
}

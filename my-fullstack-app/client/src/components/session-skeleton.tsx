import { AdminSessionShell } from '../features/admin/session-shell';
import { useGetWorkspaceQuery } from '../features/tenancy/tenancy.api';
import { useLocation } from 'react-router'
import { PageSkeleton } from '@tilcayo/ui'
import { SiteHeader } from './site-header'

export function SessionSkeleton() {
  useGetWorkspaceQuery();
  const { pathname } = useLocation()
  if (/^\/admin(?:\/|$)/.test(pathname)) return <AdminSessionShell />
  if (/^\/(login|register|forgot-password)(?:\/|$)/.test(pathname)) return <PageSkeleton variant="auth" label="Checking your session" />
  return <div className="starter-site"><SiteHeader /><main className="tl-container starter-main"><PageSkeleton variant="content" label="Checking your session" /></main></div>
}

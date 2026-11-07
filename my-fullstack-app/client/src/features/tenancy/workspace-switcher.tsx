import { PageSkeleton } from '@tilcayo/ui';
import type { ReactNode } from 'react';
import { useGetWorkspaceQuery } from './tenancy.api';

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const { isLoading, isError, error, refetch } = useGetWorkspaceQuery();
  if (isLoading) return <PageSkeleton variant="content" label="Loading workspace" />;
  if (isError) return <main className="workspace-unavailable"><span className="workspace-eyebrow">Tilcayo workspace</span><h1>Workspace unavailable</h1><p>{error && 'message' in error ? String(error.message) : 'Unable to load this workspace.'}</p><button className="tl-btn tl-btn-primary" onClick={() => void refetch()}>Try again</button></main>;
  return children;
}
export function WorkspaceIdentity() {
  const { data } = useGetWorkspaceQuery();
  return data?.data.tenant ? <div className="workspace-identity" aria-label="Current workspace"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" /></svg><strong>{data.data.tenant.name} Workspace</strong></div> : null;
}

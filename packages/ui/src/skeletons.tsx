import type { CSSProperties, ReactNode } from 'react';

type LoadingProps = { label?: string; className?: string };
const countOf = (value: number, limit = 20) => Math.max(1, Math.min(limit, Math.floor(value) || 1));
export function Skeleton({ width = '100%', height = 12, circle = false, className = '' }: { width?: CSSProperties['width']; height?: CSSProperties['height']; circle?: boolean; className?: string }) {
  return <span aria-hidden="true" className={'tl-skeleton ' + className} style={{ width, height, ...(circle ? { borderRadius: '50%' } : {}) }} />;
}
export function SkeletonGroup({ label = 'Loading content', className = '', children }: LoadingProps & { children: ReactNode }) {
  return <div className={'tl-skeleton-region ' + className} role="status" aria-live="polite" aria-busy="true" aria-label={label}><span className="tl-sr-only">{label}</span><div className="tl-skeleton-visual" aria-hidden="true">{children}</div></div>;
}
function CardPlaceholders({ count }: { count: number }) {
  return <div className="tl-skeleton-grid">{Array.from({ length: countOf(count, 12) }, (_, i) => <div className="tl-skeleton-card" key={i}><div className="tl-skeleton-inline"><Skeleton width={36} height={36} /><div className="tl-skeleton-fill"><Skeleton width="65%" height={14} /><Skeleton width="85%" height={10} /></div></div><Skeleton width="74%" /><div className="tl-skeleton-inline tl-skeleton-card-footer"><Skeleton width={74} height={30} /><Skeleton width={50} height={30} /></div></div>)}</div>;
}
export function CardsSkeleton({ count = 3, label = 'Loading cards', className }: LoadingProps & { count?: number }) {
  return <SkeletonGroup label={label} className={className}><CardPlaceholders count={count} /></SkeletonGroup>;
}
export function TableSkeleton({ rows = 5, columns = 4, label = 'Loading table', className }: LoadingProps & { rows?: number; columns?: number }) {
  const style = { gridTemplateColumns: `repeat(${countOf(columns, 12)},minmax(0,1fr))` };
  return <SkeletonGroup label={label} className={className}><div className="tl-skeleton-table">{Array.from({ length: countOf(rows) + 1 }, (_, row) => <div className={'tl-skeleton-table-row' + (row === 0 ? ' is-header' : '')} style={style} key={row}>{Array.from({ length: countOf(columns, 12) }, (_, col) => <Skeleton key={col} width={col === 0 ? '78%' : '60%'} height={row === 0 ? 10 : 12} />)}</div>)}</div></SkeletonGroup>;
}
export function ListSkeleton({ rows = 4, label = 'Loading list', className }: LoadingProps & { rows?: number }) {
  return <SkeletonGroup label={label} className={className}><div className="tl-skeleton-list">{Array.from({ length: countOf(rows) }, (_, i) => <div className="tl-skeleton-inline" key={i}><Skeleton width={34} height={34} circle /><div className="tl-skeleton-fill"><Skeleton width="62%" /><Skeleton width="40%" height={10} /></div></div>)}</div></SkeletonGroup>;
}
function FormPlaceholders({ fields }: { fields: number }) {
  return <div className="tl-skeleton-form">{Array.from({ length: countOf(fields, 8) }, (_, i) => <div key={i}><Skeleton width={78} height={10} /><Skeleton height={44} /></div>)}<Skeleton height={44} /></div>;
}
export function FormSkeleton({ fields = 3, label = 'Loading form', className }: LoadingProps & { fields?: number }) {
  return <SkeletonGroup label={label} className={className}><FormPlaceholders fields={fields} /></SkeletonGroup>;
}
export function PageSkeleton({ variant = 'page', label = 'Loading page', className = '' }: LoadingProps & { variant?: 'admin' | 'page' | 'auth' | 'content' }) {
  const admin = variant === 'admin', auth = variant === 'auth', content = variant === 'content';
  return <SkeletonGroup label={label} className={'tl-loading-page tl-loading-' + (content ? 'inline' : variant) + ' ' + className}>
    {admin && <aside className="tl-loading-sidebar"><Skeleton width={134} height={26} /><div className="tl-loading-menu">{Array.from({ length: 6 }, (_, i) => <div className="tl-skeleton-inline" key={i}><Skeleton width={20} height={20} /><Skeleton width={100} /></div>)}</div></aside>}
    <div className="tl-loading-main">
      {!content && !auth && <div className="tl-loading-topbar"><Skeleton width={admin ? 220 : 120} height={28} /><Skeleton width={38} height={38} circle /></div>}
      <div className="tl-loading-content"><div className="tl-loading-heading">{auth && <Skeleton width={140} height={28} />}<Skeleton width={auth ? '78%' : '36%'} height={32} /><Skeleton width={auth ? '90%' : '58%'} height={12} /></div>{auth ? <FormPlaceholders fields={3} /> : <><CardPlaceholders count={3} /><div className="tl-skeleton-panel"><Skeleton width="30%" height={18} /><div className="tl-skeleton-list">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={32} />)}</div></div></>}</div>
    </div>
    {auth && <div className="tl-loading-auth-art"><Skeleton height="100%" /></div>}
  </SkeletonGroup>;
}

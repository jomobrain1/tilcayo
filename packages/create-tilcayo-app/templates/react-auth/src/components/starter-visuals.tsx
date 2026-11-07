type IconName = 'layers' | 'cube' | 'cursor' | 'code' | 'shield' | 'terminal'

export function BrandMark() {
  return <svg className="starter-brand-mark" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M3 4h12l-5 7H3l5-7Zm14 0h12L10 28H0L17 4Z" /></svg>
}
export function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h16m-6-6 6 6-6 6'} /></svg>
}
export function StarterIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    layers: 'm12 3 10 6-10 6L2 9Zm-9 10 9 5 9-5M3 17l9 5 9-5',
    cube: 'm12 2 10 6v10l-10 5L2 18V8Zm0 11v10M2 8l10 5L22 8',
    cursor: 'm8 7 11 5-5 2-2 5ZM3 3l2 2m5-5v3M0 10h3m13-7-2 2M3 16l2-2m12 3 4 4',
    code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
    terminal: 'm4 5 7 7-7 7m10 0h7',
    shield: 'm12 2 9 4v7c0 5-9 9-9 9s-9-4-9-9V6Z',
  }
  return <span className="starter-feature-icon" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg></span>
}

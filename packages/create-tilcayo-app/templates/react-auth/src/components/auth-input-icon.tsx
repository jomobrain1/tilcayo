export function AuthInputIcon({ kind }: { kind: 'email' | 'name' | 'lock' }) {
  const path = kind === 'email' ? 'M3 5h18v14H3Zm0 0 9 8 9-8' : kind === 'name' ? 'M20 21v-2a8 8 0 0 0-16 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' : 'M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3'
  return <svg className="auth-input-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>
}

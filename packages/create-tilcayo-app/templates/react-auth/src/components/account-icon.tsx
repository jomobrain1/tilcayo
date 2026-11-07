type AccountIconName = 'user' | 'dashboard' | 'shield' | 'logout' | 'edit' | 'mail' | 'calendar' | 'lock' | 'monitor' | 'arrow' | 'globe'

export function AccountIcon({ name }: { name: AccountIconName }) {
  const paths: Record<AccountIconName, string> = {
    user: 'M20 21v-2a8 8 0 0 0-16 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z',
    logout: 'M9 4H4v16h5m5-13 5 5-5 5m-6-5h11',
    edit: 'm16 3 5 5-12 12-6 1 1-6Zm-2 2 5 5',
    mail: 'M3 5h18v14H3zm0 1 9 7 9-7',
    calendar: 'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16',
    lock: 'M5 10h14v11H5zm3 0V7a4 4 0 0 1 8 0v3m-4 5v2',
    monitor: 'M3 4h18v13H3zm5 17h8m-4-4v4',
    arrow: 'm9 5 7 7-7 7',
    globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18m-9-9c5 5 5 13 0 18-5-5-5-13 0-18Z',
  }
  return <svg className="account-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

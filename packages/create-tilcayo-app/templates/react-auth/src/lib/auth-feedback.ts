export function authErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    if ('kind' in error && error.kind === 'network') return 'Unable to reach the server. Please try again.'
    if ('message' in error && typeof error.message === 'string') return error.message
  }
  return 'Something went wrong. Please try again.'
}

type ReturnUser = { roles?: readonly string[]; adminTabs?: readonly string[]; platformRole?: string; tenant?: unknown }

export function returnPath(state: unknown, user?: ReturnUser | null): string {
  const fallback = '/dashboard'
  const from = state && typeof state === 'object' && 'from' in state ? state.from : undefined
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//') || from.includes('\\')) return fallback
  let url: URL, path: string
  try {
    url = new URL(from, 'http://tilcayo.local')
    if (url.origin !== 'http://tilcayo.local') return fallback
    path = (decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/').toLowerCase()
  } catch { return fallback }
  if (path.includes('\\') || path.startsWith('//') || /^\/(login|register|forgot-password|forbidden)(\/|$)/.test(path)) return fallback
  if (path === '/admin' || path.startsWith('/admin/')) {
    const platform = user?.platformRole === 'superadmin' && !user.tenant
    const administrator = !!user?.roles?.includes('admin')
    const tabs = user?.adminTabs ?? []
    const can = (tab: string) => tab === 'tenants' ? platform : administrator || tabs.includes(tab)
    if (!platform && !administrator && !tabs.length) return fallback
    const section = url.searchParams.get('section')
    let required: string | undefined
    if ((path === '/admin' || path === '/admin/dashboard') && section) required = section === 'users' ? 'users' : section === 'inventory' ? 'inventory' : 'overview'
    if (path === '/admin/users') required = 'users'
    if (path === '/admin/workspaces') required = 'tenants'
    if (path === '/admin/access') required = 'access'
    if (path === '/admin/trash') required = 'trash'
    if (path === '/admin/settings' && section) required = section === 'tenants' ? 'tenants' : section === 'users' ? 'users' : section === 'trash' ? 'trash' : 'access'
    if (path === '/admin/products') {
      const productTabs = ['catalog', 'inventory', 'categories', 'orders']
      if (!section) { if (!productTabs.some(can)) return fallback }
      else required = productTabs.includes(section) ? section : 'catalog'
    }
    if (required && !can(required)) return fallback
  }
  return from
}

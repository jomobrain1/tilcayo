export function authErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    if ('kind' in error && error.kind === 'network') return 'Unable to reach the server. Please try again.'
    if ('message' in error && typeof error.message === 'string') return error.message
  }
  return 'Something went wrong. Please try again.'
}

export function returnPath(state: unknown): string {
  const from = state && typeof state === 'object' && 'from' in state ? state.from : undefined
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//') || from.includes('\\')) return '/dashboard'
  if (/^\/(login|register)([/?#]|$)/.test(from)) return '/dashboard'
  return from
}

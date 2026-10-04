type Toast = { message: string; kind: 'success' | 'error' | 'warning' | 'info' }

let current: Toast | null = null
const listeners = new Set<() => void>()

function update(value: Toast | null) {
  current = value
  listeners.forEach(listener => listener())
}

export const toast = {
  success: (message: string) => update({ message, kind: 'success' }),
  error: (message: string) => update({ message, kind: 'error' }),
  warning: (message: string) => update({ message, kind: 'warning' }),
  info: (message: string) => update({ message, kind: 'info' }),
  dismiss: () => update(null),
}

export const toastStore = {
  getSnapshot: () => current,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
}

type Toast = { message: string; kind: 'success' | 'error' }

let current: Toast | null = null
const listeners = new Set<() => void>()

function update(value: Toast | null) {
  current = value
  listeners.forEach(listener => listener())
}

export const toast = {
  success: (message: string) => update({ message, kind: 'success' }),
  error: (message: string) => update({ message, kind: 'error' }),
  dismiss: () => update(null),
}

export const toastStore = {
  getSnapshot: () => current,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
}

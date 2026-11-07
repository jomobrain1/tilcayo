import { useEffect, useSyncExternalStore } from 'react'
import { toast, toastStore } from '../lib/toast'

type ToasterProps = {
  /** Milliseconds before dismissal. Set to 0 to dismiss manually. */
  duration?: number
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  compact?: boolean
  className?: string
}

export function Toaster({ duration = 4000, position = 'bottom-right', compact = true, className = '' }: ToasterProps) {
  const notification = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, () => null)

  useEffect(() => {
    if (!notification || duration <= 0 || !Number.isFinite(duration)) return
    const timer = setTimeout(toast.dismiss, duration)
    return () => clearTimeout(timer)
  }, [notification, duration])

  return (
    <aside className={`starter-toaster ${className}`} data-position={position} data-compact={compact || undefined} aria-label="Notifications">
      <div role="status" aria-atomic="true">
        {notification && <div className={`starter-toast starter-toast-${notification.kind}`}>
          <svg className="starter-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d={notification.kind === 'success' ? 'm8 12 3 3 5-6' : notification.kind === 'error' ? 'm9 9 6 6m0-6-6 6' : 'M12 7v6m0 4h.01'} /></svg>
          <p>{notification.message}</p>
          <button type="button" aria-label="Dismiss notification" onClick={toast.dismiss}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
          </button>
        </div>}
      </div>
    </aside>
  )
}

import { useEffect, useSyncExternalStore } from 'react'
import { toast, toastStore } from '../lib/toast'

export function Toaster() {
  const notification = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, () => null)

  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(toast.dismiss, 5000)
    return () => clearTimeout(timer)
  }, [notification])

  return (
    <aside className="starter-toaster" aria-label="Notifications">
      <div role="status" aria-atomic="true">
        {notification && <div className={`starter-toast starter-toast-${notification.kind}`}>
          <p>{notification.message}</p>
          <button type="button" aria-label="Dismiss notification" onClick={toast.dismiss}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
          </button>
        </div>}
      </div>
    </aside>
  )
}

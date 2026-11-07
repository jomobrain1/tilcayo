import '@tilcayo/styles/index.css'
import { useEffect, useRef, useState } from 'react'
import { LoadingButton } from '@tilcayo/ui'

export default function LoadingButtonExample() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  return <div className="tl-stack"><div><LoadingButton loading={loading} loadingText="Saving..." onClick={() => {
    setLoading(true); setMessage('')
    timer.current = setTimeout(() => { setLoading(false); setMessage('Changes saved locally.') }, 800)
  }}>Save changes</LoadingButton></div><p role="status" className="tl-help-text">{message || 'A short local demo; no network request.'}</p></div>
}

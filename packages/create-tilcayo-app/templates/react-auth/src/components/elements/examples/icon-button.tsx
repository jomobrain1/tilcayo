import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { IconButton } from '@tilcayo/ui'

export default function IconButtonExample() {
  const [saved, setSaved] = useState(false)
  return <div className="tl-flex tl-items-center tl-gap-3">
    <IconButton label={saved ? 'Remove bookmark' : 'Bookmark project'} variant="outline" aria-pressed={saved} onClick={() => setSaved(!saved)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4Z" /></svg>
    </IconButton><span role="status">{saved ? 'Bookmarked' : 'Save this project'}</span>
  </div>
}

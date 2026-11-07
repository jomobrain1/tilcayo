import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Switch } from '@tilcayo/ui'

export default function SwitchExample() {
  const [enabled, setEnabled] = useState(false)
  return <div className="tl-stack"><Switch label="Email notifications" checked={enabled} onCheckedChange={setEnabled} /><p role="status" className="tl-help-text">Notifications are {enabled ? 'on' : 'off'}.</p></div>
}

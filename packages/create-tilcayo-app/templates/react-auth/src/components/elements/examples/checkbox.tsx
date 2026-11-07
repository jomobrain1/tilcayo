import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Checkbox } from '@tilcayo/ui'

export default function CheckboxExample() {
  const [checked, setChecked] = useState(false)
  return <div className="tl-stack"><Checkbox label="Send me project updates" checked={checked} onChange={event => setChecked(event.target.checked)} /><p role="status" className="tl-help-text">{checked ? 'Project updates enabled.' : 'Project updates disabled.'}</p></div>
}

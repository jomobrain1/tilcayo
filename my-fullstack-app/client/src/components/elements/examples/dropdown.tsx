import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { DropdownMenu } from '@tilcayo/ui'

export default function DropdownExample() {
  const [message, setMessage] = useState('Choose a project action.')
  return <div className="tl-stack"><div><DropdownMenu label="Project actions" items={[
    { label: 'Rename', onSelect: () => setMessage('Rename selected.') },
    { label: 'Duplicate', onSelect: () => setMessage('Duplicate selected.') },
    { label: 'Archive', danger: true, onSelect: () => setMessage('Archive selected.') },
  ]} /></div><p role="status" className="tl-help-text">{message}</p></div>
}

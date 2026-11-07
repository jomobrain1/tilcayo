import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Button } from '@tilcayo/ui'

export default function ButtonVariantsExample() {
  const [message, setMessage] = useState('Choose an action.')
  return <div className="tl-stack"><div className="tl-flex tl-flex-wrap tl-gap-2">
    <Button onClick={() => setMessage('Primary action selected.')}>Primary</Button>
    <Button variant="outline" onClick={() => setMessage('Outline action selected.')}>Outline</Button>
    <Button variant="ghost" onClick={() => setMessage('Ghost action selected.')}>Ghost</Button>
  </div><p className="tl-help-text" role="status">{message}</p></div>
}

import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Alert, Button, FormField, Input, Switch } from '@tilcayo/ui'

export default function ProfileFormExample() {
  const [updates, setUpdates] = useState(true)
  const [message, setMessage] = useState('')
  return <form className="tl-stack" onSubmit={event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setMessage(`Saved ${String(data.get('name'))} locally. Updates ${updates ? 'enabled' : 'disabled'}.`)
  }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
      <FormField label="Full name">{props => <Input {...props} name="name" defaultValue="Alex Morgan" required minLength={2} maxLength={80} autoComplete="name" />}</FormField>
      <FormField label="Contact email">{props => <Input {...props} name="email" type="email" defaultValue="alex@example.com" required autoComplete="email" />}</FormField>
    </div>
    <Switch label="Receive product updates" checked={updates} onCheckedChange={setUpdates} />
    <div><Button type="submit">Save profile</Button></div>
    {message && <Alert variant="success" role="status">{message}</Alert>}
  </form>
}

import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Alert, Button, FormField, Input } from '@tilcayo/ui'

export default function ValidationFormExample() {
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const [saved, setSaved] = useState(false)
  return <form className="tl-stack" noValidate onSubmit={event => {
    event.preventDefault(); setSaved(false)
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const next = { name: name.length < 2 ? 'Enter at least 2 characters.' : undefined, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : 'Enter a valid email address.' }
    setErrors(next)
    if (!next.name && !next.email) setSaved(true)
  }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
      <FormField label="Name" error={errors.name}>{props => <Input {...props} name="name" required placeholder="Try submitting an empty form" />}</FormField>
      <FormField label="Email address" error={errors.email}>{props => <Input {...props} name="email" type="email" required placeholder="alex@example.com" />}</FormField>
    </div>
    <div><Button type="submit">Validate form</Button></div>
    {saved && <Alert variant="success" role="status">Both fields are valid. No data was sent.</Alert>}
  </form>
}

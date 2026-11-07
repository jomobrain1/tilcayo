import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Alert, Button, Checkbox, FormField, Input, PasswordInput } from '@tilcayo/ui'

export default function LoginFormExample() {
  const [message, setMessage] = useState('')
  return <form className="tl-stack" style={{ maxWidth: 440 }} onSubmit={event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setMessage(`Form validated for ${String(data.get('email'))}. This demo does not sign you in.`)
  }}>
    <FormField label="Email">{props => <Input {...props} name="email" type="email" autoComplete="username" required placeholder="alex@example.com" />}</FormField>
    <FormField label="Password">{props => <PasswordInput {...props} name="password" autoComplete="current-password" minLength={8} required placeholder="At least 8 characters" />}</FormField>
    <Checkbox label="Remember this device" name="remember" />
    <div><Button type="submit">Validate sign-in</Button></div>
    {message && <Alert variant="success" role="status">{message}</Alert>}
  </form>
}

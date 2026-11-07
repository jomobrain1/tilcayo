import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Alert, Button, FormField, Input, Textarea } from '@tilcayo/ui'

export default function ContactFormExample() {
  const [message, setMessage] = useState('')
  return <form className="tl-stack" onSubmit={event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setMessage(`Message preview ready for ${String(data.get('name'))}. Nothing was sent.`)
  }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
      <FormField label="Your name">{props => <Input {...props} name="name" required minLength={2} autoComplete="name" placeholder="Alex Morgan" />}</FormField>
      <FormField label="Your email">{props => <Input {...props} name="email" type="email" required autoComplete="email" placeholder="alex@example.com" />}</FormField>
    </div>
    <FormField label="Message">{props => <Textarea {...props} name="message" required minLength={10} rows={3} placeholder="How can we help?" />}</FormField>
    <div><Button type="submit">Preview message</Button></div>
    {message && <Alert variant="success" role="status">{message}</Alert>}
  </form>
}

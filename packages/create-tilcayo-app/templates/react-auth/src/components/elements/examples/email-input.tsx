import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { FormField, Input } from '@tilcayo/ui'

export default function EmailInputExample() {
  const [error, setError] = useState('')
  return <FormField label="Email address" hint="We will use this to contact you." error={error}>{props => <Input {...props} type="email" autoComplete="email" placeholder="alex@example.com" onBlur={event => setError(event.target.validity.typeMismatch ? 'Enter a valid email address.' : '')} onChange={() => setError('')} />}</FormField>
}

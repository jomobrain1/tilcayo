import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { FormField, Input } from '@tilcayo/ui'

export default function TextInputExample() {
  const [name, setName] = useState('')
  return <FormField label="Display name" hint={`${name.length}/40 characters`}>{props => <Input {...props} value={name} maxLength={40} onChange={event => setName(event.target.value)} placeholder="Alex Morgan" autoComplete="name" />}</FormField>
}

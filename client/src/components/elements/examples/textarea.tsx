import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { FormField, Textarea } from '@tilcayo/ui'

export default function TextareaExample() {
  const [description, setDescription] = useState('')
  return <FormField label="Description" hint={`${description.length}/240 characters`}>{props => <Textarea {...props} rows={3} maxLength={240} value={description} onChange={event => setDescription(event.target.value)} placeholder="Tell us about your project..." />}</FormField>
}

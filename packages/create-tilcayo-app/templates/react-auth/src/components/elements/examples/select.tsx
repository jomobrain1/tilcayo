import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { FormField, Select } from '@tilcayo/ui'

export default function SelectExample() {
  const [category, setCategory] = useState('personal')
  return <FormField label="Workspace" hint={`Selected: ${category}`}>{props => <Select {...props} value={category} onChange={event => setCategory(event.target.value)}><option value="personal">Personal</option><option value="team">Team</option><option value="organization">Organization</option></Select>}</FormField>
}

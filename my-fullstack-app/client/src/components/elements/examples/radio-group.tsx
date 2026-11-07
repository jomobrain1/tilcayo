import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { RadioGroup } from '@tilcayo/ui'

export default function RadioGroupExample() {
  const [billing, setBilling] = useState('monthly')
  return <div className="tl-stack"><RadioGroup label="Billing frequency" value={billing} onChange={setBilling} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} /><p role="status" className="tl-help-text">Selected: {billing}</p></div>
}

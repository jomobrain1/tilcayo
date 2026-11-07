import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { FormField, Input } from '@tilcayo/ui'

export default function SearchInputExample() {
  const [query, setQuery] = useState('')
  const matches = ['Design system', 'Marketing site', 'Mobile app'].filter(item => item.toLowerCase().includes(query.toLowerCase()))
  return <div className="tl-stack"><FormField label="Search projects">{props => <Input {...props} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try design..." />}</FormField><p className="tl-help-text" role="status">{matches.length ? matches.join(', ') : 'No matching projects.'}</p></div>
}

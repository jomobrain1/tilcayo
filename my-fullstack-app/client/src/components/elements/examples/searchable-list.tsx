import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { EmptyState, FormField, Input } from '@tilcayo/ui'

const projects = ['Design system', 'Marketing site', 'Mobile app', 'Documentation']

export default function SearchableListExample() {
  const [search, setSearch] = useState('')
  const filtered = projects.filter(name => name.toLowerCase().includes(search.toLowerCase()))
  return <div className="tl-stack"><FormField label="Find a project">{props => <Input {...props} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search projects..." />}</FormField><p className="tl-help-text" role="status">{filtered.length} matching projects</p>{filtered.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{filtered.map(name => <li key={name}>{name}</li>)}</ul> : <EmptyState title="No matches" description="Try another project name." />}</div>
}

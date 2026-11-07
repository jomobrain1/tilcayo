import { useState } from 'react'
import { Button, EmptyState, Input } from '@tilcayo/ui'
import { ExampleCard } from './example-card'
import { elementExamples, elementSections } from './catalogue'
import './elements.css'

export default function ElementsLibrary() {
  const [category, setCategory] = useState('all'), [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const matching = elementExamples.filter(example => (category === 'all' || example.section === category) && `${example.title} ${example.description} ${elementSections.find(section => section.id === example.section)?.title}`.toLowerCase().includes(term))
  return <div className="elements-library">
    <header className="elements-heading"><div><h1>Elements</h1><p>Explore working components. Copy the code and make them yours.</p></div><span className="elements-count" role="status">{matching.length} {matching.length === 1 ? 'example' : 'examples'}</span></header>
    <div className="elements-toolbar"><div className="elements-categories" role="group" aria-label="Component categories"><button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All</button>{elementSections.map(section => <button key={section.id} type="button" aria-pressed={category === section.id} onClick={() => setCategory(section.id)}>{section.label}</button>)}</div><Input className="elements-search" type="search" aria-label="Search components" placeholder="Search components..." value={search} maxLength={80} onChange={event => setSearch(event.target.value)} /></div>
    {elementSections.map(section => {
      const examples = matching.filter(example => example.section === section.id)
      if (!examples.length) return null
      return <section key={section.id} className="element-section" aria-labelledby={'section-' + section.id}><header className="element-section-heading"><h2 id={'section-' + section.id}>{section.title}</h2><span>{examples.length} {examples.length === 1 ? 'example' : 'examples'}</span></header><div className="elements-grid">{examples.map(example => <ExampleCard key={example.id} example={example} />)}</div></section>
    })}
    {!matching.length && <EmptyState title="No components found" description="Try another search or choose a different section." action={<Button variant="outline" onClick={() => { setCategory('all'); setSearch('') }}>Clear filters</Button>} />}
    <p className="elements-footnote">Every example includes its imports, state, and handlers. Form demos run locally and do not change your account or send requests.</p>
  </div>
}

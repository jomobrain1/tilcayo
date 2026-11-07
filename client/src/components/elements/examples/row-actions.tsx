import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Button, ConfirmDialog, Input, Table } from '@tilcayo/ui'

export default function RowActionsExample() {
  const [rows, setRows] = useState([{ id: 1, name: 'Design system' }, { id: 2, name: 'Marketing site' }])
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [removing, setRemoving] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  return <div className="tl-stack"><Table><caption>Editable projects</caption><thead><tr><th scope="col">Project</th><th scope="col">Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>
    <td>{editing === row.id ? <Input aria-label="Edit project name" value={draft} maxLength={80} onChange={event => setDraft(event.target.value)} /> : row.name}</td>
    <td><div className="tl-flex tl-flex-wrap tl-gap-2">{editing === row.id ? <><Button variant="outline" disabled={!draft.trim()} onClick={() => { setRows(rows.map(item => item.id === row.id ? { ...item, name: draft.trim() } : item)); setEditing(null); setMessage('Project renamed.') }}>Save</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></> : <><Button variant="outline" aria-label={`Edit ${row.name}`} onClick={() => { setDraft(row.name); setEditing(row.id) }}>Edit</Button><Button variant="ghost" aria-label={`Delete ${row.name}`} onClick={() => setRemoving(row.id)}>Delete</Button></>}</div></td>
  </tr>)}{!rows.length && <tr><td colSpan={2}>No projects remain.</td></tr>}</tbody></Table><p role="status" className="tl-help-text">{message || 'Edit or remove a local example row.'}</p><ConfirmDialog open={removing !== null} title="Delete row?" message="Remove this project from the local example?" confirmText="Delete row" destructive onClose={() => setRemoving(null)} onConfirm={() => { setRows(rows.filter(row => row.id !== removing)); setMessage('Project removed.') }} /></div>
}

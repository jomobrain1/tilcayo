import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Button, FormField, Input, Modal } from '@tilcayo/ui'

export default function ModalExample() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  return <div className="tl-stack"><div><Button onClick={() => setOpen(true)}>Open project dialog</Button></div><p role="status" className="tl-help-text">{message || 'Create a project in a focused dialog.'}</p>
    <Modal open={open} title="New project" onClose={() => setOpen(false)}><form className="tl-stack" onSubmit={event => {
      event.preventDefault()
      setMessage(`Created ${String(new FormData(event.currentTarget).get('name'))} locally.`)
      setOpen(false)
    }}><FormField label="Project name">{props => <Input {...props} name="name" required minLength={2} placeholder="My next project" />}</FormField><div className="tl-flex tl-gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Create project</Button></div></form></Modal>
  </div>
}

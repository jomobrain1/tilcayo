import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Alert, Button, ConfirmDialog } from '@tilcayo/ui'

export default function ConfirmationExample() {
  const [open, setOpen] = useState(false)
  const [deleted, setDeleted] = useState(false)
  return <div className="tl-stack">{deleted ? <><Alert variant="success" role="status">The example project was removed.</Alert><div><Button variant="outline" onClick={() => setDeleted(false)}>Restore example</Button></div></> : <div><Button variant="outline" onClick={() => setOpen(true)}>Delete example project</Button></div>}
    <ConfirmDialog open={open} title="Delete project?" message="This removes the local example project." confirmText="Delete project" destructive onClose={() => setOpen(false)} onConfirm={() => setDeleted(true)} />
  </div>
}

import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Alert, Button, EmptyState } from '@tilcayo/ui'

export default function EmptyStateExample() {
  const [created, setCreated] = useState(false)
  return created ? <div className="tl-stack"><Alert variant="success" role="status">Your first project is ready.</Alert><div><Button variant="outline" onClick={() => setCreated(false)}>Reset example</Button></div></div> : <EmptyState title="No projects yet" description="Create a project to give your next idea a home." action={<Button onClick={() => setCreated(true)}>Create project</Button>} />
}

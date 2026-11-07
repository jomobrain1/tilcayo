import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Button, StatCard } from '@tilcayo/ui'

export default function StatisticsCardExample() {
  const [projects, setProjects] = useState(12)
  return <div className="tl-stack"><StatCard label="Active projects" value={projects} note="Example workspace data" /><div><Button variant="outline" onClick={() => setProjects(projects + 1)}>Add a project</Button></div></div>
}

import '@tilcayo/styles/index.css'
import { Badge, Table } from '@tilcayo/ui'

const projects = [{ name: 'Design system', status: 'Active' }, { name: 'Marketing site', status: 'Draft' }, { name: 'Customer portal', status: 'Pending' }] as const

export default function StatusTableExample() {
  return <Table><caption>Project status</caption><thead><tr><th scope="col">Project</th><th scope="col">Status</th></tr></thead><tbody>{projects.map(project => <tr key={project.name}><td>{project.name}</td><td><Badge variant={project.status === 'Active' ? 'success' : project.status === 'Pending' ? 'warning' : 'neutral'}>{project.status}</Badge></td></tr>)}</tbody></Table>
}

import '@tilcayo/styles/index.css'
import { Table } from '@tilcayo/ui'

export default function BasicTableExample() {
  return <Table><caption>Example projects</caption><thead><tr><th scope="col">Project</th><th scope="col">Owner</th><th scope="col">Updated</th></tr></thead><tbody><tr><td>Design system</td><td>Alex Morgan</td><td>Today</td></tr><tr><td>Marketing site</td><td>Sam Lee</td><td>Yesterday</td></tr><tr><td>Customer portal</td><td>Taylor Kim</td><td>Monday</td></tr></tbody></Table>
}

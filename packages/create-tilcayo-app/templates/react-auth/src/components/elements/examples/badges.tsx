import '@tilcayo/styles/index.css'
import { Badge } from '@tilcayo/ui'

export default function BadgesExample() {
  return <div className="tl-flex tl-flex-wrap tl-gap-2"><Badge>Draft</Badge><Badge variant="success">Active</Badge><Badge variant="warning">Pending</Badge><Badge variant="danger">Failed</Badge><Badge variant="primary">New</Badge></div>
}

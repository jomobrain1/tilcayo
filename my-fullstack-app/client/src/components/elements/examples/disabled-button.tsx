import '@tilcayo/styles/index.css'
import { Button } from '@tilcayo/ui'

export default function DisabledButtonExample() {
  return <div className="tl-stack"><div className="tl-flex tl-flex-wrap tl-gap-2"><Button disabled>Publish</Button><Button variant="outline" disabled>Export</Button></div><p className="tl-help-text">Disabled actions cannot be clicked or focused.</p></div>
}

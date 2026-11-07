import '@tilcayo/styles/index.css'
import { Alert } from '@tilcayo/ui'

export default function AlertsExample() {
  return <div className="tl-stack">
    <Alert variant="info" role="status">Your export is ready to download.</Alert>
    <Alert variant="success" role="status">Changes saved successfully.</Alert>
    <Alert variant="warning">Some required details are missing.</Alert>
    <Alert variant="danger">Unable to save. Please try again.</Alert>
  </div>
}

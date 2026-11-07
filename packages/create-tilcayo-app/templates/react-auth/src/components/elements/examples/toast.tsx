import '@tilcayo/styles/index.css'
import { Button, ToastProvider, useToast } from '@tilcayo/ui'

function ToastActions() {
  const notify = useToast()
  return <div className="tl-flex tl-flex-wrap tl-gap-2"><Button onClick={() => notify({ message: 'Project saved successfully.', variant: 'success' })}>Show success toast</Button><Button variant="outline" onClick={() => notify({ message: 'Your download is ready.', variant: 'info' })}>Show info toast</Button></div>
}
export default function ToastExample() {
  return <ToastProvider duration={4000}><ToastActions /></ToastProvider>
}

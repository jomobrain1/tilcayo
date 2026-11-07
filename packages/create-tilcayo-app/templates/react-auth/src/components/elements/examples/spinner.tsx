import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Alert, Button, Spinner } from '@tilcayo/ui'

export default function SpinnerExample() {
  const [loading, setLoading] = useState(true)
  return <div className="tl-stack">{loading ? <Spinner label="Loading projects..." /> : <Alert variant="success" role="status">Projects are ready.</Alert>}<div><Button variant="outline" onClick={() => setLoading(!loading)}>{loading ? 'Finish loading' : 'Restart loading'}</Button></div></div>
}

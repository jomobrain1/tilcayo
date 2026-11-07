import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Button, Card } from '@tilcayo/ui'

export default function BasicCardExample() {
  const [saved, setSaved] = useState(false)
  return <Card className="tl-stack"><h3 style={{ margin: 0 }}>A place for your next idea</h3><p style={{ margin: 0 }}>Group related content and actions inside a simple container.</p><div><Button variant="outline" aria-pressed={saved} onClick={() => setSaved(!saved)}>{saved ? 'Saved to favorites' : 'Save to favorites'}</Button></div></Card>
}

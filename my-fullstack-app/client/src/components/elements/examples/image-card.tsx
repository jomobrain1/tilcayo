import '@tilcayo/styles/index.css'
import { Card } from '@tilcayo/ui'

const landscape = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360"><rect width="800" height="360" fill="#edf0f3"/><circle cx="650" cy="85" r="40" fill="#fff"/><path d="M0 360 210 75 440 360Z" fill="#abb3bc"/><path d="m180 360 280-310 340 310Z" fill="#333b45"/><path d="m385 135 75-85 92 84-65-18-30 25-28-25Z" fill="#eef0f2"/></svg>')

export default function ImageCardExample() {
  return <Card style={{ padding: 0, overflow: 'hidden' }}><img src={landscape} alt="Minimal mountain landscape" width={800} height={360} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} /><div style={{ padding: 20 }}><h3 style={{ margin: '0 0 8px' }}>Room to explore</h3><p style={{ margin: 0 }}>An image, a title, and a little context.</p></div></Card>
}

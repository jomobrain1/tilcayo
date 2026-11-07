import '@tilcayo/styles/index.css'
import { Tabs } from '@tilcayo/ui'

export default function TabsExample() {
  return <Tabs label="Project details" defaultValue="overview" tabs={[
    { id: 'overview', label: 'Overview', content: <p>Your project at a glance.</p> },
    { id: 'activity', label: 'Activity', content: <p>Your project was created today.</p> },
    { id: 'settings', label: 'Settings', content: <p>Manage your project preferences.</p> },
  ]} />
}

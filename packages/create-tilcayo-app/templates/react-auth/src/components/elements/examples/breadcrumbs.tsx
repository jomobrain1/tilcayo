import '@tilcayo/styles/index.css'
import { Breadcrumbs } from '@tilcayo/ui'

export default function BreadcrumbsExample() {
  return <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Components', href: '/elements' }, { label: 'Breadcrumbs' }]} />
}

import { PageSkeleton } from '@tilcayo/ui'
import { lazy, Suspense } from 'react'

const ElementsLibrary = lazy(() => import('../components/elements/elements-library'))

export function ElementsPage() {
  return <Suspense fallback={<PageSkeleton variant="content" label="Loading components" />}><ElementsLibrary /></Suspense>
}

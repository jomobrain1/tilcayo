import type { RouteObject } from 'react-router'
import { AppLayout } from './layouts/app-layout'
import { HomePage } from './pages/home.page'
import { ElementsPage } from './pages/elements.page'
import { AboutPage } from './pages/about.page'
import { NotFoundPage } from './pages/not-found.page'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/elements', element: <ElementsPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

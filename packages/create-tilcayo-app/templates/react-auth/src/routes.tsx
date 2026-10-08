import type { RouteObject } from 'react-router'
import { AppLayout } from './layouts/app-layout'
import { HomePage } from './pages/home.page'
import { ElementsPage } from './pages/elements.page'
import { AboutPage } from './pages/about.page'
import { NotFoundPage } from './pages/not-found.page'
import { GuestOnly, RequireAuth } from './middleware/auth'
import { LoginPage } from './pages/login.page'
import { RegisterPage } from './pages/register.page'
import { DashboardPage } from './pages/dashboard.page'

import { ForgotPasswordPage } from "./pages/forgot-password.page";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/elements', element: <ElementsPage /> },
      { path: '/about', element: <AboutPage /> },
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

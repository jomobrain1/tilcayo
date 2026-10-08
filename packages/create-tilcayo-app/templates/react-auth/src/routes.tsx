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
import { AuthLayout } from './layouts/auth-layout'
import { AdminLayout } from './layouts/admin-layout'
import { ForbiddenPage } from './pages/forbidden.page'

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
        children: [{ element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/register', element: <RegisterPage /> },
        ] }],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/profile', element: <DashboardPage /> },
        ],
      },
      {
        element: <RequireAuth role="admin" />,
        children: [{ path: '/admin', element: <AdminLayout />, children: [
          { index: true, element: <h1>Admin dashboard</h1> },
          { path: 'profile', element: <DashboardPage /> },
        ] }],
      },
      { path: '/forbidden', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

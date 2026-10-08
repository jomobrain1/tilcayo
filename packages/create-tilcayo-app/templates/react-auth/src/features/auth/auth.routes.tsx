import type { RouteObject } from 'react-router'
import { AuthLayout } from '../../layouts/auth-layout'
import { RequireAuth, GuestOnly } from '../../middleware/auth'
import { LoginPage } from '../../pages/login.page'
import { RegisterPage } from '../../pages/register.page'
import { ForgotPasswordPage } from '../../pages/forgot-password.page'
import { DashboardPage } from '../../pages/dashboard.page'
import { ForbiddenPage } from '../../pages/forbidden.page'

export const authRoutes: RouteObject[] = [
  { element: <GuestOnly />, children: [{ element: <AuthLayout />, children: [
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
    { path: '/forgot-password', element: <ForgotPasswordPage /> },
  ] }] },
  { element: <RequireAuth />, children: [
    { path: '/dashboard', element: <DashboardPage /> },
    { path: '/profile', element: <DashboardPage /> },
  ] },
  { path: '/forbidden', element: <ForbiddenPage /> },
]

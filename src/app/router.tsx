import { lazy } from 'react'
import { Navigate, createBrowserRouter } from 'react-router'
import { AppLayout } from './AppLayout'
import { RequireAuth, RedirectIfAuthed } from './RequireAuth'
import { LoginPage } from '@/features/auth/LoginPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const LoansListPage = lazy(() => import('@/features/loans/LoansListPage').then((m) => ({ default: m.LoansListPage })))
const PeopleListPage = lazy(() => import('@/features/people/PeopleListPage').then((m) => ({ default: m.PeopleListPage })))
const PersonDetailPage = lazy(() =>
  import('@/features/people/PersonDetailPage').then((m) => ({ default: m.PersonDetailPage })),
)

export const router = createBrowserRouter([
  {
    element: <RedirectIfAuthed />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  { path: '/redefinir-senha', element: <ResetPasswordPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'emprestimos', element: <LoansListPage /> },
          { path: 'pessoas', element: <PeopleListPage /> },
          { path: 'pessoas/:id', element: <PersonDetailPage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])

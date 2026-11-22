import { lazy } from 'react'
import { Navigate, createBrowserRouter, useParams } from 'react-router'
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
const StoragePage = lazy(() => import('@/features/storage/StoragePage').then((m) => ({ default: m.StoragePage })))

function LegacyPersonRedirect() {
  const { id } = useParams()
  return <Navigate to={`/clientes/${id}`} replace />
}

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
          { path: 'clientes', element: <PeopleListPage /> },
          { path: 'clientes/:id', element: <PersonDetailPage /> },
          { path: 'armazenamento', element: <StoragePage /> },
          // Links antigos (/pessoas) continuam funcionando.
          { path: 'pessoas', element: <Navigate to="/clientes" replace /> },
          { path: 'pessoas/:id', element: <LegacyPersonRedirect /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])

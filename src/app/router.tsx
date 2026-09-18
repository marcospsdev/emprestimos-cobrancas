import { lazy } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppLayout } from './AppLayout'
import { RequireAuth, RedirectIfAuthed } from './RequireAuth'
import { LoginPage } from '@/features/auth/LoginPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const PeopleListPage = lazy(() => import('@/features/people/PeopleListPage').then((m) => ({ default: m.PeopleListPage })))
const PersonDetailPage = lazy(() =>
  import('@/features/people/PersonDetailPage').then((m) => ({ default: m.PersonDetailPage })),
)
const LoansListPage = lazy(() => import('@/features/loans/LoansListPage').then((m) => ({ default: m.LoansListPage })))
const LoanDetailPage = lazy(() => import('@/features/loans/LoanDetailPage').then((m) => ({ default: m.LoanDetailPage })))
const InstallmentsPage = lazy(() =>
  import('@/features/installments/InstallmentsPage').then((m) => ({ default: m.InstallmentsPage })),
)
const DelinquencyPage = lazy(() =>
  import('@/features/delinquency/DelinquencyPage').then((m) => ({ default: m.DelinquencyPage })),
)
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

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
          { path: 'pessoas', element: <PeopleListPage /> },
          { path: 'pessoas/:id', element: <PersonDetailPage /> },
          { path: 'emprestimos', element: <LoansListPage /> },
          { path: 'emprestimos/:id', element: <LoanDetailPage /> },
          { path: 'parcelas', element: <InstallmentsPage /> },
          { path: 'inadimplencia', element: <DelinquencyPage /> },
          { path: 'relatorios', element: <ReportsPage /> },
          { path: 'configuracoes', element: <SettingsPage /> },
        ],
      },
    ],
  },
])

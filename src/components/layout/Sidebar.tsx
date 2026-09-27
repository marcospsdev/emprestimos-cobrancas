import { NavLink } from 'react-router'
import { Icon } from '@iconify/react'
import { BrandMark } from '@/components/shared/BrandMark'
import { DeveloperCredit } from '@/components/shared/DeveloperCredit'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useLoanForm } from '@/features/loans/loanFormContext'
import { NAV_ITEMS } from '@/constants/nav'
import { cn } from '@/lib/cn'
import { UserMenu } from './UserMenu'
import { useNavTarget } from './useNavTarget'

/** Menu lateral — só no desktop (lg+). No celular a navegação é a BottomNav. */
export function Sidebar() {
  const { user } = useAuth()
  const { openNewLoan } = useLoanForm()
  const target = useNavTarget()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <BrandMark size="sm" />
      </div>

      <div className="px-3 pt-4">
        <Button className="w-full" onClick={() => openNewLoan()}>
          <Icon icon="tabler:plus" className="size-4.5" />
          Novo empréstimo
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={target(item)}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-500/12 text-brand-300'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                  )
                }
              >
                <Icon icon={item.icon} className="size-4.5 shrink-0" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <UserMenu
          side="top"
          trigger={
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-400">
                <Icon icon="tabler:user" className="size-4.5" />
              </div>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{user?.email}</p>
              <Icon icon="tabler:selector" className="size-4 shrink-0 text-text-muted" />
            </button>
          }
        />
        <DeveloperCredit className="mt-2 px-3 text-center" />
      </div>
    </aside>
  )
}

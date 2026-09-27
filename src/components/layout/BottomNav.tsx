import { NavLink } from 'react-router'
import { Icon } from '@iconify/react'
import { NAV_ITEMS } from '@/constants/nav'
import { cn } from '@/lib/cn'
import { useLoanForm } from '@/features/loans/loanFormContext'
import { useNavTarget } from './useNavTarget'

/**
 * Navegação principal no celular: fica no alcance do polegar, com o botão
 * "+" (novo empréstimo) no centro — a ação mais usada do app.
 */
export function BottomNav() {
  const { openNewLoan } = useLoanForm()
  const target = useNavTarget()
  const [dashboard, loans, people] = NAV_ITEMS

  const item = (nav: (typeof NAV_ITEMS)[number]) => (
    <NavLink
      key={nav.to}
      to={target(nav)}
      end={nav.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
          isActive ? 'text-brand-400' : 'text-text-muted active:text-text-secondary',
        )
      }
    >
      <Icon icon={nav.icon} className="size-6" />
      {nav.label}
    </NavLink>
  )

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-md items-center">
        {item(dashboard)}
        {item(loans)}
        {/* Botão central com texto: só o "+" não é óbvio para quem não é da área. */}
        <button
          type="button"
          onClick={() => openNewLoan()}
          aria-label="Novo empréstimo"
          className="group flex h-16 flex-1 cursor-pointer flex-col items-center justify-end gap-1 pb-2"
        >
          <span className="-mt-6 flex size-14 items-center justify-center rounded-full bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-brand-glow ring-4 ring-background group-active:scale-95">
            <Icon icon="tabler:plus" className="size-7" />
          </span>
          <span className="text-xs font-semibold text-brand-400">Novo</span>
        </button>
        {item(people)}
      </div>
    </nav>
  )
}

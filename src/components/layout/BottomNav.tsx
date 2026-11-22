import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { Icon } from '@iconify/react'
import { NAV_ITEMS } from '@/constants/nav'
import { cn } from '@/lib/cn'
import { useLoanForm } from '@/features/loans/loanFormContext'
import { AccountSheet } from '@/features/auth/AccountSheet'
import { useNavTarget } from './useNavTarget'
import { usePushState } from '@/lib/push'

/**
 * Navegação principal no celular, no alcance do polegar. Simétrica:
 * Resumo · Empréstimos · [+ Novo] · Clientes · Conta.
 * O item ativo ganha uma "pílula" verde atrás do ícone (não só a cor do texto).
 */
export function BottomNav() {
  const { openNewLoan } = useLoanForm()
  const target = useNavTarget()
  const [accountOpen, setAccountOpen] = useState(false)
  // Bolinha amarela em "Conta" quando os avisos não estão funcionando neste aparelho.
  const pushState = usePushState()
  const pushAttention = pushState === 'off' || pushState === 'denied' || pushState === 'ios-install' || pushState === 'unsupported'
  const [dashboard, loans, people] = NAV_ITEMS

  const item = (nav: (typeof NAV_ITEMS)[number]) => (
    <NavLink key={nav.to} to={target(nav)} end={nav.to === '/'} className="flex h-16 min-w-0 flex-1">
      {({ isActive }) => (
        <NavSlot icon={nav.icon} label={nav.label} active={isActive} />
      )}
    </NavLink>
  )

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Navegação principal"
      >
        <div className="mx-auto flex max-w-lg items-stretch px-1">
          {item(dashboard)}
          {item(loans)}
          {/* Botão central com texto: só o "+" não é óbvio para quem não é da área. */}
          <button
            type="button"
            onClick={() => openNewLoan()}
            aria-label="Novo empréstimo"
            className="group flex h-16 min-w-0 flex-1 cursor-pointer flex-col items-center justify-end gap-1 pb-2"
          >
            <span className="-mt-6 flex size-14 items-center justify-center rounded-full bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-brand-glow ring-4 ring-background group-active:scale-95">
              <Icon icon="tabler:plus" className="size-7" />
            </span>
            <span className="text-xs font-semibold text-brand-400">Novo</span>
          </button>
          {item(people)}
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            aria-haspopup="dialog"
            className="flex h-16 min-w-0 flex-1 cursor-pointer"
          >
            <NavSlot icon="tabler:user-circle" label="Conta" active={accountOpen} attention={pushAttention} />
          </button>
        </div>
      </nav>
      <AccountSheet open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  )
}

function NavSlot({ icon, label, active, attention }: { icon: string; label: ReactNode; active: boolean; attention?: boolean }) {
  return (
    <span
      className={cn(
        'flex w-full flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
        active ? 'text-brand-400' : 'text-text-secondary active:text-text-primary',
      )}
    >
      <span
        className={cn(
          'relative flex h-8 w-14 items-center justify-center rounded-full transition-colors',
          active && 'bg-brand-500/15',
        )}
      >
        <Icon icon={icon} className="size-6" />
        {attention && (
          <span className="absolute top-0.5 right-3.5 size-2.5 rounded-full bg-warning ring-2 ring-surface" aria-label="Avisos desligados" />
        )}
      </span>
      <span className={cn('max-w-full truncate tracking-tight', active && 'font-semibold')}>{label}</span>
    </span>
  )
}

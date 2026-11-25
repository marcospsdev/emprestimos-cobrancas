import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/Badge'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate, todayISO } from '@/lib/format'
import type { Expense } from '@/types/database'
import { PaidCheck } from '@/features/loans/PaidCheck'
import {
  STATUS_BADGE_VARIANT,
  STATUS_BG_CLASS,
  STATUS_ICON,
  STATUS_ORDER,
  STATUS_ROW_CLASS,
  STATUS_TEXT_CLASS,
} from '@/features/loans/status'
import { useUpdateExpense } from './api/useExpenses'
import { getCategory } from './categories'
import { EXPENSE_STATUS_LABEL, getExpenseStatus, type ExpenseStatus } from './status'

interface ExpenseListProps {
  expenses: Expense[]
  loading?: boolean
  onOpen: (expense: Expense) => void
  empty?: ReactNode
}

/**
 * Lista de despesas: check de pago à esquerda, categoria + descrição no meio,
 * valor e status à direita. Tocar na linha abre a edição (excluir fica lá dentro).
 */
export function ExpenseList({ expenses, loading, onOpen, empty }: ExpenseListProps) {
  const updateExpense = useUpdateExpense()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const today = todayISO()

  const togglePaid = async (expense: Expense) => {
    if (expense.paid_at) {
      const ok = await confirm({
        title: 'Desmarcar pagamento',
        description: `"${expense.description}" voltará a aparecer como a pagar.`,
        confirmLabel: 'Desmarcar',
      })
      if (!ok) return
    }
    try {
      await updateExpense.mutateAsync({ id: expense.id, payload: { paid_at: expense.paid_at ? null : today } })
      showToast(expense.paid_at ? `${expense.description} voltou para a pagar.` : `${expense.description} marcada como paga.`, expense.paid_at ? 'info' : 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar.', 'error')
    }
  }

  const legend = <ExpenseStatusLegend className="px-1" />

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {legend}
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {legend}
        {empty}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {legend}
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {expenses.map((expense) => {
          const status = getExpenseStatus(expense, today)
          const paid = status === 'pago'
          const cat = getCategory(expense.category)
          return (
            <li key={expense.id} className={cn('relative', STATUS_ROW_CLASS[status])}>
              <span className={cn('absolute inset-y-0 left-0 w-1.5', STATUS_BG_CLASS[status])} aria-hidden />
              <div
                role="button"
                tabIndex={0}
                aria-label={`Abrir ${expense.description}`}
                onClick={() => onOpen(expense)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpen(expense)
                }}
                className="flex cursor-pointer items-center gap-1 py-3 pr-3 pl-2.5 transition-colors hover:bg-surface-hover/60 active:bg-surface-hover sm:gap-2"
              >
                <PaidCheck paid={paid} overdue={status === 'atrasado'} onToggle={() => togglePaid(expense)} disabled={updateExpense.isPending} />
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-text-secondary" aria-hidden>
                  <Icon icon={cat.icon} className="size-5" />
                </div>
                <div className="min-w-0 flex-1 pl-1">
                  <p className={cn('truncate text-base font-medium sm:text-sm', paid ? 'text-text-secondary' : 'text-text-primary')}>
                    {expense.description}
                  </p>
                  <p className="truncate text-sm text-text-muted sm:text-xs">
                    {cat.label}
                    {expense.fixed_expense_id && (
                      <span className="inline-flex items-center gap-0.5">
                        {' · '}
                        <Icon icon="tabler:repeat" className="size-3.5" aria-hidden /> todo mês
                      </span>
                    )}
                  </p>
                  <p className={cn('truncate text-sm sm:text-xs', status === 'atrasado' ? 'font-medium text-danger' : dueSoon(expense, status, today) ? 'font-medium text-warning' : 'text-text-secondary sm:text-text-muted')}>
                    {dateLine(expense, status, today)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5 self-stretch justify-center">
                  <p className={cn('text-base font-semibold whitespace-nowrap', paid ? 'text-text-secondary' : 'text-text-primary')}>
                    {formatCurrency(expense.amount)}
                  </p>
                  <Badge variant={STATUS_BADGE_VARIANT[status]} className="gap-1 px-2 py-1 text-xs">
                    <Icon icon={STATUS_ICON[status]} className="size-3.5 shrink-0" aria-hidden />
                    {EXPENSE_STATUS_LABEL[status]}
                  </Badge>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ExpenseStatusLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary sm:text-xs', className)} aria-label="Legenda de status">
      {STATUS_ORDER.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span className={cn('h-3.5 w-1.5 rounded-full', STATUS_BG_CLASS[status])} aria-hidden />
          <Icon icon={STATUS_ICON[status]} className={cn('size-4 sm:size-3.5', STATUS_TEXT_CLASS[status])} aria-hidden />
          {EXPENSE_STATUS_LABEL[status]}
        </li>
      ))}
    </ul>
  )
}

function dueSoon(expense: Expense, status: ExpenseStatus, today: string): boolean {
  if (status !== 'pendente') return false
  return differenceInCalendarDays(parseISO(expense.due_date), parseISO(today)) <= 1
}

function dateLine(expense: Expense, status: ExpenseStatus, today: string): string {
  if (status === 'pago') return `Pago em ${formatDate(expense.paid_at)}`
  const days = differenceInCalendarDays(parseISO(expense.due_date), parseISO(today))
  if (status === 'atrasado') return `Venceu em ${formatDate(expense.due_date)} · há ${-days} ${-days === 1 ? 'dia' : 'dias'}`
  if (days === 0) return 'Vence hoje'
  if (days === 1) return 'Vence amanhã'
  return `Vence em ${formatDate(expense.due_date)}`
}

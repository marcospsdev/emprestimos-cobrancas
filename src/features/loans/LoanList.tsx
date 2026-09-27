import { useState } from 'react'
import type { ReactNode } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { Skeleton } from '@/components/ui/Skeleton'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { RowAction } from '@/components/shared/RowAction'
import { WhatsAppButton } from '@/components/shared/WhatsAppButton'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate, todayISO } from '@/lib/format'
import { buildChargeMessage } from '@/lib/whatsapp'
import type { Loan, LoanStatus } from '@/types/database'
import { useDeleteLoan, useUpdateLoan } from './api/useLoans'
import { useLoanForm } from './loanFormContext'
import { LoanStatusBadge, LoanStatusLegend } from './LoanStatusBadge'
import { MarkPaidDialog } from './MarkPaidDialog'
import { PaidCheck } from './PaidCheck'
import { STATUS_BG_CLASS, getLoanStatus } from './status'

interface LoanListProps {
  loans: Loan[] | undefined
  loading?: boolean
  /** Na tela da pessoa o nome dela já está no topo. */
  showPerson?: boolean
  /** Legenda de cores acima da lista (desligue quando a lista tem um status só). */
  showLegend?: boolean
  empty?: ReactNode
}

/**
 * Lista de empréstimos usada em todo o app. Cada linha: check de pago à
 * esquerda, dados no meio, valor à direita e, embaixo, status + ações
 * (cobrar no WhatsApp, editar, excluir). Tocar na linha também abre a edição.
 */
export function LoanList({ loans, loading, showPerson = true, showLegend = true, empty }: LoanListProps) {
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null)
  const { openEditLoan } = useLoanForm()
  const updateLoan = useUpdateLoan()
  const deleteLoan = useDeleteLoan()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const today = todayISO()

  const unmarkPaid = async (loan: Loan) => {
    const ok = await confirm({
      title: 'Desmarcar pagamento',
      description: `"${loan.title}" voltará a aparecer como não pago.`,
      confirmLabel: 'Desmarcar',
    })
    if (!ok) return
    try {
      await updateLoan.mutateAsync({
        id: loan.id,
        payload: { paid_at: null, payment_method: null },
      })
      showToast('Pagamento desmarcado.', 'info')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao desmarcar.', 'error')
    }
  }

  const remove = async (loan: Loan) => {
    const ok = await confirm({
      title: 'Excluir empréstimo',
      description: `Excluir "${loan.title}"${loan.person ? ` de ${loan.person.name}` : ''}? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteLoan.mutateAsync(loan.id)
      showToast('Empréstimo excluído.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao excluir empréstimo.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  if (!loans || loans.length === 0) return <>{empty}</>

  return (
    <div className="flex flex-col gap-2">
      {showLegend && <LoanStatusLegend className="px-1" />}
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {loans.map((loan) => {
          const status = getLoanStatus(loan, today)
          const paid = status === 'pago'
          return (
            <li key={loan.id} className="relative">
              {/* Barra lateral na cor do status */}
              <span className={cn('absolute inset-y-0 left-0 w-1.5', STATUS_BG_CLASS[status])} aria-hidden />
              <div
                role="button"
                tabIndex={0}
                onClick={() => openEditLoan(loan)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') openEditLoan(loan)
                }}
                className="flex cursor-pointer items-center gap-1 py-3 pr-3 pl-2.5 transition-colors hover:bg-surface-hover/60 active:bg-surface-hover sm:gap-2"
              >
                <PaidCheck
                  paid={paid}
                  overdue={status === 'atrasado'}
                  onToggle={() => (paid ? unmarkPaid(loan) : setPayingLoan(loan))}
                />

                {/* Esquerda: informações do empréstimo */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-base font-medium sm:text-sm',
                      paid ? 'text-text-secondary' : 'text-text-primary',
                    )}
                  >
                    {loan.title}
                  </p>
                  {showPerson && <p className="truncate text-sm text-text-secondary">{loan.person?.name ?? '—'}</p>}
                  <p
                    className={cn(
                      'mt-0.5 text-lg font-semibold sm:text-base',
                      paid ? 'text-text-secondary' : 'text-text-primary',
                    )}
                  >
                    {formatCurrency(loan.amount_to_receive)}
                  </p>
                  <p className={cn('truncate text-xs', status === 'atrasado' ? 'text-danger' : 'text-text-muted')}>
                    {dateLine(loan, status, today)}
                  </p>
                  {loan.description && (
                    // Até 2 linhas; o texto completo aparece ao tocar (abre a edição).
                    <p
                      className="mt-1.5 line-clamp-2 border-l-2 border-border-strong pl-2 text-sm break-words whitespace-pre-line text-text-secondary"
                      title={loan.description}
                    >
                      {loan.description}
                    </p>
                  )}
                </div>

                {/* Direita: status + ações */}
                <div className="flex shrink-0 flex-col items-end justify-between gap-3 self-stretch">
                  <LoanStatusBadge status={status} />
                  <div className="-mr-1 flex items-center gap-1.5">
                    {!paid && loan.person?.phone && (
                      <WhatsAppButton
                        phone={loan.person.phone}
                        message={buildChargeMessage({
                          personName: loan.person.name,
                          title: loan.title,
                          amount: loan.amount_to_receive,
                          dueDate: loan.due_date,
                          overdue: status === 'atrasado',
                        })}
                      />
                    )}
                    <RowAction icon="tabler:pencil" label="Editar empréstimo" onClick={() => openEditLoan(loan)} />
                    <RowAction
                      icon="tabler:trash"
                      label="Excluir empréstimo"
                      tone="danger"
                      onClick={() => remove(loan)}
                    />
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <MarkPaidDialog loan={payingLoan} onOpenChange={(open) => !open && setPayingLoan(null)} />
    </div>
  )
}

function dateLine(loan: Loan, status: LoanStatus, today: string): string {
  if (status === 'pago') {
    return ['Pago em ' + formatDate(loan.paid_at), loan.payment_method].filter(Boolean).join(' · ')
  }
  const days = differenceInCalendarDays(parseISO(loan.due_date), parseISO(today))
  if (status === 'atrasado') {
    return `Venceu em ${formatDate(loan.due_date)} · há ${-days} ${-days === 1 ? 'dia' : 'dias'}`
  }
  if (days === 0) return 'Vence hoje'
  if (days === 1) return 'Vence amanhã'
  return `Vence em ${formatDate(loan.due_date)}`
}

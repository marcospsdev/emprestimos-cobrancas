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
import type { Loan, LoanPayment, LoanStatus } from '@/types/database'
import { useDeleteLoan, useUpdateLoan } from './api/useLoans'
import { useLoanForm } from './loanFormContext'
import { LoanStatusBadge, LoanStatusLegend } from './LoanStatusBadge'
import { MarkPaidDialog } from './MarkPaidDialog'
import { InterestPaymentRow } from './InterestPaymentRow'
import { PaidCheck } from './PaidCheck'
import { STATUS_BG_CLASS, STATUS_ROW_CLASS, formatInterestRate, getLoanStatus, interestAmount, loanLabel } from './status'

interface LoanListProps {
  loans: Loan[] | undefined
  loading?: boolean
  /** Na tela da pessoa o nome dela já está no topo. */
  showPerson?: boolean
  /** Legenda de cores acima da lista (desligue quando a lista tem um status só). */
  showLegend?: boolean
  empty?: ReactNode
  /** Pagamentos só de juros a mostrar junto (como linhas pagas, no fim). */
  payments?: LoanPayment[]
}

/**
 * Lista de empréstimos usada em todo o app. Cada linha: check de pago à
 * esquerda, dados no meio, valor à direita e, embaixo, status + ações
 * (cobrar no WhatsApp, editar, excluir). Tocar na linha também abre a edição.
 */
export function LoanList({ loans, loading, showPerson = true, showLegend = true, empty, payments = [] }: LoanListProps) {
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
      description: `${loanLabel(loan)} voltará a aparecer como não pago.`,
      confirmLabel: 'Desmarcar',
    })
    if (!ok) return
    try {
      await updateLoan.mutateAsync({
        id: loan.id,
        payload: { paid_at: null, payment_method: null },
      })
      showToast(`${loanLabel(loan)} voltou para não pago.`, 'info')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao desmarcar.', 'error')
    }
  }

  const remove = async (loan: Loan) => {
    const ok = await confirm({
      title: 'Excluir empréstimo',
      description: `Excluir o empréstimo de ${formatCurrency(loan.amount_to_receive)}${loan.person ? ` de ${loan.person.name}` : ''}? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteLoan.mutateAsync(loan.id)
      showToast(`${loanLabel(loan)} excluído.`, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao excluir empréstimo.', 'error')
    }
  }

  // A legenda aparece sempre (carregando, vazia ou com itens), para a tela não "pular".
  const legend = showLegend && <LoanStatusLegend className="px-1" />

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {legend}
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  if ((!loans || loans.length === 0) && payments.length === 0) {
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
        {(loans ?? []).map((loan) => {
          const status = getLoanStatus(loan, today)
          const paid = status === 'pago'
          return (
            <li key={loan.id} className={cn('relative', STATUS_ROW_CLASS[status])}>
              {/* Barra lateral na cor do status */}
              <span className={cn('absolute inset-y-0 left-0 w-1.5', STATUS_BG_CLASS[status])} aria-hidden />
              <div
                role="button"
                tabIndex={0}
                aria-label={`Abrir ${loanLabel(loan)}`}
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
                    {/* Sem título: o principal é o cliente. Na tela do cliente (nome já no topo), a data do empréstimo. */}
                    {showPerson ? (loan.person?.name ?? '—') : `Emprestado em ${formatDate(loan.loan_date)}`}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-lg font-semibold sm:text-base',
                      paid ? 'text-text-secondary' : 'text-text-primary',
                    )}
                  >
                    {formatCurrency(loan.amount_to_receive)}
                    {loan.interest_rate > 0 && (
                      <span className="ml-1.5 text-xs font-medium text-gold-400">+{formatInterestRate(loan.interest_rate)}</span>
                    )}
                  </p>
                  <p
                    className={cn(
                      'truncate text-sm sm:text-xs',
                      status === 'atrasado'
                        ? 'font-medium text-danger'
                        : dueSoon(loan, status, today)
                          ? 'font-medium text-warning'
                          : 'text-text-secondary sm:text-text-muted',
                    )}
                  >
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
                        label="Cobrar"
                        className="h-11 gap-1.5 px-3 text-sm sm:h-9 sm:px-2.5"
                        message={buildChargeMessage({
                          personName: loan.person.name,
                          amount: loan.amount_to_receive,
                          interest: interestAmount(loan),
                          dueDate: loan.due_date,
                          overdue: status === 'atrasado',
                        })}
                      />
                    )}
                    {/* No celular: editar = tocar na linha; excluir fica dentro do formulário
                        (longe do botão de cobrar, para não excluir sem querer). */}
                    <span className="hidden items-center gap-1.5 sm:flex">
                      <RowAction icon="tabler:pencil" label="Editar empréstimo" onClick={() => openEditLoan(loan)} />
                      <RowAction
                        icon="tabler:trash"
                        label="Excluir empréstimo"
                        tone="danger"
                        onClick={() => remove(loan)}
                      />
                    </span>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
        {payments.map((p) => (
          <InterestPaymentRow key={p.id} payment={p} showPerson={showPerson} />
        ))}
      </ul>

      <MarkPaidDialog loan={payingLoan} onOpenChange={(open) => !open && setPayingLoan(null)} />
    </div>
  )
}

/** A receber que vence hoje ou amanhã: merece atenção (sem virar "atrasado"). */
function dueSoon(loan: Loan, status: LoanStatus, today: string): boolean {
  if (status !== 'pendente') return false
  return differenceInCalendarDays(parseISO(loan.due_date), parseISO(today)) <= 1
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

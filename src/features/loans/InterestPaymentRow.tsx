import { Icon } from '@iconify/react'
import { Badge } from '@/components/ui/Badge'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/format'
import type { LoanPayment } from '@/types/database'
import { useUndoInterest } from './api/usePayments'
import { PaidCheck } from './PaidCheck'
import { STATUS_BG_CLASS } from './status'

/**
 * Linha de um pagamento só dos juros (mesma cara de "pago", em verde). Aparece
 * no mês do vencimento que cobriu. Tocar no check desfaz (o vencimento volta).
 */
export function InterestPaymentRow({ payment, showPerson = true }: { payment: LoanPayment; showPerson?: boolean }) {
  const confirm = useConfirm()
  const { showToast } = useToast()
  const undo = useUndoInterest()

  const handleUndo = async () => {
    const ok = await confirm({
      title: 'Desfazer pagamento dos juros?',
      description: `O pagamento de ${formatCurrency(payment.amount)} será apagado e o vencimento volta para ${formatDate(payment.due_date)}.`,
      confirmLabel: 'Desfazer',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await undo.mutateAsync(payment.id)
      showToast('Pagamento dos juros desfeito.', 'info')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao desfazer.', 'error')
    }
  }

  return (
    <li className="relative">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${STATUS_BG_CLASS.pago}`} aria-hidden />
      <div className="flex items-center gap-1 py-3 pr-3 pl-2.5 sm:gap-2">
        <PaidCheck paid onToggle={handleUndo} disabled={undo.isPending} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-text-secondary sm:text-sm">
            {showPerson ? (payment.loan?.person?.name ?? '—') : `Juros de ${formatDate(payment.due_date)}`}
          </p>
          <p className="mt-0.5 text-lg font-semibold text-text-secondary sm:text-base">
            {formatCurrency(payment.amount)}
            <span className="ml-1.5 text-xs font-medium text-gold-400">só juros</span>
          </p>
          <p className="truncate text-sm text-text-secondary sm:text-xs sm:text-text-muted">
            {['Pago em ' + formatDate(payment.paid_at), payment.payment_method].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between gap-3 self-stretch">
          <Badge variant="success" className="gap-1 px-2 py-1 text-xs">
            <Icon icon="tabler:calendar-repeat" className="size-3.5 shrink-0" aria-hidden />
            Juros pago
          </Badge>
        </div>
      </div>
    </li>
  )
}

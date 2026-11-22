import { useState } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { DateField } from '@/components/ui/form/DateField'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate, todayISO } from '@/lib/format'
import type { Loan } from '@/types/database'
import { interestAmount, loanLabel, nextMonthlyDue } from './status'
import { useUpdateLoan } from './api/useLoans'
import { usePayInterest } from './api/usePayments'
import { PaymentMethodPicker } from './PaymentMethodPicker'

interface MarkPaidDialogProps {
  loan: Loan | null
  onOpenChange: (open: boolean) => void
}

/**
 * Registrar pagamento ao tocar no check. Com juros, o cliente tem duas opções:
 * - pagar tudo (emprestado + juros) e quitar;
 * - pagar só os juros: o empréstimo continua e o vencimento vai para o mês seguinte.
 */
export function MarkPaidDialog({ loan, onOpenChange }: MarkPaidDialogProps) {
  return (
    <Dialog open={!!loan} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        {/* key: cada empréstimo abre com o formulário zerado (data de hoje, sem forma). */}
        {loan && <MarkPaidForm key={loan.id} loan={loan} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

type Option = 'tudo' | 'juros'

function MarkPaidForm({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const { showToast } = useToast()
  const updateLoan = useUpdateLoan()
  const payInterest = usePayInterest()
  const interest = interestAmount(loan)
  const hasInterest = interest > 0

  const [option, setOption] = useState<Option>('tudo')
  const [paidAt, setPaidAt] = useState(todayISO)
  const [nextDue, setNextDue] = useState(() => nextMonthlyDue(loan.due_date))
  const [method, setMethod] = useState('')

  const saving = updateLoan.isPending || payInterest.isPending
  const nextDueInvalid = option === 'juros' && (!nextDue || nextDue <= loan.due_date)
  const canConfirm = !!paidAt && !nextDueInvalid

  const confirm = async () => {
    if (!canConfirm) return
    try {
      if (option === 'tudo') {
        await updateLoan.mutateAsync({ id: loan.id, payload: { paid_at: paidAt, payment_method: method || null } })
        showToast(`${loanLabel(loan)} quitado${method ? ` (${method})` : ''}.`, 'success')
      } else {
        await payInterest.mutateAsync({ loanId: loan.id, paidAt, paymentMethod: method || null, nextDue })
        showToast(`Juros de ${formatCurrency(interest)} recebidos. Próximo vencimento: ${formatDate(nextDue)}.`, 'success')
      }
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao registrar o pagamento.', 'error')
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Registrar pagamento</DialogTitle>
        <DialogDescription>
          {loan.person?.name ?? 'Empréstimo'} · vence {formatDate(loan.due_date)}
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <div className="flex flex-col gap-5">
          {hasInterest && (
            <div role="radiogroup" aria-label="O que o cliente pagou?" className="flex flex-col gap-2">
              <p className="text-sm font-medium text-text-secondary">O que o cliente pagou?</p>
              <OptionCard
                selected={option === 'tudo'}
                onSelect={() => setOption('tudo')}
                icon="tabler:circle-check"
                title="Pagou tudo"
                amount={loan.amount_to_receive}
                description="Quita o empréstimo."
              />
              <OptionCard
                selected={option === 'juros'}
                onSelect={() => setOption('juros')}
                icon="tabler:calendar-repeat"
                title="Pagou só os juros"
                amount={interest}
                description={`Continua devendo ${formatCurrency(loan.amount_to_receive)}, para o mês seguinte.`}
              />
            </div>
          )}

          {!hasInterest && (
            <p className="rounded-xl border border-border bg-surface-elevated px-4 py-3 text-base text-text-primary sm:text-sm">
              Valor: <span className="font-semibold">{formatCurrency(loan.amount_to_receive)}</span>
            </p>
          )}

          <DateField label="Pago em" value={paidAt} onChange={setPaidAt} required />

          {option === 'juros' && (
            <DateField
              label="Próximo vencimento"
              value={nextDue}
              onChange={setNextDue}
              required
              hint="Já vem com o mesmo dia do mês seguinte."
              error={nextDueInvalid && nextDue ? `Precisa ser depois de ${formatDate(loan.due_date)}.` : undefined}
            />
          )}

          <PaymentMethodPicker value={method} onChange={setMethod} />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" onClick={confirm} loading={saving} disabled={!canConfirm}>
          {option === 'juros' ? 'Registrar juros' : 'Quitar'}
        </Button>
      </DialogFooter>
    </>
  )
}

function OptionCard({
  selected,
  onSelect,
  icon,
  title,
  amount,
  description,
}: {
  selected: boolean
  onSelect: () => void
  icon: string
  title: string
  amount: number
  description: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors',
        selected ? 'border-success bg-success-muted' : 'border-border-strong bg-surface-elevated hover:bg-surface-hover',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-success bg-success text-white' : 'border-border-strong',
        )}
      >
        {selected && <span className="size-2 rounded-full bg-white" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-base font-semibold text-text-primary sm:text-sm">
          <Icon icon={icon} className={cn('size-4.5 shrink-0', selected ? 'text-success' : 'text-text-muted')} />
          {title}
        </span>
        <span className="mt-0.5 block text-sm text-text-secondary sm:text-xs">{description}</span>
      </span>
      <span className={cn('shrink-0 text-lg font-bold sm:text-base', selected ? 'text-success' : 'text-text-primary')}>
        {formatCurrency(amount)}
      </span>
    </button>
  )
}

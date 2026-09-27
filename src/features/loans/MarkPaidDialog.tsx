import { useState } from 'react'
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
import { formatCurrency, todayISO } from '@/lib/format'
import type { Loan } from '@/types/database'
import { useUpdateLoan } from './api/useLoans'
import { PaymentMethodPicker } from './PaymentMethodPicker'

interface MarkPaidDialogProps {
  loan: Loan | null
  onOpenChange: (open: boolean) => void
}

/** Confirmação rápida ao tocar no check: data já vem com hoje, forma de pagamento é opcional. */
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

function MarkPaidForm({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const { showToast } = useToast()
  const updateMutation = useUpdateLoan()
  const [paidAt, setPaidAt] = useState(todayISO)
  const [method, setMethod] = useState('')

  const confirm = async () => {
    if (!paidAt) return
    try {
      await updateMutation.mutateAsync({ id: loan.id, payload: { paid_at: paidAt, payment_method: method || null } })
      showToast(`"${loan.title}" marcado como pago${method ? ` (${method})` : ''}.`, 'success')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao marcar como pago.', 'error')
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Marcar como pago</DialogTitle>
        <DialogDescription>
          {loan.title} · {loan.person?.name} · {formatCurrency(loan.amount_to_receive)}
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <div className="flex flex-col gap-4">
          <DateField label="Pago em" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
          <PaymentMethodPicker value={method} onChange={setMethod} />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" onClick={confirm} loading={updateMutation.isPending} disabled={!paidAt}>
          Confirmar
        </Button>
      </DialogFooter>
    </>
  )
}

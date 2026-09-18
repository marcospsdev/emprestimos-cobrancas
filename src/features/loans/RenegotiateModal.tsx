import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, todayISO } from '@/lib/format'
import type { Loan } from '@/types/database'
import { renegotiationSchema, type RenegotiationFormValues } from './schema'
import { useRenegotiateLoan } from './api/useLoans'

interface RenegotiateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan
  outstandingAmount: number
  onDone?: (newLoanId: string) => void
}

export function RenegotiateModal({ open, onOpenChange, loan, outstandingAmount, onDone }: RenegotiateModalProps) {
  const { showToast } = useToast()
  const renegotiateMutation = useRenegotiateLoan()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RenegotiationFormValues>({
    resolver: zodResolver(renegotiationSchema),
    defaultValues: {
      new_installments_count: loan.installments_count,
      new_interest_rate: loan.interest_rate,
      new_first_due_date: todayISO(),
      reason: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        new_installments_count: loan.installments_count,
        new_interest_rate: loan.interest_rate,
        new_first_due_date: todayISO(),
        reason: '',
      })
    }
  }, [open, loan, reset])

  const onSubmit = async (values: RenegotiationFormValues) => {
    try {
      const newLoan = await renegotiateMutation.mutateAsync({
        loan_id: loan.id,
        new_installments_count: values.new_installments_count,
        new_first_due_date: values.new_first_due_date,
        new_interest_rate: values.new_interest_rate,
        reason: values.reason,
      })
      showToast('Empréstimo renegociado.', 'success')
      onOpenChange(false)
      onDone?.(newLoan.id)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao renegociar empréstimo.', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>Renegociar empréstimo</DialogTitle>
            <DialogDescription>
              Saldo em aberto de {formatCurrency(outstandingAmount)} vira o principal de um novo empréstimo. O
              histórico deste empréstimo é preservado.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Número de novas parcelas"
                  type="number"
                  min={1}
                  required
                  error={errors.new_installments_count?.message}
                  {...register('new_installments_count', { valueAsNumber: true })}
                />
                <TextField
                  label="Novos juros (% por parcela)"
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  error={errors.new_interest_rate?.message}
                  {...register('new_interest_rate', { valueAsNumber: true })}
                />
              </div>
              <DateField
                label="Novo 1º vencimento"
                required
                error={errors.new_first_due_date?.message}
                {...register('new_first_due_date')}
              />
              <TextareaField label="Motivo da renegociação (opcional)" {...register('reason')} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Confirmar renegociação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

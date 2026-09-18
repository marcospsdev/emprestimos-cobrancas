import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import { MoneyField } from '@/components/ui/form/MoneyField'
import { DateField } from '@/components/ui/form/DateField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency } from '@/lib/format'
import type { InstallmentView } from '@/types/database'
import { emptyPaymentValues, paymentSchema, type PaymentFormValues } from './schema'
import { useRegisterPayment } from './api/useInstallments'

interface PaymentFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  installment: InstallmentView | null
}

export function PaymentFormModal({ open, onOpenChange, installment }: PaymentFormModalProps) {
  const { showToast } = useToast()
  const registerPaymentMutation = useRegisterPayment()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: emptyPaymentValues(0),
  })

  useEffect(() => {
    if (open && installment) reset(emptyPaymentValues(installment.updated_amount))
  }, [open, installment, reset])

  if (!installment) return null

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      await registerPaymentMutation.mutateAsync({
        installment_id: installment.id,
        amount: values.amount,
        payment_date: values.payment_date,
        notes: values.notes,
      })
      const isPartial = values.amount < installment.updated_amount - 0.01
      showToast(isPartial ? 'Pagamento parcial registrado.' : 'Pagamento registrado.', 'success')
      onOpenChange(false)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao registrar pagamento.', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>
              {installment.person_name} · Parcela {installment.sequence} · Saldo atualizado{' '}
              {formatCurrency(installment.updated_amount)}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="amount"
                  render={({ field }) => (
                    <MoneyField
                      label="Valor pago"
                      required
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? 0)}
                      error={errors.amount?.message}
                      hint="Pode ser menor que o saldo para pagamento parcial."
                    />
                  )}
                />
                <DateField
                  label="Data do pagamento"
                  required
                  error={errors.payment_date?.message}
                  {...register('payment_date')}
                />
              </div>
              <TextareaField label="Observação (opcional)" {...register('notes')} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Registrar pagamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

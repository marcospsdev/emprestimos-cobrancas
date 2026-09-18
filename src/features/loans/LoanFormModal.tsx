import { useMemo } from 'react'
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
import { TextField } from '@/components/ui/form/TextField'
import { ComboboxField } from '@/components/ui/form/ComboboxField'
import { FieldShell } from '@/components/ui/form/FieldShell'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency } from '@/lib/format'
import { usePeopleQuery } from '@/features/people/api/usePeople'
import { emptyLoanValues, loanSchema, type LoanFormValues } from './schema'
import { useCreateLoan } from './api/useLoans'

interface LoanFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultPersonId?: string
}

const FREQUENCY_OPTIONS = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'semanal', label: 'Semanal' },
]

export function LoanFormModal({ open, onOpenChange, defaultPersonId }: LoanFormModalProps) {
  const { showToast } = useToast()
  const createMutation = useCreateLoan()
  const { data: people } = usePeopleQuery()

  const personOptions = useMemo(() => (people ?? []).map((p) => ({ value: p.id, label: p.name })), [people])

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: { ...emptyLoanValues, person_id: defaultPersonId ?? '' },
  })

  const [principal, rate, count] = watch(['principal_amount', 'interest_rate', 'installments_count'])

  const preview = useMemo(() => {
    const n = Math.max(1, count || 1)
    const total = Math.round(principal * (1 + (rate / 100) * n) * 100) / 100
    const installmentAmount = Math.round((total / n) * 100) / 100
    return { total, installmentAmount }
  }, [principal, rate, count])

  const onSubmit = async (values: LoanFormValues) => {
    try {
      await createMutation.mutateAsync(values)
      showToast('Empréstimo criado.', 'success')
      onOpenChange(false)
      reset({ ...emptyLoanValues, person_id: defaultPersonId ?? '' })
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao criar empréstimo.', 'error')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset({ ...emptyLoanValues, person_id: defaultPersonId ?? '' })
      }}
    >
      <DialogContent size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>Novo empréstimo</DialogTitle>
            <DialogDescription>O valor total e as parcelas são calculados automaticamente.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <Controller
                control={control}
                name="person_id"
                render={({ field }) => (
                  <ComboboxField
                    label="Pessoa"
                    placeholder="Selecione a pessoa"
                    searchPlaceholder="Buscar pessoa..."
                    options={personOptions}
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? '')}
                    error={errors.person_id?.message}
                    disabled={!!defaultPersonId}
                  />
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="principal_amount"
                  render={({ field }) => (
                    <MoneyField
                      label="Valor emprestado"
                      required
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? 0)}
                      error={errors.principal_amount?.message}
                    />
                  )}
                />
                <TextField
                  label="Juros (% por parcela)"
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  error={errors.interest_rate?.message}
                  {...register('interest_rate', { valueAsNumber: true })}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Número de parcelas"
                  type="number"
                  min={1}
                  required
                  error={errors.installments_count?.message}
                  {...register('installments_count', { valueAsNumber: true })}
                />
                <FieldShell label="Frequência" htmlFor="installment_frequency">
                  <select
                    id="installment_frequency"
                    className="h-10 w-full rounded-lg border border-border-strong bg-surface-elevated px-3 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    {...register('installment_frequency')}
                  >
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FieldShell>
              </div>

              <DateField
                label="Data do primeiro vencimento"
                required
                error={errors.first_due_date?.message}
                {...register('first_due_date')}
              />

              <div className="grid grid-cols-2 gap-4 rounded-lg border border-brand-600/30 bg-brand-500/5 p-4">
                <div>
                  <p className="text-xs text-text-muted">Valor total</p>
                  <p className="mt-0.5 text-lg font-semibold text-text-primary">{formatCurrency(preview.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Valor de cada parcela</p>
                  <p className="mt-0.5 text-lg font-semibold text-text-primary">{formatCurrency(preview.installmentAmount)}</p>
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Criar empréstimo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

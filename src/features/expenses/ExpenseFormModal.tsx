import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { CheckboxField } from '@/components/ui/form/CheckboxField'
import { DateField } from '@/components/ui/form/DateField'
import { MoneyField } from '@/components/ui/form/MoneyField'
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { useToast } from '@/components/ui/Toast'
import { useDiscardGuard } from '@/hooks/useDiscardGuard'
import { formatCurrency, todayISO } from '@/lib/format'
import type { Expense } from '@/types/database'
import { CategoryPicker } from './CategoryPicker'
import { emptyExpenseValues, expenseSchema, type ExpenseFormValues } from './schema'
import {
  useCreateExpense,
  useCreateFixedExpense,
  useDeleteExpense,
  useFixedExpenseQuery,
  useResumeFixedExpense,
  useStopFixedExpense,
  useUpdateExpense,
  useUpdateFixedExpense,
} from './api/useExpenses'

interface ExpenseFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: Expense | null
  /** Data sugerida no cadastro (ex.: um dia do mês que está aberto na tela). */
  defaultDate?: string
}

const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`
const dayOf = (iso: string) => Number(iso.slice(8, 10))

export function ExpenseFormModal({ open, onOpenChange, expense, defaultDate }: ExpenseFormModalProps) {
  const { showToast } = useToast()
  const confirm = useConfirm()
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const deleteExpense = useDeleteExpense()
  const createFixed = useCreateFixedExpense()
  const updateFixed = useUpdateFixedExpense()
  const stopFixed = useStopFixedExpense()
  const resumeFixed = useResumeFixedExpense()
  const isEdit = !!expense
  const fixedQuery = useFixedExpenseQuery(open ? expense?.fixed_expense_id : null)
  const fixed = fixedQuery.data
  // A conta fixa ainda repete depois do mês desta despesa?
  const fixedActive = !!fixed && (!fixed.end_month || fixed.end_month > (expense?.ref_month ?? ''))

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: emptyExpenseValues(),
  })

  const discard = useDiscardGuard({ dirty: isDirty, isEdit, busy: isSubmitting, onClose: () => onOpenChange(false) })

  useEffect(() => {
    if (!open) return
    if (expense) {
      reset({
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        due_date: expense.due_date,
        paid: !!expense.paid_at,
        recurring: !!expense.fixed_expense_id,
        apply_future: false,
        notes: expense.notes ?? '',
      })
    } else {
      reset(emptyExpenseValues(defaultDate ?? todayISO()))
    }
  }, [open, expense, defaultDate, reset])

  // Ao carregar a conta fixa: "repete" reflete se ela continua ativa.
  useEffect(() => {
    if (!open || !expense?.fixed_expense_id || !fixed) return
    reset((prev) => ({ ...prev, recurring: fixedActive }), { keepDirty: true })
  }, [open, expense?.fixed_expense_id, fixed, fixedActive, reset])

  const paid = useWatch({ control, name: 'paid' })
  const recurring = useWatch({ control, name: 'recurring' })
  const dueDate = useWatch({ control, name: 'due_date' })

  const onSubmit = async (values: ExpenseFormValues) => {
    const today = todayISO()
    const paidAt = values.paid
      ? (expense?.paid_at ?? (isEdit ? today : values.due_date <= today ? values.due_date : today))
      : null
    const payload = {
      description: values.description.trim(),
      category: values.category,
      amount: values.amount,
      due_date: values.due_date,
      paid_at: paidAt,
      notes: values.notes.trim() || null,
    }
    const fixedPayload = {
      description: payload.description,
      category: payload.category,
      amount: payload.amount,
      due_day: dayOf(values.due_date),
    }
    try {
      if (!isEdit) {
        if (values.recurring) {
          const month = monthStart(values.due_date)
          const created = await createFixed.mutateAsync({ ...fixedPayload, start_month: month, last_generated_month: month })
          await createExpense.mutateAsync({ ...payload, fixed_expense_id: created.id })
          showToast(`${payload.description} cadastrada. Vai ser lançada todo mês, dia ${fixedPayload.due_day}.`, 'success')
        } else {
          await createExpense.mutateAsync(payload)
          showToast(`${payload.description} cadastrada.`, 'success')
        }
        onOpenChange(false)
        return
      }

      await updateExpense.mutateAsync({ id: expense.id, payload })
      const month = monthStart(values.due_date)
      const fixedId = expense.fixed_expense_id
      if (fixedId) {
        if (fixedActive && !values.recurring) {
          await stopFixed.mutateAsync({ id: fixedId, lastMonth: month })
          showToast('Despesa salva. Ela não será mais lançada nos próximos meses.', 'success')
        } else {
          if (!fixedActive && values.recurring) await resumeFixed.mutateAsync(fixedId)
          if (values.recurring && values.apply_future) {
            await updateFixed.mutateAsync({ id: fixedId, payload: fixedPayload, afterMonth: month })
            showToast('Despesa salva, também nos próximos meses.', 'success')
          } else {
            showToast('Despesa salva.', 'success')
          }
        }
      } else if (values.recurring) {
        const created = await createFixed.mutateAsync({ ...fixedPayload, start_month: month, last_generated_month: month })
        await updateExpense.mutateAsync({ id: expense.id, payload: { fixed_expense_id: created.id } })
        showToast(`Despesa salva. Vai ser lançada todo mês, dia ${fixedPayload.due_day}.`, 'success')
      } else {
        showToast('Despesa salva.', 'success')
      }
      onOpenChange(false)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar despesa.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!expense) return
    const ok = await confirm({
      title: 'Excluir despesa',
      description: expense.fixed_expense_id && fixedActive
        ? `Excluir "${expense.description}" (${formatCurrency(expense.amount)}) só deste mês? Ela continua sendo lançada nos próximos meses — para parar, desmarque "Repete todo mês".`
        : `Excluir "${expense.description}" (${formatCurrency(expense.amount)})? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteExpense.mutateAsync(expense.id)
      showToast(`${expense.description} excluída.`, 'success')
      onOpenChange(false)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao excluir despesa.', 'error')
    }
  }

  const fixedLoading = !!expense?.fixed_expense_id && fixedQuery.isLoading

  return (
    <Dialog open={open} onOpenChange={discard.onOpenChange}>
      <DialogContent size="md">
        <form
          onSubmit={handleSubmit(onSubmit, () => showToast('Confira os campos destacados em vermelho.', 'warning'))}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar despesa' : 'Nova despesa'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <MoneyField label="Valor" required error={errors.amount?.message} value={field.value} onValueChange={(v) => field.onChange(v ?? undefined)} />
                )}
              />
              <TextField
                label="Com o que foi?"
                required
                autoComplete="off"
                autoCapitalize="sentences"
                enterKeyHint="next"
                hint={isEdit ? undefined : 'Ex.: conta de luz, feira do mês, gasolina'}
                error={errors.description?.message}
                {...register('description')}
              />
              <Controller
                control={control}
                name="category"
                render={({ field }) => <CategoryPicker value={field.value} onChange={field.onChange} error={errors.category?.message} />}
              />
              <Controller
                control={control}
                name="paid"
                render={({ field }) => (
                  <CheckboxField
                    label="Já está pago"
                    description={field.value ? undefined : 'Fica como "a pagar" e mostra quando vencer'}
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name="due_date"
                render={({ field }) => (
                  <DateField
                    label={paid ? 'Data do gasto' : 'Vence em'}
                    required
                    error={errors.due_date?.message}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              <Controller
                control={control}
                name="recurring"
                render={({ field }) => (
                  <CheckboxField
                    label="Repete todo mês (conta fixa)"
                    description={
                      field.value
                        ? `Lançada sozinha todo mês, no dia ${dueDate ? dayOf(dueDate) : '—'}`
                        : 'Ex.: aluguel, luz, internet, mensalidade'
                    }
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={fixedLoading}
                  />
                )}
              />
              {isEdit && expense.fixed_expense_id && recurring && fixedActive && (
                <Controller
                  control={control}
                  name="apply_future"
                  render={({ field }) => (
                    <CheckboxField
                      label="Mudar também nos próximos meses"
                      description="Valor, descrição, categoria e dia valem daqui para frente"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              )}
              <TextareaField label="Observações (opcional)" autoCapitalize="sentences" {...register('notes')} />

              {isEdit && (
                <Button type="button" variant="ghost" onClick={handleDelete} className="self-start text-danger hover:bg-danger-muted hover:text-danger">
                  <Icon icon="tabler:trash" className="size-4.5" />
                  Excluir despesa
                </Button>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={discard.requestClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

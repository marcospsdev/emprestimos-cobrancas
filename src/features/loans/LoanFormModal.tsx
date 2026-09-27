import { useEffect, useMemo, useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { addDays, format, parseISO } from 'date-fns'
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
import { MoneyField } from '@/components/ui/form/MoneyField'
import { DateField } from '@/components/ui/form/DateField'
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { ComboboxField } from '@/components/ui/form/ComboboxField'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/cn'
import { formatCurrency, todayISO } from '@/lib/format'
import { maskPhone } from '@/lib/whatsapp'
import { useCreatePerson, usePeopleQuery } from '@/features/people/api/usePeople'
import type { Loan, LoanInput } from '@/types/database'
import { emptyLoanValues, loanSchema, loanToFormValues, type LoanFormValues } from './schema'
import { useCreateLoan, useDeleteLoan, useUpdateLoan } from './api/useLoans'
import { PersonNotFoundError } from './api/loans'
import { PaymentMethodPicker } from './PaymentMethodPicker'

interface LoanFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Presente = edição. */
  loan?: Loan | null
  defaultPersonId?: string
}

const DUE_SHORTCUTS = [
  { label: '7 dias', days: 7 },
  { label: '15 dias', days: 15 },
  { label: '30 dias', days: 30 },
]

export function LoanFormModal({ open, onOpenChange, loan, defaultPersonId }: LoanFormModalProps) {
  const isEdit = !!loan
  const { showToast } = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const { data: people } = usePeopleQuery()
  const createPerson = useCreatePerson()
  const createLoan = useCreateLoan()
  const updateLoan = useUpdateLoan()
  const deleteLoan = useDeleteLoan()

  // Enquanto a pessoa não mexer no "valor a receber", ele acompanha o valor
  // emprestado (empréstimo sem juros é o caso mais comum).
  const toReceiveTouched = useRef(false)

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: emptyLoanValues(defaultPersonId),
  })

  // O modal fica montado o tempo todo; ao abrir, atualiza a lista de pessoas
  // para não oferecer alguém que já foi excluído.
  useEffect(() => {
    if (open) queryClient.invalidateQueries({ queryKey: ['people'] })
  }, [open, queryClient])

  useEffect(() => {
    if (!open) return
    toReceiveTouched.current = isEdit
    reset(loan ? loanToFormValues(loan) : emptyLoanValues(defaultPersonId))
  }, [open, loan, isEdit, defaultPersonId, reset])

  const [personMode, amountLent, amountToReceive, loanDate, isPaid] = useWatch({
    control,
    name: ['person_mode', 'amount_lent', 'amount_to_receive', 'loan_date', 'is_paid'],
  })

  const personOptions = useMemo(
    () => (people ?? []).map((p) => ({ value: p.id, label: p.name, description: p.phone ?? undefined })),
    [people],
  )

  const profit = (amountToReceive || 0) - (amountLent || 0)

  const setDueIn = (days: number) => {
    const base = loanDate ? parseISO(loanDate) : new Date()
    setValue('due_date', format(addDays(base, days), 'yyyy-MM-dd'), { shouldValidate: true })
  }

  const onSubmit = async (values: LoanFormValues) => {
    try {
      let personId = values.person_id
      if (values.person_mode === 'new') {
        const person = await createPerson.mutateAsync({
          name: values.new_person_name.trim(),
          phone: values.new_person_phone.trim() || null,
        })
        personId = person.id
        // Se salvar o empréstimo falhar logo abaixo, tentar de novo não
        // cadastra a mesma pessoa duas vezes.
        setValue('person_mode', 'existing')
        setValue('person_id', person.id)
      }

      const payload: LoanInput = {
        person_id: personId,
        title: values.title.trim(),
        description: values.description.trim() || null,
        amount_lent: values.amount_lent,
        amount_to_receive: values.amount_to_receive,
        loan_date: values.loan_date,
        due_date: values.due_date,
        paid_at: values.is_paid ? values.paid_at : null,
        payment_method: values.is_paid ? values.payment_method || null : null,
      }

      if (isEdit) {
        await updateLoan.mutateAsync({ id: loan.id, payload })
        showToast('Empréstimo atualizado.', 'success')
      } else {
        await createLoan.mutateAsync(payload)
        showToast('Empréstimo cadastrado.', 'success')
      }
      onOpenChange(false)
    } catch (error) {
      if (error instanceof PersonNotFoundError) {
        // Lista de pessoas estava desatualizada: recarrega e pede pra escolher de novo.
        setValue('person_id', '')
        queryClient.invalidateQueries({ queryKey: ['people'] })
      }
      showToast(error instanceof Error ? error.message : 'Erro ao salvar empréstimo.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!loan) return
    const ok = await confirm({
      title: 'Excluir empréstimo',
      description: `Excluir "${loan.title}"? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteLoan.mutateAsync(loan.id)
      showToast('Empréstimo excluído.', 'success')
      onOpenChange(false)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao excluir empréstimo.', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar empréstimo' : 'Novo empréstimo'}</DialogTitle>
            {!isEdit && <DialogDescription>Para quem, quanto e quando vai receber.</DialogDescription>}
          </DialogHeader>

          <DialogBody>
            <div className="flex flex-col gap-5">
              {/* ---- Pessoa ---- */}
              {personMode === 'existing' ? (
                <Controller
                  control={control}
                  name="person_id"
                  render={({ field }) => (
                    <ComboboxField
                      label="Pessoa"
                      required
                      placeholder="Escolher pessoa"
                      searchPlaceholder="Buscar pelo nome..."
                      emptyMessage="Ninguém com esse nome"
                      options={personOptions}
                      value={field.value || null}
                      onChange={(v) => field.onChange(v ?? '')}
                      error={errors.person_id?.message}
                      createNewLabel="Cadastrar nova pessoa"
                      onCreateNew={(typed) => {
                        setValue('person_mode', 'new')
                        setValue('new_person_name', typed)
                      }}
                    />
                  )}
                />
              ) : (
                <div className="flex flex-col gap-3 rounded-2xl border border-brand-600/30 bg-brand-500/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-brand-300">
                      <Icon icon="tabler:user-plus" className="size-4.5" />
                      Nova pessoa
                    </p>
                    <button
                      type="button"
                      onClick={() => setValue('person_mode', 'existing')}
                      className="-mr-2 cursor-pointer rounded-lg px-2 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
                    >
                      Escolher da lista
                    </button>
                  </div>
                  <TextField
                    label="Nome"
                    required
                    autoComplete="off"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    error={errors.new_person_name?.message}
                    {...register('new_person_name')}
                  />
                  <Controller
                    control={control}
                    name="new_person_phone"
                    render={({ field }) => (
                      <TextField
                        label="WhatsApp"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        enterKeyHint="next"
                        placeholder="(00) 00000-0000"
                        hint="Para cobrar com um toque."
                        value={field.value}
                        onChange={(e) => field.onChange(maskPhone(e.target.value))}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </div>
              )}

              {/* ---- Título ---- */}
              <TextField
                label="Título"
                required
                placeholder="Ex.: Conserto do carro"
                autoComplete="off"
                autoCapitalize="sentences"
                enterKeyHint="next"
                error={errors.title?.message}
                {...register('title')}
              />

              {/* ---- Valores ---- */}
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={control}
                    name="amount_lent"
                    render={({ field }) => (
                      <MoneyField
                        label="Emprestei"
                        required
                        value={field.value || null}
                        onValueChange={(v) => {
                          field.onChange(v ?? 0)
                          if (!toReceiveTouched.current) setValue('amount_to_receive', v ?? 0)
                        }}
                        error={errors.amount_lent?.message}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="amount_to_receive"
                    render={({ field }) => (
                      <MoneyField
                        label="Vou receber"
                        required
                        value={field.value || null}
                        onValueChange={(v) => {
                          toReceiveTouched.current = true
                          field.onChange(v ?? 0)
                        }}
                        error={errors.amount_to_receive?.message}
                      />
                    )}
                  />
                </div>
                {profit !== 0 && amountLent > 0 && amountToReceive > 0 && (
                  <p className={cn('mt-2 text-sm', profit > 0 ? 'text-gold-400' : 'text-text-muted')}>
                    {profit > 0 ? `Lucro de ${formatCurrency(profit)}` : `Vai receber ${formatCurrency(-profit)} a menos`}
                  </p>
                )}
              </div>

              {/* ---- Datas ---- */}
              <div className="flex flex-col gap-4">
                <DateField label="Data do empréstimo" required error={errors.loan_date?.message} {...register('loan_date')} />
                <DateField label="Pagar até" required error={errors.due_date?.message} {...register('due_date')} />
              </div>
              <div className="-mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-text-muted">Pagar em:</span>
                {DUE_SHORTCUTS.map((s) => (
                  <button
                    key={s.days}
                    type="button"
                    onClick={() => setDueIn(s.days)}
                    className="h-9 cursor-pointer rounded-lg border border-border-strong bg-surface-elevated px-3 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* ---- Descrição ---- */}
              <TextareaField
                label="Descrição (opcional)"
                placeholder="Ex.: vai pagar em 3 vezes de R$ 200, dia 10 de cada mês"
                autoCapitalize="sentences"
                rows={5}
                {...register('description')}
              />

              {/* ---- Pagamento (só na edição; no cadastro usa-se o check da lista) ---- */}
              {isEdit && (
                <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-elevated/50 p-4">
                  <Controller
                    control={control}
                    name="is_paid"
                    render={({ field }) => (
                      <label className="flex min-h-11 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => {
                            field.onChange(e.target.checked)
                            if (e.target.checked) setValue('paid_at', loan?.paid_at ?? todayISO())
                          }}
                          className="size-6 shrink-0 cursor-pointer accent-emerald-500"
                        />
                        <span className="text-base font-medium text-text-primary sm:text-sm">Já foi pago</span>
                      </label>
                    )}
                  />
                  {isPaid && (
                    <>
                      <DateField label="Pago em" required error={errors.paid_at?.message} {...register('paid_at')} />
                      <Controller
                        control={control}
                        name="payment_method"
                        render={({ field }) => <PaymentMethodPicker value={field.value} onChange={field.onChange} />}
                      />
                    </>
                  )}
                </div>
              )}

              {isEdit && (
                <Button type="button" variant="ghost" onClick={handleDelete} className="self-start text-danger hover:bg-danger-muted hover:text-danger">
                  <Icon icon="tabler:trash" className="size-4.5" />
                  Excluir empréstimo
                </Button>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
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

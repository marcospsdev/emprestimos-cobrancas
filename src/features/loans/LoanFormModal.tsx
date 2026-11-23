import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { addDays, addMonths, format, parseISO } from 'date-fns'
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
import { PercentField } from '@/components/ui/form/PercentField'
import { DateField } from '@/components/ui/form/DateField'
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { ComboboxField } from '@/components/ui/form/ComboboxField'
import { CheckboxField } from '@/components/ui/form/CheckboxField'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useDiscardGuard } from '@/hooks/useDiscardGuard'
import { cn } from '@/lib/cn'
import { formatCurrency, todayISO } from '@/lib/format'
import { maskPhone } from '@/lib/whatsapp'
import { useCreatePerson, usePeopleQuery } from '@/features/people/api/usePeople'
import type { Loan, LoanInput } from '@/types/database'
import { emptyLoanValues, loanSchema, loanToFormValues, type LoanFormValues } from './schema'
import { useCreateLoan, useDeleteLoan, useUpdateLoan } from './api/useLoans'
import { PersonNotFoundError } from './api/loans'
import { PaymentMethodPicker } from './PaymentMethodPicker'
import { computeAmountToReceive, installmentAmount, loanLabel } from './status'

interface LoanFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Presente = edição. */
  loan?: Loan | null
  defaultPersonId?: string
}

// O combinado mais comum é mensal (ex.: emprestou dia 5, paga dia 5 do mês seguinte).
const DUE_SHORTCUTS: { label: string; days?: number; months?: number }[] = [
  { label: '7 dias', days: 7 },
  { label: '15 dias', days: 15 },
  { label: '1 mês', months: 1 },
]

const INSTALLMENT_SHORTCUTS = [2, 3, 4, 5, 6, 10, 12]

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

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: emptyLoanValues(defaultPersonId),
  })

  // X, clique fora, Esc, arrastar ou Cancelar com dados preenchidos: confirma o descarte.
  const discard = useDiscardGuard({ dirty: isDirty, isEdit, busy: isSubmitting, onClose: () => onOpenChange(false) })

  // O modal fica montado o tempo todo; ao abrir, atualiza a lista de pessoas
  // para não oferecer alguém que já foi excluído.
  useEffect(() => {
    if (open) queryClient.invalidateQueries({ queryKey: ['people'] })
  }, [open, queryClient])

  useEffect(() => {
    if (!open) return
    reset(loan ? loanToFormValues(loan) : emptyLoanValues(defaultPersonId))
  }, [open, loan, isEdit, defaultPersonId, reset])

  const [personMode, amountLent, interestRate, loanDate, isPaid, payMode, installments] = useWatch({
    control,
    name: ['person_mode', 'amount_lent', 'interest_rate', 'loan_date', 'is_paid', 'pay_mode', 'installments'],
  })
  const parcelado = payMode === 'parcelado'
  // Com parcela já paga, mudar valor/juros/parcelas bagunçaria o que já foi recebido.
  const locked = isEdit && (loan?.installments_paid ?? 0) > 0

  const personOptions = useMemo(
    () => (people ?? []).map((p) => ({ value: p.id, label: p.name, description: p.phone ?? undefined })),
    [people],
  )

  const amountToReceive = computeAmountToReceive(amountLent, interestRate)
  const profit = amountToReceive - (amountLent || 0)
  const perInstallment =
    parcelado && installments >= 2 ? installmentAmount({ amount_to_receive: amountToReceive, installments }) : 0

  const setPayMode = (mode: 'avista' | 'parcelado') => {
    setValue('pay_mode', mode, { shouldDirty: true })
    if (!installments || installments < 2) setValue('installments', 2, { shouldDirty: true })
  }

  const setDueIn = ({ days = 0, months = 0 }: { days?: number; months?: number }) => {
    const base = loanDate ? parseISO(loanDate) : new Date()
    setValue('due_date', format(addMonths(addDays(base, days), months), 'yyyy-MM-dd'), { shouldValidate: true, shouldDirty: true })
  }

  const onSubmit = async (values: LoanFormValues) => {
    try {
      let personId = values.person_id
      let personName = people?.find((p) => p.id === values.person_id)?.name ?? ''
      let createdPerson = false
      if (values.person_mode === 'new') {
        const person = await createPerson.mutateAsync({
          name: values.new_person_name.trim(),
          phone: values.new_person_phone.trim() || null,
        })
        personId = person.id
        personName = person.name
        createdPerson = true
        // Se salvar o empréstimo falhar logo abaixo, tentar de novo não
        // cadastra a mesma pessoa duas vezes.
        setValue('person_mode', 'existing')
        setValue('person_id', person.id)
      }

      const payload: LoanInput = {
        person_id: personId,
        description: values.description.trim() || null,
        amount_lent: values.amount_lent,
        interest_rate: values.interest_rate,
        amount_to_receive: computeAmountToReceive(values.amount_lent, values.interest_rate),
        installments: values.pay_mode === 'parcelado' ? values.installments : 1,
        loan_date: values.loan_date,
        due_date: values.due_date,
        paid_at: values.is_paid ? values.paid_at : null,
        payment_method: values.is_paid ? values.payment_method || null : null,
      }

      const label = personName ? `Empréstimo de ${personName}` : 'Empréstimo'
      if (isEdit) {
        await updateLoan.mutateAsync({ id: loan.id, payload })
        // Mudou o pagamento pela edição? Diz isso, em vez de só "atualizado".
        if (payload.paid_at && !loan.paid_at) showToast(`${label} marcado como pago.`, 'success')
        else if (!payload.paid_at && loan.paid_at) showToast(`${label} voltou para não pago.`, 'info')
        else showToast(`${label} atualizado.`, 'success')
      } else {
        await createLoan.mutateAsync(payload)
        showToast(
          createdPerson
            ? `Cliente ${personName} cadastrado e empréstimo criado.`
            : `Empréstimo cadastrado${personName ? ` para ${personName}` : ''}.`,
          'success',
        )
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
      description: `Excluir o empréstimo de ${formatCurrency(loan.amount_to_receive)}${loan.person ? ` de ${loan.person.name}` : ''}? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteLoan.mutateAsync(loan.id)
      showToast(`${loanLabel(loan)} excluído.`, 'success')
      onOpenChange(false)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao excluir empréstimo.', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={discard.onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit(onSubmit, () => showToast('Confira os campos destacados em vermelho.', 'warning'))} className="flex min-h-0 flex-1 flex-col" noValidate>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar empréstimo' : 'Novo empréstimo'}</DialogTitle>
            {!isEdit && <DialogDescription>Cliente, valor, juros e como vai pagar.</DialogDescription>}
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
                      label="Cliente"
                      required
                      placeholder="Escolher cliente"
                      searchPlaceholder="Buscar pelo nome..."
                      emptyMessage="Ninguém com esse nome"
                      options={personOptions}
                      value={field.value || null}
                      onChange={(v) => field.onChange(v ?? '')}
                      error={errors.person_id?.message}
                      createNewLabel="Cadastrar novo cliente"
                      onCreateNew={(typed) => {
                        setValue('person_mode', 'new', { shouldDirty: true })
                        setValue('new_person_name', typed, { shouldDirty: true })
                      }}
                    />
                  )}
                />
              ) : (
                <div className="flex flex-col gap-3 rounded-2xl border border-brand-600/30 bg-brand-500/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-brand-300">
                      <Icon icon="tabler:user-plus" className="size-4.5" />
                      Novo cliente
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

              {/* ---- Valores: emprestado + juros (%) → total a receber ---- */}
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={control}
                    name="amount_lent"
                    render={({ field }) => (
                      <MoneyField
                        label="Valor emprestado"
                        required
                        value={field.value || null}
                        onValueChange={(v) => field.onChange(v ?? 0)}
                        error={errors.amount_lent?.message}
                        disabled={locked}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="interest_rate"
                    render={({ field }) => (
                      <PercentField
                        label="Juros"
                        value={field.value || null}
                        onValueChange={(v) => field.onChange(v ?? 0)}
                        error={errors.interest_rate?.message}
                        disabled={locked}
                      />
                    )}
                  />
                </div>
                {amountLent > 0 && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-elevated/50 px-4 py-3">
                    <div>
                      <p className="text-xs text-text-muted">Vai receber</p>
                      <p className="text-lg font-semibold text-text-primary">{formatCurrency(amountToReceive)}</p>
                    </div>
                    {profit > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-text-muted">Lucro</p>
                        <p className="text-base font-semibold text-gold-400">{formatCurrency(profit)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ---- Como vai pagar: de uma vez ou parcelado ---- */}
              <div className="flex flex-col gap-3">
                <div>
                  <p className="mb-1.5 text-sm font-medium text-text-secondary">Como vai pagar?</p>
                  <div role="radiogroup" aria-label="Como vai pagar?" className="grid grid-cols-2 gap-2">
                    <ModeButton selected={!parcelado} disabled={locked} onClick={() => setPayMode('avista')} icon="tabler:cash" label="De uma vez" />
                    <ModeButton selected={parcelado} disabled={locked} onClick={() => setPayMode('parcelado')} icon="tabler:calendar-repeat" label="Parcelado" />
                  </div>
                  {locked && (
                    <p className="mt-1.5 text-sm text-text-muted sm:text-xs">
                      Já tem parcela paga. Para mudar valor, juros ou parcelas, desfaça antes os pagamentos das parcelas.
                    </p>
                  )}
                </div>
                {parcelado && (
                  <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-elevated/50 p-4">
                    <Controller
                      control={control}
                      name="installments"
                      render={({ field }) => (
                        <TextField
                          label="Em quantas vezes"
                          required
                          type="text"
                          inputMode="numeric"
                          enterKeyHint="next"
                          disabled={locked}
                          value={field.value ? String(field.value) : ''}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 3)
                            field.onChange(digits ? Number(digits) : 0)
                          }}
                          onBlur={field.onBlur}
                          error={errors.installments?.message}
                        />
                      )}
                    />
                    {!locked && (
                      <div className="flex flex-wrap gap-2">
                        {INSTALLMENT_SHORTCUTS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setValue('installments', n, { shouldValidate: true, shouldDirty: true })}
                            className={cn(
                              'h-10 min-w-12 cursor-pointer rounded-lg border px-3 text-sm font-medium transition-colors',
                              installments === n
                                ? 'border-brand-500 bg-brand-500/15 text-text-primary'
                                : 'border-border-strong bg-surface-elevated text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                            )}
                          >
                            {n}x
                          </button>
                        ))}
                      </div>
                    )}
                    {perInstallment > 0 && (
                      <p className="text-base text-text-primary sm:text-sm">
                        <span className="font-semibold">
                          {installments}x de {formatCurrency(perInstallment)}
                        </span>{' '}
                        <span className="text-text-secondary">· uma parcela por mês</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ---- Datas ---- */}
              <div className="flex flex-col gap-4">
                <Controller
                  control={control}
                  name="loan_date"
                  render={({ field }) => (
                    <DateField label="Data do empréstimo" required error={errors.loan_date?.message} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                  )}
                />
                <Controller
                  control={control}
                  name="due_date"
                  render={({ field }) => (
                    <DateField
                      label={!parcelado ? 'Data do pagamento' : locked ? 'Vencimento da parcela atual' : 'Vencimento da 1ª parcela'}
                      hint={parcelado && !locked ? 'As outras vencem no mesmo dia dos meses seguintes.' : undefined}
                      required
                      error={errors.due_date?.message}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>
              <div className="-mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-text-muted">Pagar em:</span>
                {DUE_SHORTCUTS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setDueIn(s)}
                    className="h-9 cursor-pointer rounded-lg border border-border-strong bg-surface-elevated px-3 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* ---- Descrição ---- */}
              {/* Sem placeholder: um exemplo dentro do campo pareceria informação real do
                  empréstimo. O exemplo aparece só como dica, e só no cadastro novo. */}
              <TextareaField
                label="Descrição (opcional)"
                hint={isEdit ? undefined : 'Exemplo: combinou de pagar pelo Pix.'}
                autoCapitalize="sentences"
                rows={5}
                {...register('description')}
              />

              {/* ---- Pagamento (só na edição; no cadastro usa-se o check da lista) ---- */}
              {isEdit && (
                <div className="flex flex-col gap-4">
                  <Controller
                    control={control}
                    name="is_paid"
                    render={({ field }) => (
                      <CheckboxField
                        label={parcelado ? 'Já foi quitado' : 'Já foi pago'}
                        description={
                          field.value
                            ? 'Informe quando e como recebeu.'
                            : parcelado
                              ? 'Marque quando o cliente pagar tudo o que falta.'
                              : 'Marque quando o cliente pagar.'
                        }
                        checked={field.value}
                        onChange={(checked) => {
                          field.onChange(checked)
                          if (checked) setValue('paid_at', loan?.paid_at ?? todayISO())
                        }}
                      />
                    )}
                  />
                  {isPaid && (
                    <>
                      <Controller
                  control={control}
                  name="paid_at"
                  render={({ field }) => (
                    <DateField label="Pago em" required error={errors.paid_at?.message} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                  )}
                />
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

function ModeButton({
  selected,
  disabled,
  onClick,
  icon,
  label,
}: {
  selected: boolean
  disabled?: boolean
  onClick: () => void
  icon: string
  label: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:text-sm',
        selected
          ? 'border-brand-500 bg-brand-500/15 text-text-primary'
          : 'border-border-strong bg-surface-elevated text-text-secondary hover:bg-surface-hover',
      )}
    >
      <Icon icon={icon} className={cn('size-5 shrink-0', selected ? 'text-brand-400' : 'text-text-muted')} />
      {label}
    </button>
  )
}

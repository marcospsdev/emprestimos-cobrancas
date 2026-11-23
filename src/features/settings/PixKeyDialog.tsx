import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Label } from '@/components/ui/form/Label'
import { TextField } from '@/components/ui/form/TextField'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useDiscardGuard } from '@/hooks/useDiscardGuard'
import { cn } from '@/lib/cn'
import { useSaveSettings, useSettingsQuery } from './api/useSettings'
import { PIX_KEY_TYPES, buildPixBlock, formatPixKey, maskPixKey, normalizePixKey, validatePixKey, type PixKeyType } from './pix'

const schema = z
  .object({
    type: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']),
    key: z.string(),
    holder: z.string().trim().min(3, 'Informe o nome de quem vai receber'),
    bank: z.string().trim().min(2, 'Informe o banco'),
  })
  .superRefine((values, ctx) => {
    const error = validatePixKey(values.type, values.key)
    if (error) ctx.addIssue({ code: 'custom', path: ['key'], message: error })
  })

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = { type: 'cpf', key: '', holder: '', bank: '' }

interface PixKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Cadastro da chave Pix que vai no fim da mensagem de "Cobrar" no WhatsApp. */
export function PixKeyDialog({ open, onOpenChange }: PixKeyDialogProps) {
  const { data: settings } = useSettingsQuery()
  const save = useSaveSettings()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const hasKey = !!settings?.pix_key

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues })

  const discard = useDiscardGuard({ dirty: isDirty, isEdit: hasKey, busy: isSubmitting, onClose: () => onOpenChange(false) })

  useEffect(() => {
    if (!open) return
    reset(
      settings?.pix_key && settings.pix_key_type
        ? {
            type: settings.pix_key_type,
            key: formatPixKey(settings.pix_key_type, settings.pix_key),
            holder: settings.pix_holder ?? '',
            bank: settings.pix_bank ?? '',
          }
        : emptyValues,
    )
  }, [open, settings, reset])

  const [type, key, holder, bank] = useWatch({ control, name: ['type', 'key', 'holder', 'bank'] })
  const typeInfo = PIX_KEY_TYPES.find((t) => t.value === type) ?? PIX_KEY_TYPES[0]
  const keyValid = !validatePixKey(type, key)

  const onSubmit = async (values: FormValues) => {
    try {
      await save.mutateAsync({
        pix_key_type: values.type,
        pix_key: normalizePixKey(values.type, values.key),
        pix_holder: values.holder.trim(),
        pix_bank: values.bank.trim(),
      })
      showToast('Chave Pix salva. Ela vai junto nas mensagens de cobrança.', 'success')
      onOpenChange(false)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar a chave Pix.', 'error')
    }
  }

  const remove = async () => {
    const ok = await confirm({
      title: 'Remover chave Pix?',
      description: 'As mensagens de cobrança vão sair sem os dados do Pix.',
      confirmLabel: 'Remover',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await save.mutateAsync({ pix_key_type: null, pix_key: null, pix_holder: null, pix_bank: null })
      showToast('Chave Pix removida.', 'info')
      onOpenChange(false)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao remover a chave Pix.', 'error')
    }
  }

  const changeType = (next: PixKeyType) => {
    if (next === type) return
    setValue('type', next, { shouldDirty: true })
    // A chave de um tipo não serve para outro: começa em branco.
    setValue('key', '', { shouldDirty: true, shouldValidate: false })
  }

  return (
    <Dialog open={open} onOpenChange={discard.onOpenChange}>
      <DialogContent size="sm">
        <form
          onSubmit={handleSubmit(onSubmit, () => showToast('Confira os campos destacados em vermelho.', 'warning'))}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <DialogHeader>
            <DialogTitle>Chave Pix para cobrança</DialogTitle>
            <DialogDescription>Vai no fim da mensagem quando você toca em "Cobrar" no WhatsApp.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <div>
                <Label required>Tipo de chave</Label>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de chave">
                  {PIX_KEY_TYPES.map((option) => {
                    const active = type === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => changeType(option.value)}
                        className={cn(
                          'h-11 cursor-pointer rounded-xl border px-4 text-sm font-medium transition-colors sm:h-9 sm:rounded-lg sm:px-3',
                          active
                            ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                            : 'border-border-strong bg-surface-elevated text-text-secondary hover:bg-surface-hover',
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <Controller
                control={control}
                name="key"
                render={({ field }) => (
                  <TextField
                    label={`Chave Pix (${typeInfo.label})`}
                    required
                    inputMode={typeInfo.inputMode}
                    type={type === 'email' ? 'email' : type === 'telefone' ? 'tel' : 'text'}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={hasKey ? undefined : typeInfo.placeholder}
                    error={errors.key?.message}
                    value={field.value}
                    onChange={(e) => field.onChange(maskPixKey(type, e.target.value))}
                    onBlur={field.onBlur}
                  />
                )}
              />

              <TextField
                label="Nome de quem recebe"
                required
                autoComplete="off"
                autoCapitalize="words"
                hint={hasKey ? undefined : 'Dono da conta, como aparece no Pix. Assim o cliente confere antes de pagar.'}
                error={errors.holder?.message}
                {...register('holder')}
              />

              <TextField
                label="Banco"
                required
                autoComplete="off"
                autoCapitalize="words"
                hint={hasKey ? undefined : 'Ex.: Nubank, Caixa, Banco do Brasil'}
                error={errors.bank?.message}
                {...register('bank')}
              />

              {keyValid && holder.trim() && bank.trim() && (
                <div className="rounded-xl border border-border bg-surface-elevated p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                    <Icon icon="tabler:brand-whatsapp" className="size-4" />
                    Como vai aparecer na mensagem
                  </p>
                  <p className="text-sm break-words whitespace-pre-line text-text-secondary">
                    {buildPixBlock({ type, key: normalizePixKey(type, key), holder: holder.trim(), bank: bank.trim() })
                      .trim()
                      .replace(/\*/g, '')}
                  </p>
                </div>
              )}

              {hasKey && (
                <Button type="button" variant="ghost" className="self-start text-danger hover:text-danger" onClick={remove} disabled={isSubmitting}>
                  <Icon icon="tabler:trash" className="size-4" />
                  Remover chave Pix
                </Button>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={discard.requestClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { useToast } from '@/components/ui/Toast'
import { maskPhone } from '@/lib/whatsapp'
import type { Person } from '@/types/database'
import { emptyPersonValues, personSchema, type PersonFormValues } from './schema'
import { useCreatePerson, useUpdatePerson } from './api/usePeople'

interface PersonFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  person?: Person | null
}

export function PersonFormModal({ open, onOpenChange, person }: PersonFormModalProps) {
  const { showToast } = useToast()
  const createMutation = useCreatePerson()
  const updateMutation = useUpdatePerson()
  const isEdit = !!person

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: emptyPersonValues,
  })

  useEffect(() => {
    if (!open) return
    reset(person ? { name: person.name, phone: maskPhone(person.phone ?? ''), notes: person.notes ?? '' } : emptyPersonValues)
  }, [open, person, reset])

  const onSubmit = async (values: PersonFormValues) => {
    const payload = {
      name: values.name.trim(),
      phone: values.phone?.trim() || null,
      notes: values.notes?.trim() || null,
    }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: person.id, payload })
        showToast(`${payload.name} atualizado(a).`, 'success')
      } else {
        await createMutation.mutateAsync(payload)
        showToast(`${payload.name} cadastrado(a).`, 'success')
      }
      onOpenChange(false)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar pessoa.', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={handleSubmit(onSubmit, () => showToast('Confira os campos destacados em vermelho.', 'warning'))} className="flex min-h-0 flex-1 flex-col" noValidate>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar pessoa' : 'Nova pessoa'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <TextField
                label="Nome"
                required
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="next"
                error={errors.name?.message}
                {...register('name')}
              />
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <TextField
                    label="WhatsApp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    enterKeyHint="next"
                    placeholder="(00) 00000-0000"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(maskPhone(e.target.value))}
                    onBlur={field.onBlur}
                  />
                )}
              />
              <TextareaField label="Observações (opcional)" autoCapitalize="sentences" {...register('notes')} />
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

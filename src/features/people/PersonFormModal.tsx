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
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { useToast } from '@/components/ui/Toast'
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
    reset(
      person
        ? {
            name: person.name,
            cpf: person.cpf ?? '',
            phone: person.phone ?? '',
            address: person.address ?? '',
            notes: person.notes ?? '',
          }
        : emptyPersonValues,
    )
  }, [open, person, reset])

  const onSubmit = async (values: PersonFormValues) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: person.id, payload: values })
        showToast('Pessoa atualizada.', 'success')
      } else {
        await createMutation.mutateAsync(values)
        showToast('Pessoa cadastrada.', 'success')
      }
      onOpenChange(false)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar pessoa.', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar pessoa' : 'Nova pessoa'}</DialogTitle>
            <DialogDescription>Dados do cliente/tomador do empréstimo.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <TextField label="Nome" required error={errors.name?.message} {...register('name')} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="CPF" placeholder="000.000.000-00" {...register('cpf')} />
                <TextField label="Telefone/WhatsApp" placeholder="(00) 00000-0000" {...register('phone')} />
              </div>
              <TextField label="Endereço" {...register('address')} />
              <TextareaField label="Observações" {...register('notes')} />
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

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/Dialog'
import { PasswordField } from '@/components/ui/form/PasswordField'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { changePasswordSchema, type ChangePasswordFormValues } from './schema'

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const { changePassword } = useAuth()
  const { showToast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) })

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = async (values: ChangePasswordFormValues) => {
    const { error } = await changePassword(values.currentPassword, values.newPassword)
    if (error) {
      setError('currentPassword', { message: error })
      return
    }
    showToast('Senha alterada com sucesso.', 'success')
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>Confirme sua senha atual para definir uma nova.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <PasswordField
                label="Senha atual"
                autoComplete="current-password"
                error={errors.currentPassword?.message}
                {...register('currentPassword')}
              />
              <PasswordField
                label="Nova senha"
                autoComplete="new-password"
                hint="Mínimo 6 caracteres, com letra maiúscula, minúscula e número."
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />
              <PasswordField
                label="Confirmar nova senha"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Salvar nova senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

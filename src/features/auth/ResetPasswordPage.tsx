import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Icon } from '@iconify/react'
import { Lightfall } from '@/components/effects/Lightfall'
import { GlassSurface } from '@/components/effects/GlassSurface'
import { BrandMark } from '@/components/shared/BrandMark'
import { DeveloperCredit } from '@/components/shared/DeveloperCredit'
import { Button } from '@/components/ui/Button'
import { PasswordField } from '@/components/ui/form/PasswordField'
import { useAuth } from '@/context/AuthContext'
import { resetPasswordSchema, type ResetPasswordFormValues } from './schema'

export function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) })

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setFormError(null)
    const { error } = await updatePassword(values.newPassword)
    if (error) {
      setFormError(error)
      return
    }
    setDone(true)
    setTimeout(() => navigate('/', { replace: true }), 1800)
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0">
        <Lightfall
          colors={['#10b981', '#34d399', '#f59e0b']}
          backgroundColor="#0b1f17"
          speed={0.5}
          streakCount={3}
          density={0.6}
          twinkle={1}
          zoom={3}
          glow={1}
          backgroundGlow={0.5}
          mouseInteraction
          mouseStrength={0.5}
          mouseRadius={1}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <BrandMark size="lg" />
          <p className="text-sm text-text-secondary">Defina sua nova senha</p>
        </div>

        <GlassSurface
          borderRadius={20}
          backgroundOpacity={0.4}
          distortionScale={-140}
          blur={14}
          saturation={1.4}
          contentClassName="p-6 sm:p-8"
        >
          {done ? (
            <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success-muted px-3 py-2.5 text-sm text-success">
              <Icon icon="tabler:circle-check" className="size-4 shrink-0" />
              Senha atualizada com sucesso. Redirecionando...
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <h1 className="text-lg font-semibold text-text-primary">Redefinir senha</h1>
              <p className="mt-1 text-sm text-text-secondary">Escolha uma nova senha para acessar sua conta.</p>

              <div className="mt-6 flex flex-col gap-4">
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

              {formError && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-muted px-3 py-2.5 text-sm text-danger">
                  <Icon icon="tabler:alert-circle" className="size-4 shrink-0" />
                  {formError}
                </div>
              )}

              <Button type="submit" className="mt-6 w-full" loading={isSubmitting}>
                Salvar nova senha
              </Button>
            </form>
          )}
        </GlassSurface>

        <DeveloperCredit className="mt-6 text-center" />
      </div>
    </div>
  )
}

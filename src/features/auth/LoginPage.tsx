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
import { TextField } from '@/components/ui/form/TextField'
import { PasswordField } from '@/components/ui/form/PasswordField'
import { useAuth } from '@/context/AuthContext'
import { loginSchema, forgotPasswordSchema, type LoginFormValues, type ForgotPasswordFormValues } from './schema'

export function LoginPage() {
  const { signIn, requestPasswordReset } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [formError, setFormError] = useState<string | null>(null)
  const [forgotSent, setForgotSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const {
    register: registerForgot,
    handleSubmit: handleSubmitForgot,
    formState: { errors: forgotErrors, isSubmitting: isForgotSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null)
    const { error } = await signIn(values.email, values.password)
    if (error) {
      setFormError(error)
      return
    }
    navigate('/', { replace: true })
  }

  const onSubmitForgot = async (values: ForgotPasswordFormValues) => {
    setFormError(null)
    await requestPasswordReset(values.email)
    setForgotSent(true)
  }

  const backToLogin = () => {
    setMode('login')
    setForgotSent(false)
    setFormError(null)
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
          <p className="text-sm text-text-secondary">Gestão de empréstimos e cobranças</p>
        </div>

        <GlassSurface
          borderRadius={20}
          backgroundOpacity={0.4}
          distortionScale={-140}
          blur={14}
          saturation={1.4}
          contentClassName="p-6 sm:p-8"
        >
          {mode === 'login' ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <h1 className="text-lg font-semibold text-text-primary">Entrar</h1>
              <p className="mt-1 text-sm text-text-secondary">Acesse com seu e-mail e senha cadastrados.</p>

              <div className="mt-6 flex flex-col gap-4">
                <TextField
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@email.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <PasswordField
                  label="Senha"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>

              {formError && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-muted px-3 py-2.5 text-sm text-danger">
                  <Icon icon="tabler:alert-circle" className="size-4 shrink-0" />
                  {formError}
                </div>
              )}

              <Button type="submit" className="mt-6 w-full" loading={isSubmitting}>
                Entrar
              </Button>

              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="mt-4 w-full cursor-pointer text-center text-sm text-text-secondary transition-colors hover:text-brand-400"
              >
                Esqueci minha senha
              </button>
            </form>
          ) : (
            <div>
              <h1 className="text-lg font-semibold text-text-primary">Recuperar senha</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Informe seu e-mail para receber um link de redefinição de senha.
              </p>

              {forgotSent ? (
                <div className="mt-6 flex items-start gap-2 rounded-lg border border-success/30 bg-success-muted px-3 py-2.5 text-sm text-success">
                  <Icon icon="tabler:circle-check" className="size-4 shrink-0" />
                  Se o e-mail existir, um link de recuperação foi enviado. Verifique também a caixa de spam.
                </div>
              ) : (
                <form onSubmit={handleSubmitForgot(onSubmitForgot)} className="mt-6">
                  <TextField
                    label="E-mail"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@email.com"
                    error={forgotErrors.email?.message}
                    {...registerForgot('email')}
                  />

                  <Button type="submit" className="mt-6 w-full" loading={isForgotSubmitting}>
                    Enviar link de recuperação
                  </Button>
                </form>
              )}

              <button
                type="button"
                onClick={backToLogin}
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 text-center text-sm text-text-secondary transition-colors hover:text-brand-400"
              >
                <Icon icon="tabler:arrow-left" className="size-4" />
                Voltar ao login
              </button>
            </div>
          )}
        </GlassSurface>

        <DeveloperCredit className="mt-6 text-center" />
      </div>
    </div>
  )
}

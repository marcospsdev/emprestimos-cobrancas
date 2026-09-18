import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
})

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

const newPasswordShape = {
  newPassword: z
    .string()
    .min(6, 'Mínimo de 6 caracteres')
    .regex(/[a-z]/, 'Deve conter ao menos 1 letra minúscula')
    .regex(/[A-Z]/, 'Deve conter ao menos 1 letra maiúscula')
    .regex(/[0-9]/, 'Deve conter ao menos 1 número'),
  confirmPassword: z.string().min(1, 'Confirme a nova senha'),
}

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    ...newPasswordShape,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

export const resetPasswordSchema = z.object(newPasswordShape).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

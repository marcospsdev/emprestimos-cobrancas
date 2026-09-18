import { z } from 'zod'
import { todayISO } from '@/lib/format'

export const paymentSchema = z.object({
  amount: z.number({ error: 'Informe o valor' }).positive('Valor deve ser maior que zero'),
  payment_date: z.string().min(1, 'Informe a data'),
  notes: z.string().optional(),
})

export type PaymentFormValues = z.infer<typeof paymentSchema>

export function emptyPaymentValues(amount: number): PaymentFormValues {
  return { amount, payment_date: todayISO(), notes: '' }
}

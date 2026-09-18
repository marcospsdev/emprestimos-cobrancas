import { z } from 'zod'
import { todayISO } from '@/lib/format'

export const loanSchema = z.object({
  person_id: z.string().min(1, 'Selecione a pessoa'),
  principal_amount: z.number({ error: 'Informe o valor' }).positive('Valor deve ser maior que zero'),
  interest_rate: z.number({ error: 'Informe os juros' }).min(0, 'Juros não pode ser negativo'),
  installments_count: z.number({ error: 'Informe o número de parcelas' }).int().min(1, 'Mínimo de 1 parcela'),
  installment_frequency: z.enum(['mensal', 'quinzenal', 'semanal']),
  first_due_date: z.string().min(1, 'Informe a data do primeiro vencimento'),
})

export type LoanFormValues = z.infer<typeof loanSchema>

export const emptyLoanValues: LoanFormValues = {
  person_id: '',
  principal_amount: 0,
  interest_rate: 0,
  installments_count: 1,
  installment_frequency: 'mensal',
  first_due_date: todayISO(),
}

export const renegotiationSchema = z.object({
  new_installments_count: z.number({ error: 'Informe o número de parcelas' }).int().min(1, 'Mínimo de 1 parcela'),
  new_interest_rate: z.number({ error: 'Informe os juros' }).min(0, 'Juros não pode ser negativo'),
  new_first_due_date: z.string().min(1, 'Informe a data do primeiro vencimento'),
  reason: z.string().optional(),
})

export type RenegotiationFormValues = z.infer<typeof renegotiationSchema>

import { z } from 'zod'
import { todayISO } from '@/lib/format'
import type { Loan } from '@/types/database'

export const loanSchema = z
  .object({
    /** 'existing' = escolhe da lista; 'new' = cadastra a pessoa ali mesmo. */
    person_mode: z.enum(['existing', 'new']),
    person_id: z.string(),
    new_person_name: z.string(),
    new_person_phone: z.string(),
    amount_lent: z.number({ error: 'Informe o valor' }).positive('Informe o valor'),
    /** Juros em % (0 = sem juros). O valor a receber é calculado a partir dele. */
    interest_rate: z.number({ error: 'Informe os juros' }).min(0, 'Os juros não podem ser negativos'),
    loan_date: z.string().min(1, 'Informe a data'),
    due_date: z.string().min(1, 'Informe a data de pagamento'),
    description: z.string(),
    is_paid: z.boolean(),
    paid_at: z.string(),
    payment_method: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.person_mode === 'existing' && !v.person_id) {
      ctx.addIssue({ code: 'custom', path: ['person_id'], message: 'Escolha o cliente' })
    }
    if (v.person_mode === 'new' && !v.new_person_name.trim()) {
      ctx.addIssue({ code: 'custom', path: ['new_person_name'], message: 'Informe o nome do cliente' })
    }
    if (v.is_paid && !v.paid_at) {
      ctx.addIssue({ code: 'custom', path: ['paid_at'], message: 'Informe a data do pagamento' })
    }
  })

export type LoanFormValues = z.infer<typeof loanSchema>

export function emptyLoanValues(personId?: string): LoanFormValues {
  return {
    person_mode: 'existing',
    person_id: personId ?? '',
    new_person_name: '',
    new_person_phone: '',
    amount_lent: 0,
    interest_rate: 0,
    loan_date: todayISO(),
    due_date: '',
    description: '',
    is_paid: false,
    paid_at: '',
    payment_method: '',
  }
}

export function loanToFormValues(loan: Loan): LoanFormValues {
  return {
    person_mode: 'existing',
    person_id: loan.person_id,
    new_person_name: '',
    new_person_phone: '',
    amount_lent: loan.amount_lent,
    interest_rate: loan.interest_rate ?? 0,
    loan_date: loan.loan_date,
    due_date: loan.due_date,
    description: loan.description ?? '',
    is_paid: !!loan.paid_at,
    paid_at: loan.paid_at ?? '',
    payment_method: loan.payment_method ?? '',
  }
}

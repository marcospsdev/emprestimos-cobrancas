import { z } from 'zod'
import { todayISO } from '@/lib/format'
import type { Loan } from '@/types/database'

export const loanSchema = z
  .object({
    title: z.string().trim().min(1, 'Dê um nome para o empréstimo'),
    /** 'existing' = escolhe da lista; 'new' = cadastra a pessoa ali mesmo. */
    person_mode: z.enum(['existing', 'new']),
    person_id: z.string(),
    new_person_name: z.string(),
    new_person_phone: z.string(),
    amount_lent: z.number({ error: 'Informe o valor' }).positive('Informe o valor'),
    amount_to_receive: z.number({ error: 'Informe o valor' }).positive('Informe o valor'),
    loan_date: z.string().min(1, 'Informe a data'),
    due_date: z.string().min(1, 'Informe a data de pagamento'),
    description: z.string(),
    is_paid: z.boolean(),
    paid_at: z.string(),
    payment_method: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.person_mode === 'existing' && !v.person_id) {
      ctx.addIssue({ code: 'custom', path: ['person_id'], message: 'Escolha a pessoa' })
    }
    if (v.person_mode === 'new' && !v.new_person_name.trim()) {
      ctx.addIssue({ code: 'custom', path: ['new_person_name'], message: 'Informe o nome da pessoa' })
    }
    if (v.is_paid && !v.paid_at) {
      ctx.addIssue({ code: 'custom', path: ['paid_at'], message: 'Informe a data do pagamento' })
    }
  })

export type LoanFormValues = z.infer<typeof loanSchema>

export function emptyLoanValues(personId?: string): LoanFormValues {
  return {
    title: '',
    person_mode: 'existing',
    person_id: personId ?? '',
    new_person_name: '',
    new_person_phone: '',
    amount_lent: 0,
    amount_to_receive: 0,
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
    title: loan.title,
    person_mode: 'existing',
    person_id: loan.person_id,
    new_person_name: '',
    new_person_phone: '',
    amount_lent: loan.amount_lent,
    amount_to_receive: loan.amount_to_receive,
    loan_date: loan.loan_date,
    due_date: loan.due_date,
    description: loan.description ?? '',
    is_paid: !!loan.paid_at,
    paid_at: loan.paid_at ?? '',
    payment_method: loan.payment_method ?? '',
  }
}

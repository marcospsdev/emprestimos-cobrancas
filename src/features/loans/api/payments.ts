import { supabase } from '@/lib/supabase'
import type { LoanPayment } from '@/types/database'

// !inner: permite filtrar pelo cliente do empréstimo (loan.person_id).
const PAYMENT_SELECT =
  '*, loan:loans!inner(id, person_id, amount_lent, amount_to_receive, interest_rate, description, paid_at, person:people(id, name, phone))'

export interface PaymentFilters {
  /** Vencimento coberto a partir de (yyyy-MM-dd). */
  from?: string
  to?: string
  personId?: string
  loanId?: string
}

export async function fetchPayments(filters: PaymentFilters = {}): Promise<LoanPayment[]> {
  let query = supabase.from('loan_payments').select(PAYMENT_SELECT).order('due_date', { ascending: true })
  if (filters.from) query = query.gte('due_date', filters.from)
  if (filters.to) query = query.lte('due_date', filters.to)
  if (filters.personId) query = query.eq('loan.person_id', filters.personId)
  if (filters.loanId) query = query.eq('loan_id', filters.loanId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as unknown as LoanPayment[]
}

/** Registra o pagamento dos juros e leva o vencimento para `nextDue` (numa transação só, no banco). */
export async function payInterest(params: {
  loanId: string
  paidAt: string
  paymentMethod: string | null
  nextDue: string
}): Promise<void> {
  const { error } = await supabase.rpc('fn_pay_interest', {
    p_loan_id: params.loanId,
    p_paid_at: params.paidAt,
    p_payment_method: params.paymentMethod ?? '',
    p_next_due: params.nextDue,
  })
  if (error) throw new Error(error.message)
}

/** Desfaz o último pagamento de juros (o vencimento volta para o que era). */
export async function undoInterest(paymentId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_undo_interest', { p_payment_id: paymentId })
  if (error) throw new Error(error.message)
}

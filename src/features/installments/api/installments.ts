import { supabase } from '@/lib/supabase'
import type { InstallmentStatus, InstallmentView, Payment } from '@/types/database'

export interface InstallmentFilters {
  status?: InstallmentStatus
  personId?: string
  loanId?: string
  from?: string
  to?: string
}

export async function fetchInstallments(filters: InstallmentFilters = {}): Promise<InstallmentView[]> {
  let query = supabase.from('v_installments').select('*').order('due_date', { ascending: true })
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.personId) query = query.eq('person_id', filters.personId)
  if (filters.loanId) query = query.eq('loan_id', filters.loanId)
  if (filters.from) query = query.gte('due_date', filters.from)
  if (filters.to) query = query.lte('due_date', filters.to)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as InstallmentView[]
}

export interface RegisterPaymentPayload {
  installment_id: string
  amount: number
  payment_date?: string
  notes?: string
}

export async function registerPayment(payload: RegisterPaymentPayload): Promise<Payment> {
  const { data, error } = await supabase.rpc('fn_register_payment', {
    p_installment_id: payload.installment_id,
    p_amount: payload.amount,
    p_payment_date: payload.payment_date ?? new Date().toISOString().slice(0, 10),
    p_notes: payload.notes ?? '',
  })
  if (error) throw new Error(error.message)
  return data as Payment
}

export async function fetchPaymentsByLoan(loanId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('loan_id', loanId)
    .order('payment_date', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Payment[]
}

export async function fetchPaymentsByPerson(personId: string): Promise<Payment[]> {
  const { data: loanIds, error: loanError } = await supabase.from('loans').select('id').eq('person_id', personId)
  if (loanError) throw new Error(loanError.message)
  const ids = (loanIds ?? []).map((l) => l.id)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .in('loan_id', ids)
    .order('payment_date', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Payment[]
}

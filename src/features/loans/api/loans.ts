import { supabase } from '@/lib/supabase'
import type { InstallmentFrequency, Loan, LoanStatus } from '@/types/database'

export interface LoanFilters {
  status?: LoanStatus
  personId?: string
}

export async function fetchLoans(filters: LoanFilters = {}): Promise<Loan[]> {
  let query = supabase
    .from('loans')
    .select('*, person:people(id, name, phone)')
    .order('created_at', { ascending: false })
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.personId) query = query.eq('person_id', filters.personId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as unknown as Loan[]
}

export async function fetchLoan(id: string): Promise<Loan> {
  const { data, error } = await supabase.from('loans').select('*, person:people(id, name, phone)').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data as unknown as Loan
}

export interface CreateLoanPayload {
  person_id: string
  principal_amount: number
  interest_rate: number
  installments_count: number
  first_due_date: string
  installment_frequency?: InstallmentFrequency
}

export async function createLoan(payload: CreateLoanPayload): Promise<Loan> {
  const { data, error } = await supabase.rpc('fn_create_loan', {
    p_person_id: payload.person_id,
    p_principal_amount: payload.principal_amount,
    p_interest_rate: payload.interest_rate,
    p_installments_count: payload.installments_count,
    p_first_due_date: payload.first_due_date,
    p_installment_frequency: payload.installment_frequency ?? 'mensal',
  })
  if (error) throw new Error(error.message)
  return data as Loan
}

export interface RenegotiateLoanPayload {
  loan_id: string
  new_installments_count: number
  new_first_due_date: string
  new_interest_rate: number
  reason?: string
  new_installment_frequency?: InstallmentFrequency
}

export async function renegotiateLoan(payload: RenegotiateLoanPayload): Promise<Loan> {
  const { data, error } = await supabase.rpc('fn_renegotiate_loan', {
    p_loan_id: payload.loan_id,
    p_new_installments_count: payload.new_installments_count,
    p_new_first_due_date: payload.new_first_due_date,
    p_new_interest_rate: payload.new_interest_rate,
    p_reason: payload.reason ?? '',
    p_new_installment_frequency: payload.new_installment_frequency ?? 'mensal',
  })
  if (error) throw new Error(error.message)
  return data as Loan
}

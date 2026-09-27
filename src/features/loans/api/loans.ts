import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/format'
import type { Loan, LoanInput } from '@/types/database'

const LOAN_SELECT = '*, person:people(id, name, phone)'

export interface LoanFilters {
  /** Data combinada de pagamento a partir de (yyyy-MM-dd). */
  from?: string
  to?: string
  personId?: string
  /** Só os não pagos com data já vencida, de qualquer mês. */
  overdueOnly?: boolean
}

export async function fetchLoans(filters: LoanFilters = {}): Promise<Loan[]> {
  let query = supabase.from('loans').select(LOAN_SELECT).order('due_date', { ascending: true })
  if (filters.from) query = query.gte('due_date', filters.from)
  if (filters.to) query = query.lte('due_date', filters.to)
  if (filters.personId) query = query.eq('person_id', filters.personId)
  if (filters.overdueOnly) query = query.is('paid_at', null).lt('due_date', todayISO())
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as unknown as Loan[]
}

/** A pessoa escolhida não existe mais no banco (excluída, ou lista desatualizada na tela). */
export class PersonNotFoundError extends Error {
  constructor() {
    super('Essa pessoa não existe mais. Escolha a pessoa de novo.')
    this.name = 'PersonNotFoundError'
  }
}

function toLoanError(error: { code?: string; message: string }): Error {
  // 23503 = violação de chave estrangeira em person_id.
  return error.code === '23503' ? new PersonNotFoundError() : new Error(error.message)
}

export async function createLoan(payload: LoanInput): Promise<Loan> {
  const { data, error } = await supabase.from('loans').insert(payload).select(LOAN_SELECT).single()
  if (error) throw toLoanError(error)
  return data as unknown as Loan
}

export async function updateLoan(id: string, payload: Partial<LoanInput>): Promise<Loan> {
  const { data, error } = await supabase.from('loans').update(payload).eq('id', id).select(LOAN_SELECT).single()
  if (error) throw toLoanError(error)
  return data as unknown as Loan
}

export async function deleteLoan(id: string): Promise<void> {
  const { error } = await supabase.from('loans').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

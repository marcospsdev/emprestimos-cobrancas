import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/format'
import type { Expense, ExpenseInput, FixedExpense, FixedExpenseInput } from '@/types/database'

export interface ExpenseFilters {
  /** Data do gasto a partir de (yyyy-MM-dd). */
  from?: string
  to?: string
  /** Só as não pagas com data já vencida, de qualquer mês. */
  overdueOnly?: boolean
}

/**
 * Antes de listar, lança as contas fixas que ainda faltam até o fim do período
 * (o banco limita ao mês que vem e nunca lança duas vezes no mesmo mês).
 */
export async function fetchExpenses(filters: ExpenseFilters = {}): Promise<Expense[]> {
  if (filters.to) {
    const gen = await supabase.rpc('fn_generate_fixed_expenses', { p_until: filters.to })
    // Se a geração falhar, ainda mostra o que já existe.
    if (gen.error) console.warn('fn_generate_fixed_expenses:', gen.error.message)
  }
  let query = supabase.from('expenses').select('*').order('due_date', { ascending: true })
  if (filters.from) query = query.gte('due_date', filters.from)
  if (filters.to) query = query.lte('due_date', filters.to)
  if (filters.overdueOnly) query = query.is('paid_at', null).lt('due_date', todayISO())
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Expense[]).map((e) => ({ ...e, amount: Number(e.amount) }))
}

function toExpenseError(error: { code?: string; message: string }): Error {
  // 23505 = a mesma conta fixa já tem lançamento neste mês.
  if (error.code === '23505') return new Error('Essa conta fixa já está lançada nesse mês.')
  return new Error(error.message)
}

export async function createExpense(payload: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').insert(payload).select().single()
  if (error) throw toExpenseError(error)
  return data as Expense
}

export async function updateExpense(id: string, payload: Partial<ExpenseInput>): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').update(payload).eq('id', id).select().single()
  if (error) throw toExpenseError(error)
  return data as Expense
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function fetchFixedExpense(id: string): Promise<FixedExpense> {
  const { data, error } = await supabase.from('fixed_expenses').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return { ...(data as FixedExpense), amount: Number((data as FixedExpense).amount) }
}

export async function createFixedExpense(payload: FixedExpenseInput): Promise<FixedExpense> {
  const { data, error } = await supabase.from('fixed_expenses').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as FixedExpense
}

/**
 * Muda a conta fixa daqui para frente: o modelo e as despesas ainda não pagas
 * dos meses seguintes a `afterMonth` (yyyy-MM-01).
 */
export async function updateFixedExpense(
  id: string,
  payload: Pick<FixedExpenseInput, 'description' | 'category' | 'amount' | 'due_day'>,
  afterMonth: string,
): Promise<void> {
  const { error } = await supabase.from('fixed_expenses').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
  const { error: futureError } = await supabase
    .from('expenses')
    .update({ description: payload.description, category: payload.category, amount: payload.amount })
    .eq('fixed_expense_id', id)
    .gt('ref_month', afterMonth)
    .is('paid_at', null)
  if (futureError) throw new Error(futureError.message)
}

/** Volta a repetir uma conta fixa que tinha parado. */
export async function resumeFixedExpense(id: string): Promise<void> {
  const { error } = await supabase.from('fixed_expenses').update({ end_month: null }).eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Para de repetir: `lastMonth` (yyyy-MM-01) é o último mês que fica. Lançamentos
 * não pagos de meses depois dele são apagados (os pagos ficam no histórico).
 */
export async function stopFixedExpense(id: string, lastMonth: string): Promise<void> {
  const { error } = await supabase.from('fixed_expenses').update({ end_month: lastMonth }).eq('id', id)
  if (error) throw new Error(error.message)
  const { error: deleteError } = await supabase
    .from('expenses')
    .delete()
    .eq('fixed_expense_id', id)
    .gt('ref_month', lastMonth)
    .is('paid_at', null)
  if (deleteError) throw new Error(deleteError.message)
}

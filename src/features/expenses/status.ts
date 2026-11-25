import { todayISO } from '@/lib/format'
import type { Expense, LoanStatus } from '@/types/database'
import { getCategory } from './categories'

/**
 * Mesma regra (e mesmas cores) dos empréstimos, com textos de despesa:
 * azul = a pagar, vermelho = atrasada, verde = paga.
 */
export type ExpenseStatus = LoanStatus

export function getExpenseStatus(expense: Pick<Expense, 'paid_at' | 'due_date'>, today = todayISO()): ExpenseStatus {
  if (expense.paid_at) return 'pago'
  return expense.due_date < today ? 'atrasado' : 'pendente'
}

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  pendente: 'A pagar',
  atrasado: 'Atrasada',
  pago: 'Paga',
}

export interface ExpenseTotals {
  total: number
  paid: number
  /** A pagar dentro do prazo. */
  pending: number
  overdue: number
  count: number
  overdueCount: number
}

export function summarizeExpenses(expenses: Expense[], today = todayISO()): ExpenseTotals {
  const t: ExpenseTotals = { total: 0, paid: 0, pending: 0, overdue: 0, count: 0, overdueCount: 0 }
  for (const e of expenses) {
    const amount = Number(e.amount)
    t.total += amount
    t.count += 1
    const status = getExpenseStatus(e, today)
    if (status === 'pago') t.paid += amount
    else if (status === 'atrasado') {
      t.overdue += amount
      t.overdueCount += 1
    } else t.pending += amount
  }
  return t
}

export interface CategoryTotal {
  key: string
  label: string
  icon: string
  total: number
  count: number
  /** Parte do total (0–100). */
  percent: number
}

/** Quanto foi gasto em cada categoria, do maior para o menor. */
export function totalsByCategory(expenses: Expense[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>()
  let sum = 0
  for (const e of expenses) {
    const cat = getCategory(e.category)
    const row = map.get(cat.key) ?? { key: cat.key, label: cat.label, icon: cat.icon, total: 0, count: 0, percent: 0 }
    row.total += Number(e.amount)
    row.count += 1
    sum += Number(e.amount)
    map.set(cat.key, row)
  }
  const list = [...map.values()].sort((a, b) => b.total - a.total)
  for (const row of list) row.percent = sum > 0 ? (row.total / sum) * 100 : 0
  return list
}

/** A pagar primeiro (atrasadas no topo, por data), pagas no fim (mais recentes antes). */
export function sortExpenses(expenses: Expense[], today = todayISO()): Expense[] {
  const rank: Record<ExpenseStatus, number> = { atrasado: 0, pendente: 1, pago: 2 }
  return [...expenses].sort((a, b) => {
    const sa = getExpenseStatus(a, today)
    const sb = getExpenseStatus(b, today)
    if (sa !== sb) return rank[sa] - rank[sb]
    if (sa === 'pago') return b.due_date.localeCompare(a.due_date)
    return a.due_date.localeCompare(b.due_date)
  })
}

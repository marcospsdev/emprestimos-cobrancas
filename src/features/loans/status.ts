import { todayISO } from '@/lib/format'
import type { Loan, LoanStatus } from '@/types/database'

/**
 * Regra única de status, calculada na data LOCAL do aparelho:
 * - pago: tem data de pagamento marcada
 * - atrasado: não pago e a data combinada já passou
 * - pendente ("A receber"): não pago e ainda dentro do prazo (inclui vencer hoje)
 */
export function getLoanStatus(loan: Pick<Loan, 'paid_at' | 'due_date'>, today = todayISO()): LoanStatus {
  if (loan.paid_at) return 'pago'
  return loan.due_date < today ? 'atrasado' : 'pendente'
}

export const STATUS_LABEL: Record<LoanStatus, string> = {
  pendente: 'A receber',
  atrasado: 'Atrasado',
  pago: 'Pago',
}

/** Ordem de leitura usada na legenda e nos filtros. */
export const STATUS_ORDER: LoanStatus[] = ['pendente', 'atrasado', 'pago']

/** Cor de cada status (fonte única): azul = a receber, vermelho = atrasado, verde = pago. */
export const STATUS_BADGE_VARIANT: Record<LoanStatus, 'info' | 'danger' | 'success'> = {
  pendente: 'info',
  atrasado: 'danger',
  pago: 'success',
}

/** Fundo sólido na cor do status — barra lateral da linha e bolinha da legenda. */
export const STATUS_BG_CLASS: Record<LoanStatus, string> = {
  pendente: 'bg-info',
  atrasado: 'bg-danger',
  pago: 'bg-success',
}

export interface LoanTotals {
  count: number
  /** Soma do "a receber" de tudo (pago ou não). */
  expected: number
  received: number
  pending: number
  overdue: number
  overdueCount: number
  pendingCount: number
  paidCount: number
  lent: number
  /** Lucro já realizado: a receber − emprestado dos que foram pagos. */
  profit: number
}

export function summarizeLoans(loans: Loan[], today = todayISO()): LoanTotals {
  const totals: LoanTotals = {
    count: loans.length,
    expected: 0,
    received: 0,
    pending: 0,
    overdue: 0,
    overdueCount: 0,
    pendingCount: 0,
    paidCount: 0,
    lent: 0,
    profit: 0,
  }
  for (const loan of loans) {
    const status = getLoanStatus(loan, today)
    totals.expected += loan.amount_to_receive
    totals.lent += loan.amount_lent
    if (status === 'pago') {
      totals.received += loan.amount_to_receive
      totals.profit += loan.amount_to_receive - loan.amount_lent
      totals.paidCount++
    } else if (status === 'atrasado') {
      totals.overdue += loan.amount_to_receive
      totals.overdueCount++
    } else {
      totals.pending += loan.amount_to_receive
      totals.pendingCount++
    }
  }
  return totals
}

/** Ordem de exibição: atrasados primeiro, depois a receber (por data), pagos por último. */
export function sortLoans(loans: Loan[], today = todayISO()): Loan[] {
  const rank: Record<LoanStatus, number> = { atrasado: 0, pendente: 1, pago: 2 }
  return [...loans].sort((a, b) => {
    const diff = rank[getLoanStatus(a, today)] - rank[getLoanStatus(b, today)]
    if (diff !== 0) return diff
    return a.due_date.localeCompare(b.due_date)
  })
}

export const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Transferência', 'Cartão', 'Outro'] as const

import { formatCurrency, todayISO } from '@/lib/format'
import { addMonths, format, parseISO } from 'date-fns'
import type { Loan, LoanPayment, LoanStatus } from '@/types/database'

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

/** Ícone de cada status — junto com cor e texto (nunca só cor). */
export const STATUS_ICON: Record<LoanStatus, string> = {
  pendente: 'tabler:clock',
  atrasado: 'tabler:alert-triangle',
  pago: 'tabler:circle-check',
}

/** Texto na cor do status (valores, totais, contadores). */
export const STATUS_TEXT_CLASS: Record<LoanStatus, string> = {
  pendente: 'text-info',
  atrasado: 'text-danger',
  pago: 'text-success',
}

/** Filtro selecionado: na cor do próprio status (não no verde da marca, que confundiria com "pago"). */
export const STATUS_CHIP_ACTIVE_CLASS: Record<LoanStatus, string> = {
  pendente: 'border-info bg-info-muted text-info',
  atrasado: 'border-danger bg-danger-muted text-danger',
  pago: 'border-success bg-success-muted text-success',
}

/** Fundo da linha da lista: atrasado ganha um tom vermelho leve para saltar aos olhos. */
export const STATUS_ROW_CLASS: Record<LoanStatus, string> = {
  pendente: '',
  atrasado: 'bg-danger/[0.07]',
  pago: '',
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
  /** Lucro já realizado: juros dos quitados + pagamentos só de juros. */
  profit: number
  /** Quantos pagamentos só de juros entraram na conta. */
  interestPaymentCount: number
}

/**
 * Totais de uma lista de empréstimos. Os pagamentos só de juros (`payments`)
 * contam como recebidos e lucro no mês do vencimento que cobriram.
 */
export function summarizeLoans(loans: Loan[], today = todayISO(), payments: LoanPayment[] = []): LoanTotals {
  const totals: LoanTotals = {
    count: loans.length + payments.length,
    expected: 0,
    received: 0,
    pending: 0,
    overdue: 0,
    overdueCount: 0,
    pendingCount: 0,
    paidCount: 0,
    lent: 0,
    profit: 0,
    interestPaymentCount: payments.length,
  }
  for (const p of payments) {
    totals.expected += p.amount
    totals.received += p.amount
    totals.profit += p.amount
    totals.paidCount++
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

/** Valor só dos juros de um vencimento (a receber − emprestado). */
export function interestAmount(loan: Pick<Loan, 'amount_lent' | 'amount_to_receive'>): number {
  return Math.max(0, Math.round((loan.amount_to_receive - loan.amount_lent) * 100) / 100)
}

/** Próximo vencimento ao pagar só os juros: mesmo dia, mês seguinte. */
export function nextMonthlyDue(dueDate: string): string {
  return format(addMonths(parseISO(dueDate), 1), 'yyyy-MM-dd')
}

/** Total a receber com os juros do empréstimo, arredondado em centavos. */
export function computeAmountToReceive(amountLent: number, interestRate: number): number {
  return Math.round((amountLent || 0) * (1 + (interestRate || 0) / 100) * 100) / 100
}

/** "10%" / "12,5%" — vazio quando não tem juros. */
export function formatInterestRate(rate: number | null | undefined): string {
  if (!rate) return ''
  return `${rate.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

/** Como chamar o empréstimo em avisos e confirmações: "Empréstimo de João". */
export function loanLabel(loan: Pick<Loan, 'amount_lent' | 'person'>): string {
  const name = loan.person?.name?.trim()
  return name ? `Empréstimo de ${name}` : `Empréstimo de ${formatCurrency(loan.amount_lent)}`
}

export const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Transferência', 'Cartão', 'Outro'] as const

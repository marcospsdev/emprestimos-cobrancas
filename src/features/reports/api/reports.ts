import { supabase } from '@/lib/supabase'

export interface PaymentReportRow {
  id: string
  payment_date: string
  person_name: string
  amount: number
  interest_share: number
}

export async function fetchPaymentsReport(from: string, to: string): Promise<PaymentReportRow[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id, payment_date, amount, installment:installments(amount, interest_amount, loan:loans(person:people(name)))')
    .gte('payment_date', from)
    .lte('payment_date', to)
    .order('payment_date', { ascending: false })
  if (error) throw new Error(error.message)

  type Row = {
    id: string
    payment_date: string
    amount: number
    installment: { amount: number; interest_amount: number; loan: { person: { name: string } | null } | null } | null
  }

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const installmentAmount = row.installment?.amount ?? 0
    const interestAmount = row.installment?.interest_amount ?? 0
    const interestShare = installmentAmount > 0 ? row.amount * (interestAmount / installmentAmount) : 0
    return {
      id: row.id,
      payment_date: row.payment_date,
      person_name: row.installment?.loan?.person?.name ?? '—',
      amount: row.amount,
      interest_share: Math.round(interestShare * 100) / 100,
    }
  })
}

export interface LoanReportRow {
  id: string
  created_at: string
  principal_amount: number
  total_amount: number
  interest_rate: number
  status: string
  person_name: string
}

export async function fetchLoansReport(from: string, to: string): Promise<LoanReportRow[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('id, created_at, principal_amount, total_amount, interest_rate, status, person:people(name)')
    .gte('created_at', from)
    .lte('created_at', `${to}T23:59:59`)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  type Row = {
    id: string
    created_at: string
    principal_amount: number
    total_amount: number
    interest_rate: number
    status: string
    person: { name: string } | null
  }

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    principal_amount: row.principal_amount,
    total_amount: row.total_amount,
    interest_rate: row.interest_rate,
    status: row.status,
    person_name: row.person?.name ?? '—',
  }))
}

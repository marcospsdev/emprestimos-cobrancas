import { format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import type { DashboardSummary, InstallmentView } from '@/types/database'

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc('fn_dashboard_summary')
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  return (
    row ?? {
      total_emprestado: 0,
      total_recebido: 0,
      total_a_receber: 0,
      juros_recebidos: 0,
      juros_a_receber: 0,
      valores_em_atraso: 0,
      emprestimos_ativos: 0,
      proximos_vencimentos: 0,
    }
  ) as DashboardSummary
}

export interface InterestByMonthPoint {
  month: string
  label: string
  juros: number
}

export async function fetchInterestByMonth(monthsBack = 6): Promise<InterestByMonthPoint[]> {
  const { data, error } = await supabase.rpc('fn_interest_by_month', { p_months_back: monthsBack })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Array<{ month: string; juros: number }>

  const months: InterestByMonthPoint[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = startOfMonth(subMonths(new Date(), i))
    const key = format(date, 'yyyy-MM-dd')
    const juros = rows.find((r) => r.month.slice(0, 10) === key)?.juros ?? 0
    months.push({ month: key, label: format(date, 'MMM/yy', { locale: ptBR }), juros })
  }
  return months
}

export async function fetchUpcomingInstallments(limit = 5): Promise<InstallmentView[]> {
  const { data, error } = await supabase
    .from('v_installments')
    .select('*')
    .eq('status', 'pendente')
    .order('due_date', { ascending: true })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data as InstallmentView[]
}

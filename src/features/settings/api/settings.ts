import { subMonths, format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Settings } from '@/types/database'

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('*').single()
  if (error) throw new Error(error.message)
  return data as Settings
}

export interface UpdateSettingsPayload {
  late_fee_percent: number
  daily_interest_percent: number
}

export async function updateSettings(payload: UpdateSettingsPayload): Promise<Settings> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão inválida')

  const { data, error } = await supabase
    .from('settings')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Settings
}

export interface TableUsage {
  table: string
  label: string
  count: number
  softLimit: number
}

const TABLES: Array<{ table: string; label: string; softLimit: number }> = [
  { table: 'people', label: 'Pessoas', softLimit: 2000 },
  { table: 'loans', label: 'Empréstimos', softLimit: 10000 },
  { table: 'installments', label: 'Parcelas', softLimit: 60000 },
  { table: 'payments', label: 'Pagamentos', softLimit: 60000 },
]

export async function fetchTableUsage(): Promise<TableUsage[]> {
  const results = await Promise.all(
    TABLES.map(async ({ table, label, softLimit }) => {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
      if (error) throw new Error(error.message)
      return { table, label, count: count ?? 0, softLimit }
    }),
  )
  return results
}

export interface CleanupCandidate {
  key: string
  label: string
  description: string
  count: number
}

const OLD_LOANS_CUTOFF_MONTHS = 60

export async function fetchCleanupCandidates(): Promise<CleanupCandidate[]> {
  const cutoff = format(subMonths(new Date(), OLD_LOANS_CUTOFF_MONTHS), 'yyyy-MM-dd')

  const { count, error } = await supabase
    .from('loans')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'quitado')
    .lt('created_at', cutoff)
  if (error) throw new Error(error.message)

  return [
    {
      key: 'old_settled_loans',
      label: 'Empréstimos quitados muito antigos',
      description: `Quitados há mais de ${OLD_LOANS_CUTOFF_MONTHS / 12} anos — histórico financeiro real, revise antes de excluir`,
      count: count ?? 0,
    },
  ]
}

export async function runCleanup(key: string): Promise<void> {
  if (key === 'old_settled_loans') {
    const cutoff = format(subMonths(new Date(), OLD_LOANS_CUTOFF_MONTHS), 'yyyy-MM-dd')
    const { error } = await supabase.from('loans').delete().eq('status', 'quitado').lt('created_at', cutoff)
    if (error) throw new Error(error.message)
    return
  }
  throw new Error('Rotina de limpeza desconhecida')
}

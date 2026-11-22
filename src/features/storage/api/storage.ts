import { subDays, subMonths, format } from 'date-fns'
import { supabase } from '@/lib/supabase'

/** Limite do banco no plano gratuito do Supabase. */
export const FREE_PLAN_DB_BYTES = 500 * 1024 * 1024

export interface TableUsage {
  table: string
  label: string
  description: string
  icon: string
  count: number
  bytes: number | null
}

const TABLES: Omit<TableUsage, 'count' | 'bytes'>[] = [
  { table: 'people', label: 'Clientes', description: 'Nome, WhatsApp e observações', icon: 'tabler:users' },
  { table: 'loans', label: 'Empréstimos', description: 'Todos os empréstimos, pagos ou não', icon: 'tabler:coins' },
  { table: 'loan_payments', label: 'Pagamentos de juros', description: 'Cada mês pago só nos juros', icon: 'tabler:calendar-repeat' },
  { table: 'notification_log', label: 'Avisos enviados', description: 'Registro dos avisos de vencimento', icon: 'tabler:bell' },
  { table: 'push_devices', label: 'Aparelhos com avisos', description: 'Celulares e navegadores cadastrados', icon: 'tabler:device-mobile' },
]

export interface StorageUsage {
  /** Tamanho real do banco inteiro (inclui a estrutura interna do Supabase). null = função não instalada. */
  databaseBytes: number | null
  tables: TableUsage[]
}

export async function fetchStorageUsage(): Promise<StorageUsage> {
  const [sizes, ...counts] = await Promise.all([
    supabase.rpc('fn_storage_usage'),
    ...TABLES.map((t) => supabase.from(t.table).select('*', { count: 'exact', head: true })),
  ])

  // Sem a migração de armazenamento, mostra só as contagens.
  const data = sizes.error ? null : (sizes.data as { database_bytes: number; tables: { table: string; bytes: number }[] | null })
  const bytesByTable = new Map((data?.tables ?? []).map((t) => [t.table, t.bytes]))

  return {
    databaseBytes: data?.database_bytes ?? null,
    tables: TABLES.map((t, i) => ({
      ...t,
      count: counts[i].error ? 0 : (counts[i].count ?? 0),
      bytes: bytesByTable.get(t.table) ?? null,
    })),
  }
}

// ---------------- Limpeza ----------------

export type CleanupKey = 'old_notifications' | 'stale_devices' | 'old_paid_loans'

export interface CleanupCandidate {
  key: CleanupKey
  label: string
  description: string
  /** O que NÃO muda (para a pessoa ficar tranquila) ou o que se perde. */
  impact: string
  icon: string
  tone: 'safe' | 'danger'
  count: number
}

const NOTIFICATIONS_CUTOFF_DAYS = 90
const DEVICES_CUTOFF_MONTHS = 6
const PAID_LOANS_CUTOFF_MONTHS = 12

const cutoffs = () => ({
  notifications: subDays(new Date(), NOTIFICATIONS_CUTOFF_DAYS).toISOString(),
  devices: subMonths(new Date(), DEVICES_CUTOFF_MONTHS).toISOString(),
  paidLoans: format(subMonths(new Date(), PAID_LOANS_CUTOFF_MONTHS), 'yyyy-MM-dd'),
})

export async function fetchCleanupCandidates(): Promise<CleanupCandidate[]> {
  const c = cutoffs()
  const [notifications, devices, paidLoans] = await Promise.all([
    supabase.from('notification_log').select('*', { count: 'exact', head: true }).lt('sent_at', c.notifications),
    supabase.from('push_devices').select('*', { count: 'exact', head: true }).lt('last_seen_at', c.devices),
    supabase.from('loans').select('*', { count: 'exact', head: true }).not('paid_at', 'is', null).lt('paid_at', c.paidLoans),
  ])
  return [
    {
      key: 'old_notifications',
      label: 'Avisos enviados antigos',
      description: `Registro de avisos com mais de ${NOTIFICATIONS_CUTOFF_DAYS} dias`,
      impact: 'Seguro: nenhum empréstimo ou cliente é alterado.',
      icon: 'tabler:bell-minus',
      tone: 'safe',
      count: notifications.count ?? 0,
    },
    {
      key: 'stale_devices',
      label: 'Aparelhos sem uso',
      description: `Aparelhos que não abrem o sistema há mais de ${DEVICES_CUTOFF_MONTHS} meses`,
      impact: 'Seguro: se um deles voltar a abrir o sistema, ele é cadastrado de novo sozinho.',
      icon: 'tabler:device-mobile-off',
      tone: 'safe',
      count: devices.count ?? 0,
    },
    {
      key: 'old_paid_loans',
      label: 'Empréstimos quitados há mais de 1 ano',
      description: `Quitados antes de ${format(subMonths(new Date(), PAID_LOANS_CUTOFF_MONTHS), 'dd/MM/yyyy')}, com os juros pagos deles`,
      impact: 'Atenção: eles somem do histórico, do resumo e dos relatórios desses meses. Os clientes continuam.',
      icon: 'tabler:archive-off',
      tone: 'danger',
      count: paidLoans.count ?? 0,
    },
  ]
}

export async function runCleanup(key: CleanupKey): Promise<void> {
  const c = cutoffs()
  const query =
    key === 'old_notifications'
      ? supabase.from('notification_log').delete().lt('sent_at', c.notifications)
      : key === 'stale_devices'
        ? supabase.from('push_devices').delete().lt('last_seen_at', c.devices)
        : // Os pagamentos de juros e avisos desses empréstimos saem junto (ON DELETE CASCADE).
          supabase.from('loans').delete().not('paid_at', 'is', null).lt('paid_at', c.paidLoans)
  const { error } = await query
  if (error) throw new Error(error.message)
}

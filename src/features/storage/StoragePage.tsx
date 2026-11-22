import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { FREE_PLAN_DB_BYTES, type CleanupCandidate } from './api/storage'
import { useCleanupCandidatesQuery, useRunCleanup, useStorageUsageQuery } from './api/useStorage'

/** Limites oficiais do plano gratuito do Supabase (supabase.com/pricing), só como referência. */
const FREE_PLAN_LIMITS = [
  { label: 'Banco de dados', value: '500 MB', icon: 'tabler:database', note: 'Onde ficam clientes, empréstimos e pagamentos.' },
  { label: 'Arquivos', value: '1 GB', icon: 'tabler:folder', note: 'Não usado por este sistema.' },
  { label: 'Usuários por mês', value: '50.000', icon: 'tabler:users', note: 'Sem risco: o sistema tem poucos usuários.' },
  { label: 'Tráfego por mês', value: '5 GB', icon: 'tabler:arrows-up-down', note: 'Dados enviados para o celular e o computador.' },
  { label: 'Funções (avisos)', value: '500 mil/mês', icon: 'tabler:bell', note: 'O aviso das 8h usa 1 por dia.' },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB`
  return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}

export function StoragePage() {
  const usage = useStorageUsageQuery()
  const candidates = useCleanupCandidatesQuery()
  const refreshing = usage.isFetching || candidates.isFetching

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Armazenamento"
        description="Quanto espaço o sistema está usando e limpeza de dados antigos."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              void usage.refetch()
              void candidates.refetch()
            }}
            disabled={refreshing}
            className="w-full sm:w-auto"
          >
            <Icon icon="tabler:refresh" className={cn('size-4.5', refreshing && 'animate-spin')} />
            Atualizar
          </Button>
        }
      />

      <DatabaseUsageCard bytes={usage.data?.databaseBytes ?? null} loading={usage.isLoading} />

      {/* Seus dados */}
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-text-primary">Seus dados</h2>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {usage.isLoading || !usage.data
            ? Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="p-4">
                  <Skeleton className="h-10 w-full" />
                </li>
              ))
            : usage.data.tables.map((t) => (
                <li key={t.table} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-text-secondary">
                    <Icon icon={t.icon} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-text-primary sm:text-sm">{t.label}</p>
                    <p className="truncate text-sm text-text-muted sm:text-xs">{t.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold text-text-primary sm:text-sm">{t.count.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-text-muted">{t.bytes != null ? formatBytes(t.bytes) : 'registros'}</p>
                  </div>
                </li>
              ))}
        </ul>
      </section>

      <CleanupSection candidates={candidates.data} loading={candidates.isLoading} />

      {/* Referência do plano */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text-primary">Limites do plano gratuito</h2>
          <span className="rounded-full border border-border-strong px-2.5 py-0.5 text-xs font-medium text-text-secondary">Supabase Free</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FREE_PLAN_LIMITS.map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
              <Icon icon={item.icon} className="mt-0.5 size-5 shrink-0 text-text-muted" />
              <div className="min-w-0">
                <p className="text-sm text-text-secondary">{item.label}</p>
                <p className="text-lg font-semibold text-text-primary">{item.value}</p>
                <p className="mt-0.5 text-sm text-text-muted sm:text-xs">{item.note}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-text-muted sm:text-xs">
          Se um dia precisar de mais espaço, o plano Pro do Supabase custa US$ 25/mês e inclui 8 GB de banco.
        </p>
      </section>
    </div>
  )
}

/** Uso real do banco: "X MB de 500 MB", com barra e cor pelo nível de uso. */
function DatabaseUsageCard({ bytes, loading }: { bytes: number | null; loading: boolean }) {
  if (loading) return <Skeleton className="h-36 w-full rounded-2xl" />

  if (bytes == null) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5 text-sm text-text-secondary">
        O tamanho em MB aparece aqui depois que a migração de armazenamento for aplicada no Supabase. Enquanto isso, veja
        a quantidade de registros abaixo.
      </div>
    )
  }

  const percent = Math.min(100, (bytes / FREE_PLAN_DB_BYTES) * 100)
  const level = percent >= 90 ? 'danger' : percent >= 70 ? 'warning' : 'ok'
  const message =
    level === 'danger'
      ? 'Quase cheio. Faça uma limpeza abaixo ou considere o plano pago.'
      : level === 'warning'
        ? 'Uso alto. Vale fazer uma limpeza de dados antigos.'
        : 'Tem espaço de sobra.'

  return (
    <div
      className={cn(
        'rounded-2xl border p-5',
        level === 'danger' ? 'border-danger/40 bg-danger-muted' : level === 'warning' ? 'border-warning/40 bg-warning-muted' : 'border-border bg-surface',
      )}
    >
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <Icon icon="tabler:database" className="size-4.5" />
        Espaço usado no banco
      </p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
        {formatBytes(bytes)} <span className="text-base font-medium text-text-secondary">de 500 MB</span>
      </p>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-elevated">
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', level === 'danger' ? 'bg-danger' : level === 'warning' ? 'bg-warning' : 'bg-brand-500')}
          style={{ width: `${Math.max(percent, 1)}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        <span className="font-semibold text-text-primary">{percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span> usado · {message}
      </p>
      <p className="mt-1 text-xs text-text-muted">Inclui a estrutura interna do Supabase, que ocupa parte do espaço mesmo sem dados.</p>
    </div>
  )
}

function CleanupSection({ candidates, loading }: { candidates: CleanupCandidate[] | undefined; loading: boolean }) {
  const run = useRunCleanup()
  const confirm = useConfirm()
  const { showToast } = useToast()

  const handle = async (c: CleanupCandidate) => {
    const ok = await confirm({
      title: `Limpar ${c.label.toLowerCase()}?`,
      description: `${c.count.toLocaleString('pt-BR')} registro(s) serão apagados para sempre. ${c.impact}`,
      confirmLabel: 'Apagar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await run.mutateAsync(c.key)
      showToast(`${c.count.toLocaleString('pt-BR')} registro(s) apagados.`, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao limpar.', 'error')
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Limpeza de dados antigos</h2>
        <p className="mt-0.5 text-sm text-text-secondary">
          Só é preciso quando o espaço estiver acabando. Cada limpeza mostra quantos registros serão apagados antes de
          confirmar.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {loading || !candidates
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
          : candidates.map((c) => (
              <li key={c.key} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-full',
                      c.tone === 'danger' ? 'bg-danger-muted text-danger' : 'bg-surface-elevated text-text-secondary',
                    )}
                  >
                    <Icon icon={c.icon} className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-medium text-text-primary sm:text-sm">{c.label}</p>
                    <p className="text-sm text-text-secondary sm:text-xs">{c.description}</p>
                    <p className={cn('mt-1 text-sm sm:text-xs', c.tone === 'danger' ? 'text-danger' : 'text-success')}>{c.impact}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-sm text-text-secondary">
                    <span className="font-semibold text-text-primary">{c.count.toLocaleString('pt-BR')}</span> registro(s)
                  </span>
                  <Button
                    variant={c.tone === 'danger' ? 'danger' : 'secondary'}
                    disabled={c.count === 0 || run.isPending}
                    onClick={() => handle(c)}
                    className="shrink-0"
                  >
                    <Icon icon="tabler:trash" className="size-4.5" />
                    {c.count === 0 ? 'Nada a limpar' : 'Limpar'}
                  </Button>
                </div>
              </li>
            ))}
      </ul>
    </section>
  )
}

import { useMemo } from 'react'
import { Link } from 'react-router'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Icon } from '@iconify/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { InterestByMonthChart } from '@/components/charts/InterestByMonthChart'
import { formatCurrency, formatDate } from '@/lib/format'
import { useDashboardSummaryQuery, useInterestByMonthQuery, useUpcomingInstallmentsQuery } from './api/useDashboard'

export function DashboardPage() {
  const todayLabel = useMemo(() => {
    const label = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [])

  const { data: summary, isLoading: loadingSummary } = useDashboardSummaryQuery()
  const { data: interest, isLoading: loadingInterest } = useInterestByMonthQuery(6)
  const { data: upcoming, isLoading: loadingUpcoming } = useUpcomingInstallmentsQuery(5)

  const hasOverdue = (summary?.valores_em_atraso ?? 0) > 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description={`Visão geral da carteira · ${todayLabel}`} />

      {hasOverdue && (
        <Link
          to="/inadimplencia"
          className="flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-muted px-4 py-3 text-sm text-danger transition-colors hover:bg-danger/15"
        >
          <span className="flex items-center gap-2 font-medium">
            <Icon icon="tabler:alert-triangle" className="size-4.5 shrink-0" />
            {formatCurrency(summary?.valores_em_atraso)} em atraso — ver inadimplência
          </span>
          <Icon icon="tabler:chevron-right" className="size-4.5 shrink-0" />
        </Link>
      )}

      {/* Ordem pensada para leitura rápida no mobile: o que falta receber, o
          que está atrasado, quantos empréstimos ativos e quanto foi emprestado. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total a receber"
          value={formatCurrency(summary?.total_a_receber)}
          icon="tabler:clock-dollar"
          loading={loadingSummary}
          tone="brand"
        />
        <StatCard
          label="Valores em atraso"
          value={formatCurrency(summary?.valores_em_atraso)}
          icon="tabler:alert-triangle"
          loading={loadingSummary}
          tone={hasOverdue ? 'danger' : 'neutral'}
        />
        <StatCard
          label="Empréstimos ativos"
          value={String(summary?.emprestimos_ativos ?? 0)}
          icon="tabler:hand-coins"
          loading={loadingSummary}
          tone="neutral"
        />
        <StatCard
          label="Total emprestado"
          value={formatCurrency(summary?.total_emprestado)}
          icon="tabler:cash-banknote"
          loading={loadingSummary}
          tone="neutral"
        />
        <StatCard
          label="Total recebido"
          value={formatCurrency(summary?.total_recebido)}
          icon="tabler:checkbox"
          loading={loadingSummary}
          tone="success"
        />
        <StatCard
          label="Juros recebidos"
          value={formatCurrency(summary?.juros_recebidos)}
          icon="tabler:trending-up"
          loading={loadingSummary}
          tone="gold"
        />
        <StatCard
          label="Juros a receber"
          value={formatCurrency(summary?.juros_a_receber)}
          icon="tabler:percentage"
          loading={loadingSummary}
          tone="gold"
        />
        <StatCard
          label="Próx. 7 dias"
          value={String(summary?.proximos_vencimentos ?? 0)}
          icon="tabler:calendar-due"
          loading={loadingSummary}
          tone="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Juros recebidos nos últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInterest || !interest ? (
              <div className="flex h-72 items-center justify-center text-sm text-text-muted">Carregando...</div>
            ) : (
              <InterestByMonthChart data={interest} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos vencimentos</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUpcoming ? (
              <p className="text-sm text-text-muted">Carregando...</p>
            ) : !upcoming || upcoming.length === 0 ? (
              <EmptyState icon="tabler:calendar-check" title="Nada vencendo em breve" />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {upcoming.map((installment) => (
                  <li key={installment.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{installment.person_name}</p>
                      <p className="text-xs text-text-muted">
                        Parcela {installment.sequence} · {formatDate(installment.due_date)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-text-primary">
                      {formatCurrency(installment.updated_amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

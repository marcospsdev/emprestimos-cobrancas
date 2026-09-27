import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { addMonths, format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MonthNavigator, formatMonthLabel, getMonthRange } from '@/components/ui/MonthNavigator'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { MonthlyChart, type MonthlyPoint } from '@/components/charts/MonthlyChart'
import { monthQueryString, useMonthParam } from '@/hooks/useMonthParam'
import { formatCurrency, todayISO } from '@/lib/format'
import { useLoansQuery } from '@/features/loans/api/useLoans'
import { LoanList } from '@/features/loans/LoanList'
import { useLoanForm } from '@/features/loans/loanFormContext'
import { getLoanStatus, sortLoans, summarizeLoans } from '@/features/loans/status'

const CHART_MONTHS = 6
const PREVIEW_LIMIT = 5

export function DashboardPage() {
  const [month, setMonth] = useMonthParam()
  const { openNewLoan } = useLoanForm()
  const today = todayISO()

  // Uma consulta cobre o mês escolhido + os 5 anteriores (para o gráfico).
  const chartStart = useMemo(() => startOfMonth(subMonths(month, CHART_MONTHS - 1)), [month])
  const range = getMonthRange(month)
  const { data: periodLoans, isLoading } = useLoansQuery({ from: format(chartStart, 'yyyy-MM-dd'), to: range.to })
  const { data: overdueLoans, isLoading: loadingOverdue } = useLoansQuery({ overdueOnly: true })

  const monthLoans = useMemo(
    () => (periodLoans ?? []).filter((l) => l.due_date >= range.from && l.due_date <= range.to),
    [periodLoans, range.from, range.to],
  )
  const totals = useMemo(() => summarizeLoans(monthLoans, today), [monthLoans, today])
  const overdueTotals = useMemo(() => summarizeLoans(overdueLoans ?? [], today), [overdueLoans, today])

  const toReceive = useMemo(
    () => sortLoans(monthLoans.filter((l) => getLoanStatus(l, today) !== 'pago'), today),
    [monthLoans, today],
  )
  const overdueSorted = useMemo(() => sortLoans(overdueLoans ?? [], today), [overdueLoans, today])

  const chartData = useMemo<MonthlyPoint[]>(() => {
    return Array.from({ length: CHART_MONTHS }, (_, i) => {
      const m = addMonths(chartStart, i)
      const key = format(m, 'yyyy-MM')
      const loans = (periodLoans ?? []).filter((l) => l.due_date.startsWith(key))
      const s = summarizeLoans(loans, today)
      return { label: format(m, 'MMM', { locale: ptBR }), previsto: s.expected, recebido: s.received }
    })
  }, [periodLoans, chartStart, today])

  const progress = totals.expected > 0 ? Math.round((totals.received / totals.expected) * 100) : 0
  const monthLink = `/emprestimos${monthQueryString(month)}`

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">Resumo</h1>
        <Button onClick={() => openNewLoan()}>
          <Icon icon="tabler:plus" className="size-4.5" />
          Novo empréstimo
        </Button>
      </div>

      <MonthNavigator month={month} onChange={setMonth} />

      {/* Destaque do mês */}
      <div className="rounded-2xl border border-brand-600/30 bg-gradient-to-br from-brand-500/15 via-surface to-surface p-5">
        <p className="text-sm text-text-secondary">Falta receber em {formatMonthLabel(month).toLowerCase()}</p>
        {isLoading ? (
          <Skeleton className="mt-2 h-9 w-40" />
        ) : (
          <p className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
            {formatCurrency(totals.pending + totals.overdue)}
          </p>
        )}
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-elevated">
          <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-sm text-text-secondary">
          Recebido <span className="font-semibold text-success">{formatCurrency(totals.received)}</span> de{' '}
          {formatCurrency(totals.expected)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Em atraso"
          value={formatCurrency(overdueTotals.overdue)}
          icon="tabler:alert-triangle"
          tone={overdueTotals.overdueCount > 0 ? 'danger' : 'neutral'}
          hint={overdueTotals.overdueCount > 0 ? 'somando todos os meses' : 'nada atrasado'}
          loading={loadingOverdue}
        />
        <StatCard
          label="Recebido no mês"
          value={formatCurrency(totals.received)}
          icon="tabler:circle-check"
          tone="success"
          hint={`${totals.paidCount} de ${totals.count} pagos`}
          loading={isLoading}
        />
        <StatCard
          label="Lucro no mês"
          value={formatCurrency(totals.profit)}
          icon="tabler:trending-up"
          tone="gold"
          hint="dos que já pagaram"
          loading={isLoading}
        />
        <StatCard
          label="Emprestado"
          value={formatCurrency(totals.lent)}
          icon="tabler:cash-banknote"
          tone="neutral"
          hint="com pagamento no mês"
          loading={isLoading}
        />
      </div>

      {overdueSorted.length > 0 && (
        <Section
          title="Atrasados"
          danger
          action={
            <SectionLink to="/emprestimos?ver=atrasados">
              {overdueSorted.length > PREVIEW_LIMIT ? `Ver todos (${overdueSorted.length})` : 'Ver todos'}
            </SectionLink>
          }
        >
          <LoanList loans={overdueSorted.slice(0, PREVIEW_LIMIT)} showLegend={false} />
        </Section>
      )}

      <Section
        title={`Para receber em ${formatMonthLabel(month).split(' ')[0].toLowerCase()}`}
        action={<SectionLink to={monthLink}>Ver lista</SectionLink>}
      >
        <LoanList
          loans={toReceive.slice(0, PREVIEW_LIMIT)}
          loading={isLoading}
          empty={
            <EmptyState
              icon="tabler:calendar-check"
              title={totals.count > 0 ? 'Tudo recebido neste mês' : 'Nada para receber neste mês'}
              action={
                <Button variant="secondary" onClick={() => openNewLoan()}>
                  <Icon icon="tabler:plus" className="size-4.5" />
                  Novo empréstimo
                </Button>
              }
            />
          }
        />
        {toReceive.length > PREVIEW_LIMIT && (
          <Link to={monthLink} className="mt-2 block py-2 text-center text-sm font-medium text-brand-400">
            + {toReceive.length - PREVIEW_LIMIT} empréstimos
          </Link>
        )}
      </Section>

      <Section title="Últimos 6 meses">
        <div className="rounded-2xl border border-border bg-surface p-3 sm:p-5">
          {isLoading ? <Skeleton className="h-56 w-full" /> : <MonthlyChart data={chartData} />}
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-border-strong" /> Para receber
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-brand-500" /> Recebido
            </span>
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, action, danger, children }: { title: string; action?: ReactNode; danger?: boolean; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className={danger ? 'text-base font-semibold text-danger' : 'text-base font-semibold text-text-primary'}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="flex h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-brand-400 hover:bg-brand-500/10">
      {children}
      <Icon icon="tabler:chevron-right" className="size-4" />
    </Link>
  )
}

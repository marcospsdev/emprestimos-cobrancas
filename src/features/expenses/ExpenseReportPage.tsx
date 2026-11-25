import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { addMonths, format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Icon } from '@iconify/react'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatMonthLabel, getMonthRange } from '@/components/ui/MonthNavigator'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { ExportButtons } from '@/components/shared/ExportButtons'
import { monthQueryString, useMonthParam } from '@/hooks/useMonthParam'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate, todayISO } from '@/lib/format'
import type { ReportColumn } from '@/lib/reportColumn'
import { useLoansQuery } from '@/features/loans/api/useLoans'
import { usePaymentsQuery } from '@/features/loans/api/usePayments'
import { summarizeLoans } from '@/features/loans/status'
import { useExpensesQuery } from './api/useExpenses'
import { getCategory } from './categories'
import { CategoryBreakdown } from './CategoryBreakdown'
import { ExpensesChart, ExpensesChartLegend, type ExpensesPoint } from './ExpensesChart'
import { totalsByCategory, type CategoryTotal } from './status'

const PERIODS = [
  { months: 1, label: 'Este mês' },
  { months: 3, label: '3 meses' },
  { months: 6, label: '6 meses' },
  { months: 12, label: '12 meses' },
] as const

const TOP_EXPENSES = 5

export function ExpenseReportPage() {
  const [month] = useMonthParam()
  const [searchParams, setSearchParams] = useSearchParams()
  const today = todayISO()

  const months = Number(searchParams.get('periodo')) || 6
  const period = PERIODS.find((p) => p.months === months) ?? PERIODS[2]
  const setPeriod = (value: number) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set('periodo', String(value))
        return params
      },
      { replace: true },
    )

  const start = useMemo(() => startOfMonth(subMonths(month, period.months - 1)), [month, period.months])
  const from = format(start, 'yyyy-MM-dd')
  const to = getMonthRange(month).to

  const { data: expenses, isLoading: loadingExpenses } = useExpensesQuery({ from, to })
  const { data: loans, isLoading: loadingLoans } = useLoansQuery({ from, to })
  const { data: payments, isLoading: loadingPayments } = usePaymentsQuery({ from, to })
  const isLoading = loadingExpenses || loadingLoans || loadingPayments

  const list = useMemo(() => expenses ?? [], [expenses])
  const total = useMemo(() => list.reduce((s, e) => s + e.amount, 0), [list])
  const byCategory = useMemo(() => totalsByCategory(list), [list])
  const profit = useMemo(() => summarizeLoans(loans ?? [], today, payments ?? []).profit, [loans, payments, today])
  const balance = profit - total
  const average = total / period.months
  const biggest = useMemo(() => [...list].sort((a, b) => b.amount - a.amount).slice(0, TOP_EXPENSES), [list])
  const fixedTotal = useMemo(() => list.filter((e) => e.fixed_expense_id).reduce((s, e) => s + e.amount, 0), [list])

  const chartData = useMemo<ExpensesPoint[]>(() => {
    return Array.from({ length: period.months }, (_, i) => {
      const m = addMonths(start, i)
      const key = format(m, 'yyyy-MM')
      const despesas = list.filter((e) => e.due_date.startsWith(key)).reduce((s, e) => s + e.amount, 0)
      const lucro = summarizeLoans(
        (loans ?? []).filter((l) => l.due_date.startsWith(key)),
        today,
        (payments ?? []).filter((p) => p.due_date.startsWith(key)),
      ).profit
      return { label: format(m, period.months > 6 ? 'MMM' : 'MMM/yy', { locale: ptBR }), despesas, lucro }
    })
  }, [list, loans, payments, today, start, period.months])

  const rangeLabel =
    period.months === 1
      ? formatMonthLabel(month)
      : `${format(start, 'MMM/yy', { locale: ptBR })} a ${format(month, 'MMM/yy', { locale: ptBR })}`

  const exportColumns: ReportColumn<CategoryTotal>[] = [
    { header: 'Categoria', accessor: (r) => r.label },
    { header: 'Total', accessor: (r) => formatCurrency(r.total), align: 'right' },
    { header: '% do total', accessor: (r) => `${r.percent.toFixed(1)}%`, align: 'right' },
    { header: 'Média por mês', accessor: (r) => formatCurrency(r.total / period.months), align: 'right' },
    { header: 'Qtd. de gastos', accessor: (r) => r.count, align: 'right' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          to={`/despesas${monthQueryString(month)}`}
          aria-label="Voltar para despesas"
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-hover"
        >
          <Icon icon="tabler:arrow-left" className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">Relatório de despesas</h1>
          <p className="text-sm text-text-secondary first-letter:uppercase">{rangeLabel}</p>
        </div>
      </div>

      <div role="radiogroup" aria-label="Período" className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-surface p-1">
        {PERIODS.map((p) => (
          <button
            key={p.months}
            type="button"
            role="radio"
            aria-checked={p.months === period.months}
            onClick={() => setPeriod(p.months)}
            className={cn(
              'h-11 cursor-pointer rounded-xl text-sm font-medium transition-colors sm:h-9',
              p.months === period.months ? 'bg-brand-500/15 text-brand-300' : 'text-text-secondary hover:bg-surface-hover',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total gasto" value={formatCurrency(total)} icon="tabler:receipt" tone="neutral" hint={`${list.length} gastos`} loading={isLoading} />
        <StatCard
          label="Média por mês"
          value={formatCurrency(average)}
          icon="tabler:calendar-stats"
          tone="neutral"
          hint={fixedTotal > 0 ? `contas fixas: ${formatCurrency(fixedTotal / period.months)}/mês` : 'sem contas fixas'}
          loading={isLoading}
        />
        <StatCard label="Lucro dos empréstimos" value={formatCurrency(profit)} icon="tabler:trending-up" tone="gold" hint="juros recebidos" loading={isLoading} />
        <StatCard
          label={balance >= 0 ? 'Sobrou' : 'Faltou'}
          value={formatCurrency(Math.abs(balance))}
          icon={balance >= 0 ? 'tabler:pig-money' : 'tabler:alert-triangle'}
          tone={balance >= 0 ? 'success' : 'danger'}
          hint="lucro menos despesas"
          loading={isLoading}
        />
      </div>

      {!isLoading && list.length === 0 ? (
        <EmptyState icon="tabler:chart-bar" title="Nenhuma despesa nesse período" description="Cadastre os gastos na tela de Despesas para ver o relatório." />
      ) : (
        <>
          <Section title="Onde mais gastei">
            {isLoading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : (
              <CategoryBreakdown
                rows={byCategory}
                extra={period.months > 1 ? (r) => `${formatCurrency(r.total / period.months)}/mês` : undefined}
              />
            )}
          </Section>

          {period.months > 1 && (
            <Section title="Mês a mês">
              <div className="rounded-2xl border border-border bg-surface p-3 sm:p-5">
                {isLoading ? <Skeleton className="h-56 w-full" /> : <ExpensesChart data={chartData} />}
                <ExpensesChartLegend />
              </div>
            </Section>
          )}

          <Section title="Maiores gastos">
            {isLoading ? (
              <Skeleton className="h-48 w-full rounded-2xl" />
            ) : (
              <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {biggest.map((e, i) => {
                  const cat = getCategory(e.category)
                  return (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-5 shrink-0 text-center text-sm font-semibold text-text-muted">{i + 1}º</span>
                      <Icon icon={cat.icon} className="size-5 shrink-0 text-text-secondary" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-text-primary sm:text-sm">{e.description}</p>
                        <p className="truncate text-sm text-text-muted sm:text-xs">
                          {cat.label} · {formatDate(e.due_date)}
                        </p>
                      </div>
                      <p className="shrink-0 text-base font-semibold text-text-primary sm:text-sm">{formatCurrency(e.amount)}</p>
                    </li>
                  )
                })}
              </ol>
            )}
          </Section>

          <div className="flex justify-end">
            <ExportButtons
              title={`Despesas por categoria — ${rangeLabel}`}
              sheetName="Por categoria"
              filenameBase={`relatorio-despesas-${format(start, 'yyyy-MM')}-a-${format(month, 'yyyy-MM')}`}
              columns={exportColumns}
              rows={byCategory}
              disabled={isLoading}
            />
          </div>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  )
}

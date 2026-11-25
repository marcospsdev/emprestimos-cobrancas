import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { format, isSameMonth, startOfMonth, subMonths } from 'date-fns'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MonthNavigator, formatMonthLabel, getMonthRange } from '@/components/ui/MonthNavigator'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { ExportButtons } from '@/components/shared/ExportButtons'
import { monthQueryString, useMonthParam } from '@/hooks/useMonthParam'
import { formatCurrency, formatDate, todayISO } from '@/lib/format'
import type { ReportColumn } from '@/lib/reportColumn'
import type { Expense } from '@/types/database'
import { useExpensesQuery } from './api/useExpenses'
import { getCategory } from './categories'
import { CategoryBreakdown } from './CategoryBreakdown'
import { ExpenseFormModal } from './ExpenseFormModal'
import { ExpenseList } from './ExpenseList'
import { EXPENSE_STATUS_LABEL, getExpenseStatus, sortExpenses, summarizeExpenses, totalsByCategory } from './status'

const EXPORT_COLUMNS: ReportColumn<Expense>[] = [
  { header: 'Data', accessor: (e) => formatDate(e.due_date) },
  { header: 'Descrição', accessor: (e) => e.description },
  { header: 'Categoria', accessor: (e) => getCategory(e.category).label },
  { header: 'Valor', accessor: (e) => formatCurrency(e.amount), align: 'right' },
  { header: 'Status', accessor: (e) => EXPENSE_STATUS_LABEL[getExpenseStatus(e)] },
  { header: 'Pago em', accessor: (e) => formatDate(e.paid_at) },
  { header: 'Conta fixa', accessor: (e) => (e.fixed_expense_id ? 'Sim' : '') },
  { header: 'Observações', accessor: (e) => e.notes ?? '' },
]

export function ExpensesPage() {
  const [month, setMonth] = useMonthParam()
  const [searchParams, setSearchParams] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const today = todayISO()

  const category = searchParams.get('categoria')
  // ?nova=1 vem do botão flutuante da barra de baixo: abre o cadastro.
  const newFromNav = searchParams.get('nova') === '1'
  const setCategory = (key: string | null) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (key) params.set('categoria', key)
        else params.delete('categoria')
        return params
      },
      { replace: true },
    )

  // Uma consulta cobre o mês anterior também (para comparar).
  const range = getMonthRange(month)
  const prevStart = format(startOfMonth(subMonths(month, 1)), 'yyyy-MM-dd')
  const { data: periodExpenses, isLoading } = useExpensesQuery({ from: prevStart, to: range.to })
  const { data: overdueAll } = useExpensesQuery({ overdueOnly: true })

  const monthExpenses = useMemo(
    () => (periodExpenses ?? []).filter((e) => e.due_date >= range.from && e.due_date <= range.to),
    [periodExpenses, range.from, range.to],
  )
  const prevTotal = useMemo(
    () => (periodExpenses ?? []).filter((e) => e.due_date < range.from).reduce((sum, e) => sum + e.amount, 0),
    [periodExpenses, range.from],
  )
  const totals = useMemo(() => summarizeExpenses(monthExpenses, today), [monthExpenses, today])
  const byCategory = useMemo(() => totalsByCategory(monthExpenses), [monthExpenses])
  const olderOverdue = useMemo(() => (overdueAll ?? []).filter((e) => e.due_date < range.from), [overdueAll, range.from])

  const visible = useMemo(() => {
    const list = category ? monthExpenses.filter((e) => getCategory(e.category).key === category) : monthExpenses
    return sortExpenses(list, today)
  }, [monthExpenses, category, today])

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (expense: Expense) => {
    setEditing(expense)
    setModalOpen(true)
  }

  // No mês atual a data sugerida é hoje; em outro mês, o dia 1 dele.
  const defaultDate = isSameMonth(month, new Date()) ? today : range.from
  const monthName = formatMonthLabel(month).split(' ')[0].toLowerCase()
  const prevMonthName = formatMonthLabel(subMonths(month, 1)).split(' ')[0].toLowerCase()
  const diff = totals.total - prevTotal
  const progress = totals.total > 0 ? Math.round((totals.paid / totals.total) * 100) : 0
  const selectedCategory = category ? getCategory(category) : null

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Despesas"
        actions={
          // No celular quem cadastra é o botão flutuante "Nova despesa".
          <Button onClick={openNew} className="hidden lg:inline-flex">
            <Icon icon="tabler:plus" className="size-4.5" />
            Nova despesa
          </Button>
        }
      />

      <MonthNavigator month={month} onChange={setMonth} />

      {/* Destaque do mês */}
      <div className="rounded-2xl border border-border-strong bg-surface p-5">
        <p className="text-sm text-text-secondary">Gastos em {formatMonthLabel(month).toLowerCase()}</p>
        {isLoading ? (
          <Skeleton className="mt-2 h-9 w-40" />
        ) : (
          <p className="mt-1 text-3xl font-bold tracking-tight text-text-primary">{formatCurrency(totals.total)}</p>
        )}
        {!isLoading && (prevTotal > 0 || totals.total > 0) && (
          <p className="mt-1 flex items-center gap-1 text-sm text-text-secondary">
            {prevTotal === 0 ? (
              `Nada lançado em ${prevMonthName}`
            ) : Math.abs(diff) < 0.01 ? (
              `Igual a ${prevMonthName}`
            ) : (
              <>
                <Icon
                  icon={diff > 0 ? 'tabler:arrow-up-right' : 'tabler:arrow-down-right'}
                  className={diff > 0 ? 'size-4 text-danger' : 'size-4 text-success'}
                  aria-hidden
                />
                <span className={diff > 0 ? 'font-medium text-danger' : 'font-medium text-success'}>
                  {formatCurrency(Math.abs(diff))} {diff > 0 ? 'a mais' : 'a menos'}
                </span>
                que {prevMonthName}
              </>
            )}
          </p>
        )}
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-elevated">
          <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-text-secondary">
          <span>
            Pago <span className="font-semibold text-success">{formatCurrency(totals.paid)}</span>
          </span>
          <span>
            Falta pagar <span className="font-semibold text-info">{formatCurrency(totals.pending + totals.overdue)}</span>
          </span>
        </div>
        {totals.overdueCount > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-danger">
            <Icon icon="tabler:alert-triangle" className="size-4" aria-hidden />
            {totals.overdueCount} {totals.overdueCount === 1 ? 'conta atrasada' : 'contas atrasadas'} ({formatCurrency(totals.overdue)})
          </p>
        )}
      </div>

      {olderOverdue.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger-muted p-4 text-sm text-danger">
          <Icon icon="tabler:alert-triangle" className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            Você tem {olderOverdue.length} {olderOverdue.length === 1 ? 'conta atrasada' : 'contas atrasadas'} de meses anteriores (
            {formatCurrency(olderOverdue.reduce((s, e) => s + e.amount, 0))}).{' '}
            <button
              type="button"
              onClick={() => setMonth(startOfMonth(new Date(`${olderOverdue[0].due_date}T12:00:00`)))}
              className="cursor-pointer font-semibold underline underline-offset-2"
            >
              Ver a mais antiga
            </button>
          </p>
        </div>
      )}

      {byCategory.length > 0 && (
        <Section title={`Onde mais gastei em ${monthName}`}>
          <CategoryBreakdown rows={byCategory} selected={category} onSelect={setCategory} />
          <p className="px-1 text-sm text-text-muted sm:text-xs">Toque numa categoria para ver só os gastos dela.</p>
        </Section>
      )}

      <Section
        title={selectedCategory ? `Gastos com ${selectedCategory.label.toLowerCase()}` : 'Gastos do mês'}
        action={
          selectedCategory && (
            <button
              type="button"
              onClick={() => setCategory(null)}
              className="flex h-10 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-medium text-brand-400 hover:bg-brand-500/10"
            >
              <Icon icon="tabler:x" className="size-4" />
              Ver todos
            </button>
          )
        }
      >
        <ExpenseList
          expenses={visible}
          loading={isLoading}
          onOpen={openEdit}
          empty={
            <EmptyState
              icon="tabler:receipt"
              title="Nenhuma despesa neste mês"
              description="Anote cada gasto para saber para onde o dinheiro está indo."
              action={
                <Button variant="secondary" onClick={openNew}>
                  <Icon icon="tabler:plus" className="size-4.5" />
                  Nova despesa
                </Button>
              }
            />
          }
        />
      </Section>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="secondary">
          <Link to={`/despesas/relatorio${monthQueryString(month)}`}>
            <Icon icon="tabler:chart-bar" className="size-4.5" />
            Ver relatório
          </Link>
        </Button>
        <ExportButtons
          title={`Despesas — ${formatMonthLabel(month)}`}
          sheetName="Despesas"
          filenameBase={`despesas-${format(month, 'yyyy-MM')}`}
          columns={EXPORT_COLUMNS}
          rows={sortExpenses(monthExpenses, today)}
          disabled={isLoading}
        />
      </div>

      <ExpenseFormModal
        open={modalOpen || newFromNav}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open && newFromNav) {
            setSearchParams(
              (prev) => {
                const params = new URLSearchParams(prev)
                params.delete('nova')
                return params
              },
              { replace: true },
            )
          }
        }}
        expense={newFromNav ? null : editing}
        defaultDate={defaultDate}
      />
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-10 items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

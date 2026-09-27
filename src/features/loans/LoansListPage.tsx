import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MonthNavigator, formatMonthLabel, getMonthRange } from '@/components/ui/MonthNavigator'
import { PageHeader } from '@/components/ui/PageHeader'
import { ExportButtons } from '@/components/shared/ExportButtons'
import { useMonthParam } from '@/hooks/useMonthParam'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate, normalizeSearch, todayISO } from '@/lib/format'
import type { ReportColumn } from '@/lib/reportColumn'
import type { Loan, LoanStatus } from '@/types/database'
import { useLoansQuery } from './api/useLoans'
import { LoanList } from './LoanList'
import { useLoanForm } from './loanFormContext'
import { STATUS_LABEL, getLoanStatus, sortLoans, summarizeLoans } from './status'

type Filter = 'todos' | LoanStatus

const FILTERS: Filter[] = ['todos', 'pendente', 'atrasado', 'pago']

const EXPORT_COLUMNS: ReportColumn<Loan>[] = [
  { header: 'Pagar até', accessor: (l) => formatDate(l.due_date) },
  { header: 'Título', accessor: (l) => l.title },
  { header: 'Pessoa', accessor: (l) => l.person?.name ?? '—' },
  { header: 'Emprestado', accessor: (l) => formatCurrency(l.amount_lent), align: 'right' },
  { header: 'A receber', accessor: (l) => formatCurrency(l.amount_to_receive), align: 'right' },
  { header: 'Status', accessor: (l) => STATUS_LABEL[getLoanStatus(l)] },
  { header: 'Pago em', accessor: (l) => formatDate(l.paid_at) },
  { header: 'Forma', accessor: (l) => l.payment_method ?? '' },
]


export function LoansListPage() {
  const [month, setMonth] = useMonthParam()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const { openNewLoan } = useLoanForm()

  const filter = (searchParams.get('status') as Filter | null) ?? 'todos'
  // ?ver=atrasados → todos os atrasados, de qualquer mês.
  const allOverdueMode = searchParams.get('ver') === 'atrasados'

  const setParam = (key: string, value: string | null) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (value) params.set(key, value)
        else params.delete(key)
        return params
      },
      { replace: true },
    )

  const range = getMonthRange(month)
  const monthQuery = useLoansQuery(range, { enabled: !allOverdueMode })
  const overdueQuery = useLoansQuery({ overdueOnly: true })

  const today = todayISO()
  const baseLoans = allOverdueMode ? overdueQuery.data : monthQuery.data
  const totals = useMemo(() => summarizeLoans(baseLoans ?? [], today), [baseLoans, today])

  const olderOverdue = useMemo(
    () => (overdueQuery.data ?? []).filter((l) => l.due_date < range.from),
    [overdueQuery.data, range.from],
  )

  const visible = useMemo(() => {
    let list = baseLoans ?? []
    if (!allOverdueMode && filter !== 'todos') list = list.filter((l) => getLoanStatus(l, today) === filter)
    const q = normalizeSearch(search.trim())
    if (q) list = list.filter((l) => normalizeSearch(`${l.title} ${l.person?.name ?? ''} ${l.description ?? ''}`).includes(q))
    return sortLoans(list, today)
  }, [baseLoans, allOverdueMode, filter, search, today])

  const counts: Record<Filter, number> = {
    todos: totals.count,
    pendente: totals.pendingCount,
    atrasado: totals.overdueCount,
    pago: totals.paidCount,
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={allOverdueMode ? 'Todos os atrasados' : 'Empréstimos'}
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <ExportButtons
              title={allOverdueMode ? 'Empréstimos atrasados' : `Empréstimos — ${formatMonthLabel(month)}`}
              sheetName="Empréstimos"
              filenameBase={allOverdueMode ? 'emprestimos-atrasados' : `emprestimos-${range.from.slice(0, 7)}`}
              columns={EXPORT_COLUMNS}
              rows={visible}
            />
            {/* Exportar à esquerda, "Novo empréstimo" à direita ocupando o resto (no celular). */}
            <Button onClick={() => openNewLoan()} className="flex-1 sm:flex-none">
              <Icon icon="tabler:plus" className="size-5 sm:size-4.5" />
              Novo empréstimo
            </Button>
          </div>
        }
      />

      {allOverdueMode ? (
        <button
          type="button"
          onClick={() => setParam('ver', null)}
          className="flex h-11 cursor-pointer items-center gap-2 self-start rounded-xl px-2 text-sm font-medium text-brand-400 hover:bg-brand-500/10"
        >
          <Icon icon="tabler:arrow-left" className="size-4.5" />
          Voltar para a lista do mês
        </button>
      ) : (
        <MonthNavigator month={month} onChange={setMonth} />
      )}

      {!allOverdueMode && olderOverdue.length > 0 && (
        <button
          type="button"
          onClick={() => setParam('ver', 'atrasados')}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-danger-muted px-4 py-3 text-left text-sm text-danger transition-colors hover:bg-danger/15"
        >
          <span className="flex items-center gap-2 font-medium">
            <Icon icon="tabler:alert-triangle" className="size-5 shrink-0" />
            {olderOverdue.length === 1
              ? '1 empréstimo atrasado de meses anteriores'
              : `${olderOverdue.length} empréstimos atrasados de meses anteriores`}
          </span>
          <span className="flex shrink-0 items-center gap-1 font-semibold">
            Ver
            <Icon icon="tabler:chevron-right" className="size-4.5" />
          </span>
        </button>
      )}

      {/* Resumo do que está na tela */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface p-3 text-center">
        <Summary label="A receber" value={totals.pending} />
        <Summary label="Atrasado" value={totals.overdue} danger />
        <Summary label="Recebido" value={totals.received} success />
      </div>

      {!allOverdueMode && (
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
          role="tablist"
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setParam('status', f === 'todos' ? null : f)}
              className={cn(
                'flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors',
                filter === f
                  ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                  : 'border-border-strong bg-surface text-text-secondary hover:bg-surface-hover',
              )}
            >
              {f === 'todos' ? 'Todos' : STATUS_LABEL[f]}
              <span className="text-xs opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <Icon icon="tabler:search" className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título ou pessoa"
          enterKeyHint="search"
          className="h-12 w-full rounded-xl border border-border bg-surface pr-3 pl-10 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-brand-500 sm:h-10 sm:max-w-sm sm:text-sm"
        />
      </div>

      <LoanList
        loans={visible}
        loading={allOverdueMode ? overdueQuery.isLoading : monthQuery.isLoading}
        empty={
          <EmptyState
            icon="tabler:coins"
            title={
              search
                ? 'Nada encontrado'
                : allOverdueMode
                  ? 'Nenhum empréstimo atrasado'
                  : filter === 'todos'
                    ? 'Nenhum empréstimo para receber neste mês'
                    : `Nenhum empréstimo "${STATUS_LABEL[filter as LoanStatus]}" neste mês`
            }
            action={
              !search && !allOverdueMode ? (
                <Button variant="secondary" onClick={() => openNewLoan()}>
                  <Icon icon="tabler:plus" className="size-4.5" />
                  Novo empréstimo
                </Button>
              ) : undefined
            }
          />
        }
      />
    </div>
  )
}

function Summary({ label, value, danger, success }: { label: string; value: number; danger?: boolean; success?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-text-muted">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-[13px] leading-tight font-semibold break-words min-[380px]:text-sm sm:text-base',
          danger && value > 0 ? 'text-danger' : success ? 'text-success' : 'text-text-primary',
        )}
      >
        {formatCurrency(value)}
      </p>
    </div>
  )
}

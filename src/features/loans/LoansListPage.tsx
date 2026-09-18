import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'
import type { LoanStatus } from '@/types/database'
import { useLoansQuery } from './api/useLoans'
import { LoanStatusBadge } from './LoanStatusBadge'
import { LoanFormModal } from './LoanFormModal'

const FILTERS: Array<{ label: string; value: LoanStatus | 'todos' }> = [
  { label: 'Todos', value: 'todos' },
  { label: 'Ativos', value: 'ativo' },
  { label: 'Quitados', value: 'quitado' },
  { label: 'Renegociados', value: 'renegociado' },
]

export function LoansListPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<LoanStatus | 'todos'>('todos')
  const [modalOpen, setModalOpen] = useState(false)

  const { data: loans, isLoading } = useLoansQuery(filter === 'todos' ? {} : { status: filter })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Empréstimos"
        description="Todos os empréstimos concedidos"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Icon icon="tabler:plus" className="size-4.5" />
            Novo empréstimo
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              'cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === f.value
                ? 'border-brand-600/40 bg-brand-500/10 text-brand-300'
                : 'border-border-strong bg-surface text-text-secondary hover:bg-surface-hover',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !loans || loans.length === 0 ? (
        <EmptyState
          icon="tabler:hand-coins"
          title="Nenhum empréstimo encontrado"
          description="Cadastre um novo empréstimo para começar."
          action={
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
              Novo empréstimo
            </Button>
          }
        />
      ) : (
        <>
          <TableContainer className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Valor emprestado</TableHead>
                  <TableHead>Juros</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>1º vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id} clickable onClick={() => navigate(`/emprestimos/${loan.id}`)}>
                    <TableCell className="font-medium">{loan.person?.name ?? '—'}</TableCell>
                    <TableCell className="text-text-secondary">{formatCurrency(loan.principal_amount)}</TableCell>
                    <TableCell className="text-text-secondary">{formatPercent(loan.interest_rate)}</TableCell>
                    <TableCell className="text-text-secondary">{loan.installments_count}x</TableCell>
                    <TableCell className="text-text-secondary">{formatDate(loan.first_due_date)}</TableCell>
                    <TableCell>
                      <LoanStatusBadge status={loan.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(loan.total_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <div className="flex flex-col gap-2 sm:hidden">
            {loans.map((loan) => (
              <Card
                key={loan.id}
                className="cursor-pointer p-4 active:bg-surface-hover"
                onClick={() => navigate(`/emprestimos/${loan.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">{loan.person?.name ?? '—'}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {loan.installments_count}x · {formatPercent(loan.interest_rate)} · vence{' '}
                      {formatDate(loan.first_due_date)}
                    </p>
                  </div>
                  <LoanStatusBadge status={loan.status} />
                </div>
                <p className="mt-2 text-lg font-semibold text-text-primary">{formatCurrency(loan.total_amount)}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      <LoanFormModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}

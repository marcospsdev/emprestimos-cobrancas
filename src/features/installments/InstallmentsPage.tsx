import { useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate } from '@/lib/format'
import type { InstallmentStatus, InstallmentView } from '@/types/database'
import { useInstallmentsQuery } from './api/useInstallments'
import { InstallmentStatusBadge } from './InstallmentStatusBadge'
import { PaymentFormModal } from './PaymentFormModal'

const FILTERS: Array<{ label: string; value: InstallmentStatus | 'todos' }> = [
  { label: 'Todos', value: 'todos' },
  { label: 'Pendentes', value: 'pendente' },
  { label: 'Atrasados', value: 'atrasado' },
  { label: 'Pagos', value: 'pago' },
]

export function InstallmentsPage() {
  const [filter, setFilter] = useState<InstallmentStatus | 'todos'>('todos')
  const [payingInstallment, setPayingInstallment] = useState<InstallmentView | null>(null)

  const { data: installments, isLoading } = useInstallmentsQuery(filter === 'todos' ? {} : { status: filter })

  const sorted = useMemo(
    () => [...(installments ?? [])].sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [installments],
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Parcelas" description="Todas as parcelas de todos os empréstimos" />

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
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon="tabler:calendar-dollar" title="Nenhuma parcela encontrada" description="Ajuste o filtro acima." />
      ) : (
        <>
          <TableContainer className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor atualizado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell className="font-medium">{installment.person_name}</TableCell>
                    <TableCell className="text-text-secondary">{installment.sequence}</TableCell>
                    <TableCell className="text-text-secondary">{formatDate(installment.due_date)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(installment.updated_amount)}</TableCell>
                    <TableCell>
                      <InstallmentStatusBadge status={installment.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {installment.status !== 'pago' && (
                          <Button size="sm" variant="secondary" onClick={() => setPayingInstallment(installment)}>
                            Registrar pagamento
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <div className="flex flex-col gap-2 sm:hidden">
            {sorted.map((installment) => (
              <Card key={installment.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">{installment.person_name}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      Parcela {installment.sequence} · Vence {formatDate(installment.due_date)}
                    </p>
                  </div>
                  <InstallmentStatusBadge status={installment.status} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-lg font-semibold text-text-primary">{formatCurrency(installment.updated_amount)}</p>
                  {installment.status !== 'pago' && (
                    <Button size="sm" onClick={() => setPayingInstallment(installment)}>
                      <Icon icon="tabler:cash" className="size-4" />
                      Pagar
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <PaymentFormModal
        open={!!payingInstallment}
        onOpenChange={(open) => !open && setPayingInstallment(null)}
        installment={payingInstallment}
      />
    </div>
  )
}

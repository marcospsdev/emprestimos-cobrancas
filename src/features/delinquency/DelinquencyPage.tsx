import { useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { formatCurrency, formatDate } from '@/lib/format'
import { getWhatsAppLink, onlyDigits } from '@/lib/whatsapp'
import { WhatsAppButton } from '@/components/shared/WhatsAppButton'
import type { InstallmentView } from '@/types/database'
import { useInstallmentsQuery } from '@/features/installments/api/useInstallments'
import { PaymentFormModal } from '@/features/installments/PaymentFormModal'

export function DelinquencyPage() {
  const [payingInstallment, setPayingInstallment] = useState<InstallmentView | null>(null)
  const { data: installments, isLoading } = useInstallmentsQuery({ status: 'atrasado' })

  const sorted = useMemo(
    () => [...(installments ?? [])].sort((a, b) => b.late_days - a.late_days),
    [installments],
  )
  const totalOverdue = useMemo(() => sorted.reduce((acc, i) => acc + i.updated_amount, 0), [sorted])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inadimplência" description="Empréstimos e parcelas em atraso" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-lg">
        <StatCard label="Valor em atraso" value={formatCurrency(totalOverdue)} icon="tabler:alert-triangle" loading={isLoading} tone="danger" />
        <StatCard label="Parcelas atrasadas" value={String(sorted.length)} icon="tabler:calendar-x" loading={isLoading} tone="neutral" />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon="tabler:circle-check" title="Nenhuma inadimplência" description="Não há parcelas em atraso no momento." />
      ) : (
        <>
          <TableContainer className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Dias de atraso</TableHead>
                  <TableHead className="text-right">Valor atualizado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((installment) => {
                  return (
                    <TableRow key={installment.id}>
                      <TableCell className="font-medium">{installment.person_name}</TableCell>
                      <TableCell className="text-text-secondary">{formatDate(installment.due_date)}</TableCell>
                      <TableCell className="text-right font-medium text-danger">{installment.late_days} dia(s)</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(installment.updated_amount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <WhatsAppButton phone={installment.person_phone} />
                          {installment.person_phone && (
                            <a
                              href={`tel:${onlyDigits(installment.person_phone)}`}
                              title="Ligar"
                              className="flex size-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                            >
                              <Icon icon="tabler:phone" className="size-4.5" />
                            </a>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => setPayingInstallment(installment)}>
                            Registrar pagamento
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <div className="flex flex-col gap-2 sm:hidden">
            {sorted.map((installment) => {
              const wa = getWhatsAppLink(installment.person_phone)
              return (
                <Card key={installment.id} className="border-danger/30 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-primary">{installment.person_name}</p>
                      <p className="mt-0.5 text-xs text-text-muted">Venceu em {formatDate(installment.due_date)}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-danger/30 bg-danger-muted px-2.5 py-1 text-xs font-medium text-danger">
                      {installment.late_days}d atraso
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-danger">{formatCurrency(installment.updated_amount)}</p>
                  <div className="mt-3 flex items-center gap-2">
                    {wa && (
                      <Button asChild variant="secondary" size="sm" className="flex-1">
                        <a href={wa} target="_blank" rel="noopener noreferrer">
                          <Icon icon="tabler:brand-whatsapp" className="size-4" />
                          WhatsApp
                        </a>
                      </Button>
                    )}
                    <Button size="sm" className="flex-1" onClick={() => setPayingInstallment(installment)}>
                      Registrar pagamento
                    </Button>
                  </div>
                </Card>
              )
            })}
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

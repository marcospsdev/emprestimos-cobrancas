import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Icon } from '@iconify/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'
import { getWhatsAppLink } from '@/lib/whatsapp'
import { useLoanQuery } from './api/useLoans'
import { useInstallmentsQuery, usePaymentsByLoanQuery } from '@/features/installments/api/useInstallments'
import { InstallmentStatusBadge } from '@/features/installments/InstallmentStatusBadge'
import { PaymentFormModal } from '@/features/installments/PaymentFormModal'
import type { InstallmentView } from '@/types/database'
import { LoanStatusBadge } from './LoanStatusBadge'
import { RenegotiateModal } from './RenegotiateModal'

export function LoanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [payingInstallment, setPayingInstallment] = useState<InstallmentView | null>(null)
  const [renegotiateOpen, setRenegotiateOpen] = useState(false)

  const { data: loan, isLoading: loadingLoan } = useLoanQuery(id)
  const { data: installments, isLoading: loadingInstallments } = useInstallmentsQuery({ loanId: id })
  const { data: payments } = usePaymentsByLoanQuery(id)

  const outstanding = useMemo(
    () => (installments ?? []).filter((i) => i.status !== 'pago').reduce((acc, i) => acc + i.updated_amount, 0),
    [installments],
  )
  const paidCount = useMemo(() => (installments ?? []).filter((i) => i.status === 'pago').length, [installments])

  if (loadingLoan || !loan) {
    return <PageLoader />
  }

  const wa = getWhatsAppLink(loan.person?.phone)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={loan.person?.name ?? 'Empréstimo'}
        description={`Empréstimo criado em ${formatDate(loan.created_at)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <LoanStatusBadge status={loan.status} />
            {wa && (
              <Button asChild variant="secondary">
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <Icon icon="tabler:brand-whatsapp" className="size-4.5" />
                  WhatsApp
                </a>
              </Button>
            )}
            {loan.status === 'ativo' && outstanding > 0 && (
              <Button variant="secondary" onClick={() => setRenegotiateOpen(true)}>
                <Icon icon="tabler:refresh" className="size-4.5" />
                Renegociar
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate('/pessoas/' + loan.person_id)}>
              <Icon icon="tabler:user" className="size-4.5" />
              Ver pessoa
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Valor emprestado" value={formatCurrency(loan.principal_amount)} icon="tabler:coins" tone="brand" />
        <StatCard label="Valor total" value={formatCurrency(loan.total_amount)} icon="tabler:receipt-2" tone="gold" />
        <StatCard label="Saldo em aberto" value={formatCurrency(outstanding)} icon="tabler:clock-dollar" tone={outstanding > 0 ? 'danger' : 'success'} />
        <StatCard
          label="Parcelas pagas"
          value={`${paidCount}/${loan.installments_count}`}
          icon="tabler:checklist"
          tone="neutral"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Condições</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-text-muted">Juros</dt>
              <dd className="mt-0.5 font-medium text-text-primary">{formatPercent(loan.interest_rate)} por parcela</dd>
            </div>
            <div>
              <dt className="text-text-muted">Parcelas</dt>
              <dd className="mt-0.5 font-medium text-text-primary">{loan.installments_count}x ({loan.installment_frequency})</dd>
            </div>
            <div>
              <dt className="text-text-muted">1º vencimento</dt>
              <dd className="mt-0.5 font-medium text-text-primary">{formatDate(loan.first_due_date)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Total pago</dt>
              <dd className="mt-0.5 font-medium text-text-primary">
                {formatCurrency((payments ?? []).reduce((acc, p) => acc + p.amount, 0))}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parcelas</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingInstallments ? (
            <p className="text-sm text-text-muted">Carregando...</p>
          ) : !installments || installments.length === 0 ? (
            <EmptyState icon="tabler:calendar-dollar" title="Nenhuma parcela" />
          ) : (
            <div className="-mx-5">
              <TableContainer className="rounded-none border-x-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead className="text-right">Atualizado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installments.map((installment) => (
                      <TableRow key={installment.id}>
                        <TableCell>{installment.sequence}</TableCell>
                        <TableCell className="text-text-secondary">{formatDate(installment.due_date)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(installment.amount)}</TableCell>
                        <TableCell className="text-right text-text-secondary">{formatCurrency(installment.amount_paid)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(installment.updated_amount)}</TableCell>
                        <TableCell>
                          <InstallmentStatusBadge status={installment.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            {installment.status !== 'pago' && (
                              <Button size="sm" variant="secondary" onClick={() => setPayingInstallment(installment)}>
                                Pagar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentFormModal
        open={!!payingInstallment}
        onOpenChange={(open) => !open && setPayingInstallment(null)}
        installment={payingInstallment}
      />

      {loan.status === 'ativo' && (
        <RenegotiateModal
          open={renegotiateOpen}
          onOpenChange={setRenegotiateOpen}
          loan={loan}
          outstandingAmount={outstanding}
          onDone={(newLoanId) => navigate(`/emprestimos/${newLoanId}`)}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Icon } from '@iconify/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { formatCurrency, formatDate } from '@/lib/format'
import { getWhatsAppLink } from '@/lib/whatsapp'
import { usePersonQuery } from './api/usePeople'
import { useLoansQuery } from '@/features/loans/api/useLoans'
import { usePaymentsByPersonQuery } from '@/features/installments/api/useInstallments'
import { LoanStatusBadge } from '@/features/loans/LoanStatusBadge'
import { LoanFormModal } from '@/features/loans/LoanFormModal'
import { PersonFormModal } from './PersonFormModal'

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loanModalOpen, setLoanModalOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const { data: person, isLoading } = usePersonQuery(id)
  const { data: loans, isLoading: loadingLoans } = useLoansQuery({ personId: id })
  const { data: payments, isLoading: loadingPayments } = usePaymentsByPersonQuery(id)

  if (isLoading || !person) {
    return <PageLoader />
  }

  const wa = getWhatsAppLink(person.phone)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={person.name}
        description={[person.cpf, person.phone].filter(Boolean).join(' · ') || 'Sem contato cadastrado'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {wa && (
              <Button asChild variant="secondary">
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <Icon icon="tabler:brand-whatsapp" className="size-4.5" />
                  WhatsApp
                </a>
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Icon icon="tabler:edit" className="size-4.5" />
              Editar
            </Button>
            <Button onClick={() => setLoanModalOpen(true)}>
              <Icon icon="tabler:plus" className="size-4.5" />
              Novo empréstimo
            </Button>
          </div>
        }
      />

      {(person.address || person.notes) && (
        <Card>
          <CardContent className="pt-5 text-sm">
            {person.address && (
              <p className="text-text-secondary">
                <span className="text-text-muted">Endereço: </span>
                {person.address}
              </p>
            )}
            {person.notes && (
              <p className="mt-1 text-text-secondary">
                <span className="text-text-muted">Observações: </span>
                {person.notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="emprestimos">
        <TabsList>
          <TabsTrigger value="emprestimos">Empréstimos</TabsTrigger>
          <TabsTrigger value="pagamentos">Histórico de pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="emprestimos" className="mt-4">
          {loadingLoans ? (
            <p className="text-sm text-text-muted">Carregando...</p>
          ) : !loans || loans.length === 0 ? (
            <EmptyState
              icon="tabler:coins"
              title="Nenhum empréstimo"
              description="Esta pessoa ainda não possui empréstimos registrados."
              action={
                <Button variant="secondary" size="sm" onClick={() => setLoanModalOpen(true)}>
                  Novo empréstimo
                </Button>
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Valor emprestado</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead>1º vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id} clickable onClick={() => navigate(`/emprestimos/${loan.id}`)}>
                      <TableCell>{formatCurrency(loan.principal_amount)}</TableCell>
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
          )}
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-4">
          {loadingPayments ? (
            <p className="text-sm text-text-muted">Carregando...</p>
          ) : !payments || payments.length === 0 ? (
            <EmptyState icon="tabler:receipt" title="Nenhum pagamento registrado" />
          ) : (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-text-secondary">{formatDate(payment.payment_date)}</TableCell>
                      <TableCell>{payment.notes || '—'}</TableCell>
                      <TableCell className="text-right font-medium text-success">{formatCurrency(payment.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabsContent>
      </Tabs>

      <LoanFormModal open={loanModalOpen} onOpenChange={setLoanModalOpen} defaultPersonId={person.id} />
      <PersonFormModal open={editOpen} onOpenChange={setEditOpen} person={person} />
    </div>
  )
}

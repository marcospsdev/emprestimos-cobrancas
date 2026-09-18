import { useMemo, useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { DateField } from '@/components/ui/form/DateField'
import { ExportButtons } from '@/components/shared/ExportButtons'
import { formatCurrency, formatDate, formatPercent, todayISO } from '@/lib/format'
import type { ReportColumn } from '@/lib/reportColumn'
import { useInstallmentsQuery } from '@/features/installments/api/useInstallments'
import { InstallmentStatusBadge } from '@/features/installments/InstallmentStatusBadge'
import { LoanStatusBadge } from '@/features/loans/LoanStatusBadge'
import type { InstallmentView, LoanStatus } from '@/types/database'
import type { LoanReportRow, PaymentReportRow } from './api/reports'
import { useLoansReportQuery, usePaymentsReportQuery } from './api/useReports'

const LOAN_COLUMNS: ReportColumn<LoanReportRow>[] = [
  { header: 'Data', accessor: (r) => formatDate(r.created_at) },
  { header: 'Pessoa', accessor: (r) => r.person_name },
  { header: 'Valor emprestado', accessor: (r) => formatCurrency(r.principal_amount), align: 'right' },
  { header: 'Juros', accessor: (r) => formatPercent(r.interest_rate), align: 'right' },
  { header: 'Total', accessor: (r) => formatCurrency(r.total_amount), align: 'right' },
  { header: 'Status', accessor: (r) => r.status },
]

const PAYMENT_COLUMNS: ReportColumn<PaymentReportRow>[] = [
  { header: 'Data', accessor: (r) => formatDate(r.payment_date) },
  { header: 'Pessoa', accessor: (r) => r.person_name },
  { header: 'Valor pago', accessor: (r) => formatCurrency(r.amount), align: 'right' },
]

const INTEREST_COLUMNS: ReportColumn<PaymentReportRow>[] = [
  { header: 'Data', accessor: (r) => formatDate(r.payment_date) },
  { header: 'Pessoa', accessor: (r) => r.person_name },
  { header: 'Juros recebido', accessor: (r) => formatCurrency(r.interest_share), align: 'right' },
]

const RECEIVABLE_COLUMNS: ReportColumn<InstallmentView>[] = [
  { header: 'Pessoa', accessor: (r) => r.person_name },
  { header: 'Parcela', accessor: (r) => r.sequence },
  { header: 'Vencimento', accessor: (r) => formatDate(r.due_date) },
  { header: 'Valor atualizado', accessor: (r) => formatCurrency(r.updated_amount), align: 'right' },
  { header: 'Status', accessor: (r) => r.status },
]

const DELINQUENCY_COLUMNS: ReportColumn<InstallmentView>[] = [
  { header: 'Pessoa', accessor: (r) => r.person_name },
  { header: 'Vencimento', accessor: (r) => formatDate(r.due_date) },
  { header: 'Dias de atraso', accessor: (r) => r.late_days, align: 'right' },
  { header: 'Valor atualizado', accessor: (r) => formatCurrency(r.updated_amount), align: 'right' },
]

function usePeriodState() {
  const [from, setFrom] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [to, setTo] = useState(todayISO)
  return { from, setFrom, to, setTo }
}

function PeriodPickers({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string
  to: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <DateField label="De" value={from} onChange={(e) => onFrom(e.target.value)} className="sm:w-44" />
      <DateField label="Até" value={to} onChange={(e) => onTo(e.target.value)} className="sm:w-44" />
    </div>
  )
}

function LoansReportPanel() {
  const { from, setFrom, to, setTo } = usePeriodState()
  const { data: rows, isLoading } = useLoansReportQuery(from, to)
  const total = useMemo(() => (rows ?? []).reduce((acc, r) => acc + r.principal_amount, 0), [rows])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <PeriodPickers from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <ExportButtons
          title="Relatório de Empréstimos"
          sheetName="Empréstimos"
          filenameBase={`emprestimos-${from}-a-${to}`}
          columns={LOAN_COLUMNS}
          rows={rows ?? []}
          disabled={isLoading}
        />
      </div>

      <StatCard label="Total emprestado no período" value={formatCurrency(total)} icon="tabler:coins" loading={isLoading} tone="brand" />

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="tabler:coins" title="Nenhum empréstimo no período" />
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Pessoa</TableHead>
                <TableHead className="text-right">Valor emprestado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-text-secondary">{formatDate(row.created_at)}</TableCell>
                  <TableCell className="font-medium">{row.person_name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.principal_amount)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(row.total_amount)}</TableCell>
                  <TableCell>
                    <LoanStatusBadge status={row.status as LoanStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  )
}

function PaymentsReportPanel() {
  const { from, setFrom, to, setTo } = usePeriodState()
  const { data: rows, isLoading } = usePaymentsReportQuery(from, to)
  const total = useMemo(() => (rows ?? []).reduce((acc, r) => acc + r.amount, 0), [rows])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <PeriodPickers from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <ExportButtons
          title="Relatório de Pagamentos"
          sheetName="Pagamentos"
          filenameBase={`pagamentos-${from}-a-${to}`}
          columns={PAYMENT_COLUMNS}
          rows={rows ?? []}
          disabled={isLoading}
        />
      </div>

      <StatCard label="Total recebido no período" value={formatCurrency(total)} icon="tabler:checkbox" loading={isLoading} tone="success" />

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="tabler:receipt" title="Nenhum pagamento no período" />
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Pessoa</TableHead>
                <TableHead className="text-right">Valor pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-text-secondary">{formatDate(row.payment_date)}</TableCell>
                  <TableCell className="font-medium">{row.person_name}</TableCell>
                  <TableCell className="text-right font-medium text-success">{formatCurrency(row.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  )
}

function InterestReportPanel() {
  const { from, setFrom, to, setTo } = usePeriodState()
  const { data: rows, isLoading } = usePaymentsReportQuery(from, to)
  const total = useMemo(() => (rows ?? []).reduce((acc, r) => acc + r.interest_share, 0), [rows])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <PeriodPickers from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <ExportButtons
          title="Relatório de Juros Recebidos"
          sheetName="Juros"
          filenameBase={`juros-recebidos-${from}-a-${to}`}
          columns={INTEREST_COLUMNS}
          rows={rows ?? []}
          disabled={isLoading}
        />
      </div>

      <StatCard label="Juros recebidos no período" value={formatCurrency(total)} icon="tabler:trending-up" loading={isLoading} tone="gold" />

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="tabler:percentage" title="Nenhum juro recebido no período" />
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Pessoa</TableHead>
                <TableHead className="text-right">Juros recebido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-text-secondary">{formatDate(row.payment_date)}</TableCell>
                  <TableCell className="font-medium">{row.person_name}</TableCell>
                  <TableCell className="text-right font-medium text-gold-400">{formatCurrency(row.interest_share)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  )
}

function ReceivableReportPanel() {
  const { data: rows, isLoading } = useInstallmentsQuery()
  const filtered = useMemo(() => (rows ?? []).filter((r) => r.status !== 'pago'), [rows])
  const total = useMemo(() => filtered.reduce((acc, r) => acc + r.updated_amount, 0), [filtered])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExportButtons
          title="Relatório de Valores a Receber"
          sheetName="A receber"
          filenameBase="valores-a-receber"
          columns={RECEIVABLE_COLUMNS}
          rows={filtered}
          disabled={isLoading}
        />
      </div>

      <StatCard label="Total a receber" value={formatCurrency(total)} icon="tabler:clock-dollar" loading={isLoading} tone="brand" />

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState icon="tabler:clock-dollar" title="Nada a receber" />
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor atualizado</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.person_name}</TableCell>
                  <TableCell className="text-text-secondary">{row.sequence}</TableCell>
                  <TableCell className="text-text-secondary">{formatDate(row.due_date)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(row.updated_amount)}</TableCell>
                  <TableCell>
                    <InstallmentStatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  )
}

function DelinquencyReportPanel() {
  const { data: rows, isLoading } = useInstallmentsQuery({ status: 'atrasado' })
  const sorted = useMemo(() => [...(rows ?? [])].sort((a, b) => b.late_days - a.late_days), [rows])
  const total = useMemo(() => sorted.reduce((acc, r) => acc + r.updated_amount, 0), [sorted])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExportButtons
          title="Relatório de Inadimplência"
          sheetName="Inadimplência"
          filenameBase="inadimplencia"
          columns={DELINQUENCY_COLUMNS}
          rows={sorted}
          disabled={isLoading}
        />
      </div>

      <StatCard label="Total em atraso" value={formatCurrency(total)} icon="tabler:alert-triangle" loading={isLoading} tone="danger" />

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : sorted.length === 0 ? (
        <EmptyState icon="tabler:circle-check" title="Nenhuma inadimplência" />
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Dias de atraso</TableHead>
                <TableHead className="text-right">Valor atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.person_name}</TableCell>
                  <TableCell className="text-text-secondary">{formatDate(row.due_date)}</TableCell>
                  <TableCell className="text-right font-medium text-danger">{row.late_days}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(row.updated_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  )
}

export function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Relatórios" description="Empréstimos, pagamentos, juros, a receber e inadimplência" />

      <Tabs defaultValue="emprestimos">
        <TabsList>
          <TabsTrigger value="emprestimos">Empréstimos</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="juros">Juros recebidos</TabsTrigger>
          <TabsTrigger value="a-receber">A receber</TabsTrigger>
          <TabsTrigger value="inadimplencia">Inadimplência</TabsTrigger>
        </TabsList>

        <TabsContent value="emprestimos" className="mt-4">
          <LoansReportPanel />
        </TabsContent>
        <TabsContent value="pagamentos" className="mt-4">
          <PaymentsReportPanel />
        </TabsContent>
        <TabsContent value="juros" className="mt-4">
          <InterestReportPanel />
        </TabsContent>
        <TabsContent value="a-receber" className="mt-4">
          <ReceivableReportPanel />
        </TabsContent>
        <TabsContent value="inadimplencia" className="mt-4">
          <DelinquencyReportPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/PageLoader'
import { StatCard } from '@/components/ui/StatCard'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { WhatsAppButton } from '@/components/shared/WhatsAppButton'
import { formatCurrency, todayISO } from '@/lib/format'
import { useLoansQuery } from '@/features/loans/api/useLoans'
import { usePaymentsQuery } from '@/features/loans/api/usePayments'
import { LoanList } from '@/features/loans/LoanList'
import { useLoanForm } from '@/features/loans/loanFormContext'
import { sortLoans, summarizeLoans, type LoanTotals } from '@/features/loans/status'
import { useDeletePerson, usePersonQuery } from './api/usePeople'
import { PersonFormModal } from './PersonFormModal'

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const { openNewLoan } = useLoanForm()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const deleteMutation = useDeletePerson()

  const { data: person, isLoading, error } = usePersonQuery(id)
  const { data: loans, isLoading: loadingLoans } = useLoansQuery({ personId: id }, { enabled: !!id })
  const { data: payments } = usePaymentsQuery({ personId: id }, { enabled: !!id })

  const today = todayISO()
  const totals = useMemo(() => summarizeLoans(loans ?? [], today, payments ?? []), [loans, today, payments])
  // Histórico de juros: mais recentes primeiro.
  const paymentHistory = useMemo(() => [...(payments ?? [])].sort((a, b) => b.due_date.localeCompare(a.due_date)), [payments])
  const sorted = useMemo(() => sortLoans(loans ?? [], today), [loans, today])

  if (error) {
    return <EmptyState icon="tabler:user-off" title="Cliente não encontrado" action={<Link to="/clientes" className="text-sm text-brand-400">Voltar</Link>} />
  }
  if (isLoading || !person) return <PageLoader />

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Excluir cliente',
      description: `Excluir "${person.name}"? Só é possível se não houver empréstimos dele.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteMutation.mutateAsync(person.id)
      showToast(`${person.name} excluído.`, 'success')
      navigate('/clientes')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir cliente.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link to="/clientes" className="-mb-2 -ml-2 flex h-11 items-center gap-1 self-start rounded-xl px-2 text-base font-medium sm:text-sm text-text-secondary hover:text-text-primary">
        <Icon icon="tabler:arrow-left" className="size-4.5" />
        Clientes
      </Link>

      <div className="flex items-start gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-xl font-semibold text-brand-300">
          {person.name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-text-primary sm:text-2xl">{person.name}</h1>
          <p className="text-sm text-text-secondary">{person.phone || 'Sem telefone'}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} className="h-11 shrink-0 sm:h-9">
          <Icon icon="tabler:pencil" className="size-4.5" />
          Editar
        </Button>
      </div>

      {person.notes && <p className="rounded-2xl border border-border bg-surface p-4 text-sm whitespace-pre-line text-text-secondary">{person.notes}</p>}

      <div className="grid grid-cols-2 gap-2">
        <WhatsAppButton phone={person.phone} label="WhatsApp" className="h-12 w-full justify-center rounded-xl" />
        <Button onClick={() => openNewLoan({ personId: person.id })} className={person.phone ? '' : 'col-span-2'}>
          <Icon icon="tabler:plus" className="size-4.5" />
          Emprestar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Deve"
          value={formatCurrency(totals.owed)}
          icon="tabler:clock-dollar"
          // Cores de status: vermelho se tem atraso, azul (a receber) se só está em aberto.
          tone={totals.overdue > 0 ? 'danger' : totals.pending > 0 ? 'info' : 'neutral'}
          hint={totals.overdue > 0 ? `${formatCurrency(totals.overdue)} atrasado` : undefined}
          loading={loadingLoans}
        />
        <StatCard
          label="Já pagou"
          value={formatCurrency(totals.received)}
          icon="tabler:circle-check"
          tone="success"
          hint={paidHint(totals)}
          loading={loadingLoans}
        />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-text-primary">Empréstimos</h2>
        <LoanList
          loans={sorted}
          payments={paymentHistory}
          loading={loadingLoans}
          showPerson={false}
          empty={<EmptyState icon="tabler:coins" title="Nenhum empréstimo para esse cliente" />}
        />
      </section>

      {sorted.length === 0 && paymentHistory.length === 0 && !loadingLoans && (
        <Button variant="ghost" onClick={handleDelete} className="self-center text-danger hover:bg-danger-muted hover:text-danger">
          <Icon icon="tabler:trash" className="size-4.5" />
          Excluir cliente
        </Button>
      )}

      <PersonFormModal open={editOpen} onOpenChange={setEditOpen} person={person} />
    </div>
  )
}

/** Dica do "Já pagou": diz se entrou pagamento de juros ou de parcela. */
function paidHint(t: LoanTotals): string {
  const parts: string[] = []
  if (t.installmentPaymentCount > 0) parts.push(`${t.installmentPaymentCount} parcela(s)`)
  if (t.interestPaymentCount > 0) parts.push(`${t.interestPaymentCount} pagamento(s) de juros`)
  return parts.length ? `inclui ${parts.join(' e ')}` : `${t.paidCount} quitado(s)`
}

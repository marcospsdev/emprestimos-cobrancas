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
import { LoanList } from '@/features/loans/LoanList'
import { useLoanForm } from '@/features/loans/loanFormContext'
import { sortLoans, summarizeLoans } from '@/features/loans/status'
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

  const today = todayISO()
  const totals = useMemo(() => summarizeLoans(loans ?? [], today), [loans, today])
  const sorted = useMemo(() => sortLoans(loans ?? [], today), [loans, today])

  if (error) {
    return <EmptyState icon="tabler:user-off" title="Pessoa não encontrada" action={<Link to="/pessoas" className="text-sm text-brand-400">Voltar</Link>} />
  }
  if (isLoading || !person) return <PageLoader />

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Excluir pessoa',
      description: `Excluir "${person.name}"? Só é possível se não houver empréstimos dela.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteMutation.mutateAsync(person.id)
      showToast('Pessoa excluída.', 'success')
      navigate('/pessoas')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir pessoa.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link to="/pessoas" className="-mb-2 flex h-10 items-center gap-1 self-start text-sm font-medium text-text-secondary hover:text-text-primary">
        <Icon icon="tabler:arrow-left" className="size-4.5" />
        Pessoas
      </Link>

      <div className="flex items-start gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-xl font-semibold text-brand-300">
          {person.name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-text-primary sm:text-2xl">{person.name}</h1>
          <p className="text-sm text-text-secondary">{person.phone || 'Sem telefone'}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} aria-label="Editar pessoa">
          <Icon icon="tabler:pencil" className="size-5" />
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
          value={formatCurrency(totals.pending + totals.overdue)}
          icon="tabler:clock-dollar"
          tone={totals.overdue > 0 ? 'danger' : 'brand'}
          hint={totals.overdue > 0 ? `${formatCurrency(totals.overdue)} atrasado` : undefined}
          loading={loadingLoans}
        />
        <StatCard
          label="Já pagou"
          value={formatCurrency(totals.received)}
          icon="tabler:circle-check"
          tone="success"
          hint={`${totals.paidCount} empréstimo(s)`}
          loading={loadingLoans}
        />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-text-primary">Empréstimos</h2>
        <LoanList
          loans={sorted}
          loading={loadingLoans}
          showPerson={false}
          empty={<EmptyState icon="tabler:coins" title="Nenhum empréstimo para essa pessoa" />}
        />
      </section>

      {sorted.length === 0 && !loadingLoans && (
        <Button variant="ghost" onClick={handleDelete} className="self-center text-danger hover:bg-danger-muted hover:text-danger">
          <Icon icon="tabler:trash" className="size-4.5" />
          Excluir pessoa
        </Button>
      )}

      <PersonFormModal open={editOpen} onOpenChange={setEditOpen} person={person} />
    </div>
  )
}

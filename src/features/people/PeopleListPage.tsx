import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { RowAction } from '@/components/shared/RowAction'
import { WhatsAppButton } from '@/components/shared/WhatsAppButton'
import { formatCurrency, normalizeSearch, todayISO } from '@/lib/format'
import { useLoansQuery } from '@/features/loans/api/useLoans'
import { summarizeLoans, type LoanTotals } from '@/features/loans/status'
import type { Person } from '@/types/database'
import { useDeletePerson, usePeopleQuery } from './api/usePeople'
import { PersonFormModal } from './PersonFormModal'

export function PeopleListPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)
  const { data: people, isLoading } = usePeopleQuery()
  const { data: loans } = useLoansQuery()
  const deletePerson = useDeletePerson()
  const confirm = useConfirm()
  const { showToast } = useToast()

  // Uso pessoal: poucos registros, então somar no aparelho é simples e rápido.
  const totalsByPerson = useMemo(() => {
    const today = todayISO()
    const groups = new Map<string, NonNullable<typeof loans>>()
    for (const loan of loans ?? []) {
      const list = groups.get(loan.person_id) ?? []
      list.push(loan)
      groups.set(loan.person_id, list)
    }
    const result = new Map<string, LoanTotals>()
    for (const [id, list] of groups) result.set(id, summarizeLoans(list, today))
    return result
  }, [loans])

  const visible = useMemo(() => {
    const q = normalizeSearch(search.trim())
    if (!q) return people ?? []
    return (people ?? []).filter((p) => normalizeSearch(`${p.name} ${p.phone ?? ''}`).includes(q))
  }, [people, search])

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (person: Person) => {
    setEditing(person)
    setModalOpen(true)
  }

  const remove = async (person: Person) => {
    const loanCount = totalsByPerson.get(person.id)?.count ?? 0
    if (loanCount > 0) {
      showToast(
        `${person.name} tem ${loanCount} empréstimo(s) cadastrado(s). Exclua os empréstimos antes de excluir a pessoa.`,
        'warning',
      )
      return
    }
    const ok = await confirm({
      title: 'Excluir pessoa',
      description: `Excluir "${person.name}"? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deletePerson.mutateAsync(person.id)
      showToast('Pessoa excluída.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao excluir pessoa.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pessoas"
        actions={
          <Button onClick={openNew} variant="secondary" className="hidden sm:inline-flex">
            <Icon icon="tabler:user-plus" className="size-4.5" />
            Nova pessoa
          </Button>
        }
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon icon="tabler:search" className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pelo nome"
            enterKeyHint="search"
            className="h-12 w-full rounded-xl border border-border bg-surface pr-3 pl-10 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-brand-500 sm:h-10 sm:max-w-sm sm:text-sm"
          />
        </div>
        <Button variant="secondary" size="icon" onClick={openNew} aria-label="Nova pessoa" className="sm:hidden">
          <Icon icon="tabler:user-plus" className="size-5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="tabler:users"
          title={search ? 'Ninguém com esse nome' : 'Nenhuma pessoa cadastrada'}
          description={search ? undefined : 'Você também pode cadastrar a pessoa direto ao criar um empréstimo.'}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {visible.map((person) => {
            const t = totalsByPerson.get(person.id)
            const open = (t?.pending ?? 0) + (t?.overdue ?? 0)
            return (
              <li key={person.id} className="flex items-center pr-2">
                <Link
                  to={`/pessoas/${person.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 transition-colors active:bg-surface-hover"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-sm font-semibold text-brand-300">
                    {person.name.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-text-primary sm:text-sm">{person.name}</p>
                    <p className="truncate text-sm text-text-muted">
                      {open > 0 ? (
                        <>
                          Deve {formatCurrency(open)}
                          {t && t.overdueCount > 0 && <span className="text-danger"> · {t.overdueCount} atrasado(s)</span>}
                        </>
                      ) : (
                        person.phone || 'Nada em aberto'
                      )}
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center">
                  <WhatsAppButton phone={person.phone} />
                  <RowAction icon="tabler:pencil" label={`Editar ${person.name}`} onClick={() => openEdit(person)} />
                  <RowAction icon="tabler:trash" label={`Excluir ${person.name}`} tone="danger" onClick={() => remove(person)} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <PersonFormModal open={modalOpen} onOpenChange={setModalOpen} person={editing} />
    </div>
  )
}

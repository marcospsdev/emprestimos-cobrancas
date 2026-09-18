import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { TextField } from '@/components/ui/form/TextField'
import type { Person } from '@/types/database'
import { useDeletePerson, usePeopleQuery } from './api/usePeople'
import { PersonFormModal } from './PersonFormModal'

export function PeopleListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)

  const { data: people, isLoading } = usePeopleQuery(search)
  const deleteMutation = useDeletePerson()
  const { showToast } = useToast()
  const confirm = useConfirm()

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (person: Person, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(person)
    setModalOpen(true)
  }

  const handleDelete = async (person: Person, e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await confirm({
      title: 'Excluir pessoa',
      description: `Excluir "${person.name}"? Só é possível se não houver empréstimos vinculados.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteMutation.mutateAsync(person.id)
      showToast('Pessoa excluída.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao excluir pessoa.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pessoas"
        description="Clientes e tomadores de empréstimo"
        actions={
          <Button onClick={openNew}>
            <Icon icon="tabler:plus" className="size-4.5" />
            Nova pessoa
          </Button>
        }
      />

      <TextField
        placeholder="Buscar por nome..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:max-w-xs"
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !people || people.length === 0 ? (
        <EmptyState
          icon="tabler:users"
          title="Nenhuma pessoa cadastrada"
          description="Cadastre a primeira pessoa para começar a registrar empréstimos."
          action={
            <Button variant="secondary" size="sm" onClick={openNew}>
              Nova pessoa
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop/tablet: tabela */}
          <TableContainer className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((person) => (
                  <TableRow key={person.id} clickable onClick={() => navigate(`/pessoas/${person.id}`)}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell className="text-text-secondary">{person.cpf || '—'}</TableCell>
                    <TableCell className="text-text-secondary">{person.phone || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <RowActions person={person} onEdit={openEdit} onDelete={handleDelete} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Mobile: cards empilhados */}
          <div className="flex flex-col gap-2 sm:hidden">
            {people.map((person) => (
              <Card
                key={person.id}
                className="cursor-pointer p-4 active:bg-surface-hover"
                onClick={() => navigate(`/pessoas/${person.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">{person.name}</p>
                    <p className="mt-0.5 text-sm text-text-secondary">{person.phone || person.cpf || 'Sem contato'}</p>
                  </div>
                  <RowActions person={person} onEdit={openEdit} onDelete={handleDelete} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <PersonFormModal open={modalOpen} onOpenChange={setModalOpen} person={editing} />
    </div>
  )
}

function RowActions({
  person,
  onEdit,
  onDelete,
}: {
  person: Person
  onEdit: (person: Person, e: React.MouseEvent) => void
  onDelete: (person: Person, e: React.MouseEvent) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <Icon icon="tabler:dots-vertical" className="size-4.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => {}} onClick={(e) => onEdit(person, e)}>
          <Icon icon="tabler:edit" className="size-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {}}
          onClick={(e) => onDelete(person, e)}
          className="text-danger data-[highlighted]:text-danger"
        >
          <Icon icon="tabler:trash" className="size-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PersonInput } from '@/types/database'
import { createPerson, deletePerson, fetchPeople, fetchPerson, updatePerson } from './people'

export function usePeopleQuery() {
  return useQuery({ queryKey: ['people'], queryFn: fetchPeople })
}

export function usePersonQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['people', 'detail', id],
    queryFn: () => fetchPerson(id as string),
    enabled: !!id,
  })
}

// Pessoas aparecem embutidas nos empréstimos (nome/telefone), então qualquer
// mudança nelas também invalida a lista de empréstimos.
function useInvalidatePeople() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['people'] })
    queryClient.invalidateQueries({ queryKey: ['loans'] })
  }
}

export function useCreatePerson() {
  const invalidate = useInvalidatePeople()
  return useMutation({ mutationFn: createPerson, onSuccess: invalidate })
}

export function useUpdatePerson() {
  const invalidate = useInvalidatePeople()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PersonInput }) => updatePerson(id, payload),
    onSuccess: invalidate,
  })
}

export function useDeletePerson() {
  const invalidate = useInvalidatePeople()
  return useMutation({ mutationFn: deletePerson, onSuccess: invalidate })
}

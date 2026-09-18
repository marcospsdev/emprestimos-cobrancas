import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPerson, deletePerson, fetchPeople, fetchPerson, updatePerson } from './people'
import type { PersonInsert } from '@/types/database'

export function usePeopleQuery(search?: string) {
  return useQuery({
    queryKey: ['people', search ?? ''],
    queryFn: () => fetchPeople(search),
  })
}

export function usePersonQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['people', 'detail', id],
    queryFn: () => fetchPerson(id as string),
    enabled: !!id,
  })
}

export function useCreatePerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPerson,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] }),
  })
}

export function useUpdatePerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PersonInsert }) => updatePerson(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] }),
  })
}

export function useDeletePerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deletePerson,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] }),
  })
}

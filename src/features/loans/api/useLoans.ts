import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LoanInput } from '@/types/database'
import { createLoan, deleteLoan, fetchLoans, updateLoan, type LoanFilters } from './loans'

export function useLoansQuery(filters: LoanFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['loans', filters],
    queryFn: () => fetchLoans(filters),
    enabled: options.enabled ?? true,
  })
}

function useInvalidateLoans() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['loans'] })
}

export function useCreateLoan() {
  const invalidate = useInvalidateLoans()
  return useMutation({ mutationFn: createLoan, onSuccess: invalidate })
}

export function useUpdateLoan() {
  const invalidate = useInvalidateLoans()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LoanInput> }) => updateLoan(id, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteLoan() {
  const invalidate = useInvalidateLoans()
  return useMutation({ mutationFn: deleteLoan, onSuccess: invalidate })
}

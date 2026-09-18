import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLoan, fetchLoan, fetchLoans, renegotiateLoan, type LoanFilters } from './loans'

export function useLoansQuery(filters: LoanFilters = {}) {
  return useQuery({
    queryKey: ['loans', filters],
    queryFn: () => fetchLoans(filters),
  })
}

export function useLoanQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['loans', 'detail', id],
    queryFn: () => fetchLoan(id as string),
    enabled: !!id,
  })
}

function useInvalidateAfterLoanChange() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['loans'] })
    queryClient.invalidateQueries({ queryKey: ['installments'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useCreateLoan() {
  const invalidate = useInvalidateAfterLoanChange()
  return useMutation({
    mutationFn: createLoan,
    onSuccess: invalidate,
  })
}

export function useRenegotiateLoan() {
  const invalidate = useInvalidateAfterLoanChange()
  return useMutation({
    mutationFn: renegotiateLoan,
    onSuccess: invalidate,
  })
}

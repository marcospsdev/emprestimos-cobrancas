import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPayments, payInterest, undoInterest, type PaymentFilters } from './payments'

export function usePaymentsQuery(filters: PaymentFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => fetchPayments(filters),
    enabled: options.enabled ?? true,
  })
}

// Pagar juros muda o vencimento do empréstimo: atualiza as duas listas.
function useInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] })
    queryClient.invalidateQueries({ queryKey: ['loans'] })
  }
}

export function usePayInterest() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: payInterest, onSuccess: invalidate })
}

export function useUndoInterest() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: undoInterest, onSuccess: invalidate })
}

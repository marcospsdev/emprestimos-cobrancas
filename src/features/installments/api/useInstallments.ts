import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchInstallments,
  fetchPaymentsByLoan,
  fetchPaymentsByPerson,
  registerPayment,
  type InstallmentFilters,
} from './installments'

export function useInstallmentsQuery(filters: InstallmentFilters = {}) {
  return useQuery({
    queryKey: ['installments', filters],
    queryFn: () => fetchInstallments(filters),
  })
}

export function usePaymentsByLoanQuery(loanId: string | undefined) {
  return useQuery({
    queryKey: ['payments', 'loan', loanId],
    queryFn: () => fetchPaymentsByLoan(loanId as string),
    enabled: !!loanId,
  })
}

export function usePaymentsByPersonQuery(personId: string | undefined) {
  return useQuery({
    queryKey: ['payments', 'person', personId],
    queryFn: () => fetchPaymentsByPerson(personId as string),
    enabled: !!personId,
  })
}

export function useRegisterPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: registerPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

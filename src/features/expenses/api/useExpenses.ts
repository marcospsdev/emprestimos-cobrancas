import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ExpenseInput } from '@/types/database'
import {
  createExpense,
  createFixedExpense,
  deleteExpense,
  fetchExpenses,
  fetchFixedExpense,
  resumeFixedExpense,
  stopFixedExpense,
  updateExpense,
  updateFixedExpense,
  type ExpenseFilters,
} from './expenses'

export function useExpensesQuery(filters: ExpenseFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => fetchExpenses(filters),
    enabled: options.enabled ?? true,
  })
}

export function useFixedExpenseQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: ['fixed-expenses', id],
    queryFn: () => fetchFixedExpense(id as string),
    enabled: !!id,
  })
}

function useInvalidateExpenses() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] })
  }
}

export function useCreateExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({ mutationFn: createExpense, onSuccess: invalidate })
}

export function useUpdateExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ExpenseInput> }) => updateExpense(id, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({ mutationFn: deleteExpense, onSuccess: invalidate })
}

export function useCreateFixedExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({ mutationFn: createFixedExpense, onSuccess: invalidate })
}

export function useUpdateFixedExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({
    mutationFn: (args: { id: string; payload: Parameters<typeof updateFixedExpense>[1]; afterMonth: string }) =>
      updateFixedExpense(args.id, args.payload, args.afterMonth),
    onSuccess: invalidate,
  })
}

export function useResumeFixedExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({ mutationFn: resumeFixedExpense, onSuccess: invalidate })
}

export function useStopFixedExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({
    mutationFn: ({ id, lastMonth }: { id: string; lastMonth: string }) => stopFixedExpense(id, lastMonth),
    onSuccess: invalidate,
  })
}

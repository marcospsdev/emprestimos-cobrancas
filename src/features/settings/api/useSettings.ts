import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchCleanupCandidates,
  fetchSettings,
  fetchTableUsage,
  runCleanup,
  updateSettings,
} from './settings'

export function useSettingsQuery() {
  return useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useTableUsageQuery() {
  return useQuery({ queryKey: ['storage', 'table-usage'], queryFn: fetchTableUsage })
}

export function useCleanupCandidatesQuery() {
  return useQuery({ queryKey: ['storage', 'cleanup-candidates'], queryFn: fetchCleanupCandidates })
}

export function useRunCleanup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: runCleanup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage'] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
    },
  })
}

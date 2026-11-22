import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCleanupCandidates, fetchStorageUsage, runCleanup, type CleanupKey } from './storage'

export function useStorageUsageQuery() {
  return useQuery({ queryKey: ['storage', 'usage'], queryFn: fetchStorageUsage })
}

export function useCleanupCandidatesQuery() {
  return useQuery({ queryKey: ['storage', 'cleanup'], queryFn: fetchCleanupCandidates })
}

export function useRunCleanup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (key: CleanupKey) => runCleanup(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage'] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}

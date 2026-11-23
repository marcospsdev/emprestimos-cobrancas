import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PixInfo } from '../pix'
import { fetchSettings, saveSettings } from './settings'

export function useSettingsQuery() {
  return useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: 5 * 60 * 1000 })
}

/** Chave Pix pronta para a mensagem de cobrança, ou null se não cadastrada. */
export function usePixInfo(): PixInfo | null {
  const { data } = useSettingsQuery()
  if (!data?.pix_key || !data.pix_key_type) return null
  return { type: data.pix_key_type, key: data.pix_key, bank: data.pix_bank, holder: data.pix_holder }
}

export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: (data) => queryClient.setQueryData(['settings'], data),
  })
}

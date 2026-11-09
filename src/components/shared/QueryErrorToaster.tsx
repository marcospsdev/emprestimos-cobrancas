import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'

const DEDUPE_MS = 4000

/**
 * Avisa quando alguma consulta falha (ex.: sem internet). Sem isso a tela só
 * mostraria a lista vazia, como se não houvesse dados. As mutações (salvar,
 * excluir, marcar pago) já avisam o próprio erro onde são chamadas.
 */
export function QueryErrorToaster() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const lastShown = useRef<{ message: string; at: number } | null>(null)

  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'error') return
      const detail = event.action.error instanceof Error ? event.action.error.message : ''
      const message = navigator.onLine
        ? `Não foi possível carregar os dados.${detail ? ` (${detail})` : ''}`
        : 'Sem internet. Verifique a conexão e tente de novo.'
      // Várias telas falhando juntas (ex.: caiu a internet) viram um aviso só.
      const now = Date.now()
      if (lastShown.current && lastShown.current.message === message && now - lastShown.current.at < DEDUPE_MS) return
      lastShown.current = { message, at: now }
      showToast(message, 'error')
    })
  }, [queryClient, showToast])

  return null
}

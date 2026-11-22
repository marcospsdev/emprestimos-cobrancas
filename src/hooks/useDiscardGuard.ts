import { useCallback } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'

interface DiscardGuardOptions {
  /** Algo foi digitado/alterado no formulário. */
  dirty: boolean
  /** Edição pergunta sobre "alterações"; cadastro, sobre o "cadastro". */
  isEdit: boolean
  /** Enquanto salva, não fecha. */
  busy?: boolean
  onClose: () => void
}

/**
 * Fechar um formulário (X, clique fora, Esc, arrastar, Cancelar) com dados
 * preenchidos pede confirmação antes de descartar. Sem mudanças, fecha direto.
 * Retorna o handler para o `onOpenChange` do Dialog e o `requestClose`.
 */
export function useDiscardGuard({ dirty, isEdit, busy, onClose }: DiscardGuardOptions) {
  const confirm = useConfirm()

  const requestClose = useCallback(async () => {
    if (busy) return
    if (dirty) {
      const ok = await confirm({
        title: isEdit ? 'Descartar alterações?' : 'Descartar cadastro?',
        description: isEdit
          ? 'As alterações que você fez não serão salvas.'
          : 'O que você preencheu não será salvo.',
        confirmLabel: 'Descartar',
        cancelLabel: 'Continuar editando',
        variant: 'danger',
      })
      if (!ok) return
    }
    onClose()
  }, [busy, dirty, isEdit, confirm, onClose])

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (!next) void requestClose()
    },
    [requestClose],
  )

  return { onOpenChange, requestClose }
}

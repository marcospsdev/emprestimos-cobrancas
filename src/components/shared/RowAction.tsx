import type { MouseEvent } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'

interface RowActionProps {
  icon: string
  label: string
  onClick: () => void
  tone?: 'neutral' | 'danger'
  disabled?: boolean
}

/**
 * Botão de ícone para ações dentro de uma linha de lista (editar, excluir...).
 * Não propaga o clique, para não disparar a ação da linha inteira.
 */
export function RowAction({ icon, label, onClick, tone = 'neutral', disabled }: RowActionProps) {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        'flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors disabled:opacity-50 sm:size-9 sm:rounded-lg',
        tone === 'danger'
          ? 'text-text-muted hover:bg-danger-muted hover:text-danger active:bg-danger-muted active:text-danger'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary active:bg-surface-hover',
      )}
    >
      <Icon icon={icon} className="size-5 sm:size-4.5" />
    </button>
  )
}

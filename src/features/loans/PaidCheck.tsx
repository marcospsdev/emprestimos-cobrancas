import type { MouseEvent } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'

interface PaidCheckProps {
  paid: boolean
  overdue?: boolean
  onToggle: () => void
  disabled?: boolean
}

/** O "check" de pago: círculo grande (44px) fácil de acertar com o dedo. */
export function PaidCheck({ paid, overdue, onToggle, disabled }: PaidCheckProps) {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    onToggle()
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={paid}
      aria-label={paid ? 'Pago — tocar para desmarcar' : 'Marcar como pago'}
      title={paid ? 'Desmarcar pagamento' : 'Marcar como pago'}
      onClick={handleClick}
      disabled={disabled}
      className="group flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:opacity-50"
    >
      <span
        className={cn(
          'flex size-7 items-center justify-center rounded-full border-2 transition-colors',
          paid
            ? 'border-success bg-success text-background'
            : overdue
              ? 'border-danger/70 text-transparent group-hover:bg-danger-muted group-hover:text-danger'
              : 'border-border-strong text-transparent group-hover:border-success group-hover:text-success',
        )}
      >
        <Icon icon="tabler:check" className="size-4.5" />
      </span>
    </button>
  )
}

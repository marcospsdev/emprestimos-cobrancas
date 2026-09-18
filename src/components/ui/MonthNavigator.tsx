import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'

interface MonthNavigatorProps {
  month: Date
  onChange: (month: Date) => void
  className?: string
}

export function MonthNavigator({ month, onChange, className }: MonthNavigatorProps) {
  const rawLabel = format(month, "MMMM 'de' yyyy", { locale: ptBR })
  const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1', className)}>
      <button
        type="button"
        onClick={() => onChange(subMonths(month, 1))}
        title="Mês anterior"
        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-brand-500/10 hover:text-brand-400"
      >
        <Icon icon="tabler:chevron-left" className="size-4.5" />
      </button>
      <span className="min-w-36 text-center text-sm font-medium text-text-primary">{label}</span>
      <button
        type="button"
        onClick={() => onChange(addMonths(month, 1))}
        title="Próximo mês"
        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-brand-500/10 hover:text-brand-400"
      >
        <Icon icon="tabler:chevron-right" className="size-4.5" />
      </button>
    </div>
  )
}

export function getMonthRange(month: Date) {
  return {
    from: format(startOfMonth(month), 'yyyy-MM-dd'),
    to: format(endOfMonth(month), 'yyyy-MM-dd'),
  }
}

import { addMonths, endOfMonth, format, isSameMonth, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'

interface MonthNavigatorProps {
  month: Date
  onChange: (month: Date) => void
  className?: string
}

export function formatMonthLabel(month: Date) {
  const raw = format(month, "MMMM 'de' yyyy", { locale: ptBR })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

const arrowClass =
  'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-brand-500/10 hover:text-brand-400 active:bg-brand-500/15 sm:size-9 sm:rounded-lg'

/** Mês anterior / próximo. Ocupa a largura toda no celular. */
export function MonthNavigator({ month, onChange, className }: MonthNavigatorProps) {
  const isCurrent = isSameMonth(month, new Date())

  return (
    <div
      className={cn(
        'flex w-full items-center gap-1 rounded-2xl border border-border bg-surface p-1 sm:inline-flex sm:w-auto sm:rounded-xl',
        className,
      )}
    >
      <button type="button" onClick={() => onChange(subMonths(month, 1))} aria-label="Mês anterior" className={arrowClass}>
        <Icon icon="tabler:chevron-left" className="size-5" />
      </button>
      <div className="flex min-w-40 flex-1 flex-col items-center leading-tight">
        <span className="text-base font-semibold text-text-primary sm:text-sm">{formatMonthLabel(month)}</span>
        {!isCurrent && (
          <button
            type="button"
            onClick={() => onChange(startOfMonth(new Date()))}
            className="cursor-pointer text-xs font-medium text-brand-400 hover:underline"
          >
            Voltar para o mês atual
          </button>
        )}
      </div>
      <button type="button" onClick={() => onChange(addMonths(month, 1))} aria-label="Próximo mês" className={arrowClass}>
        <Icon icon="tabler:chevron-right" className="size-5" />
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

import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'

interface YearNavigatorProps {
  year: number
  onChange: (year: number) => void
  className?: string
}

export function YearNavigator({ year, onChange, className }: YearNavigatorProps) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1', className)}>
      <button
        type="button"
        onClick={() => onChange(year - 1)}
        title="Ano anterior"
        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-brand-500/10 hover:text-brand-400"
      >
        <Icon icon="tabler:chevron-left" className="size-4.5" />
      </button>
      <span className="min-w-20 text-center text-sm font-medium text-text-primary">{year}</span>
      <button
        type="button"
        onClick={() => onChange(year + 1)}
        title="Próximo ano"
        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-brand-500/10 hover:text-brand-400"
      >
        <Icon icon="tabler:chevron-right" className="size-4.5" />
      </button>
    </div>
  )
}

export function getYearRange(year: number) {
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  }
}

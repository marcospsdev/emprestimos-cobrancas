import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { LoanStatus } from '@/types/database'
import { STATUS_BADGE_VARIANT, STATUS_BG_CLASS, STATUS_LABEL, STATUS_ORDER } from './status'

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  return <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}

/** Legenda das cores de status, exibida acima das listas. */
export function LoanStatusLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary', className)} aria-label="Legenda de status">
      {STATUS_ORDER.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span className={cn('h-3 w-1.5 rounded-full', STATUS_BG_CLASS[status])} aria-hidden />
          {STATUS_LABEL[status]}
        </li>
      ))}
    </ul>
  )
}

import { Icon } from '@iconify/react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { LoanStatus } from '@/types/database'
import { STATUS_BADGE_VARIANT, STATUS_BG_CLASS, STATUS_ICON, STATUS_LABEL, STATUS_ORDER, STATUS_TEXT_CLASS } from './status'

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]} className="gap-1 px-2 py-1 text-xs">
      <Icon icon={STATUS_ICON[status]} className="size-3.5 shrink-0" aria-hidden />
      {STATUS_LABEL[status]}
    </Badge>
  )
}

/** Legenda das cores de status, exibida acima das listas. */
export function LoanStatusLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary sm:text-xs', className)} aria-label="Legenda de status">
      {STATUS_ORDER.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span className={cn('h-3.5 w-1.5 rounded-full', STATUS_BG_CLASS[status])} aria-hidden />
          <Icon icon={STATUS_ICON[status]} className={cn('size-4 sm:size-3.5', STATUS_TEXT_CLASS[status])} aria-hidden />
          {STATUS_LABEL[status]}
        </li>
      ))}
    </ul>
  )
}

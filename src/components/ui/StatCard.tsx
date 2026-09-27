import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'
import { Skeleton } from './Skeleton'

export type StatTone = 'brand' | 'gold' | 'success' | 'danger' | 'neutral'

interface StatCardProps {
  label: string
  value: string
  icon: string
  loading?: boolean
  hint?: string
  tone?: StatTone
  className?: string
}

const toneStyles: Record<StatTone, string> = {
  brand: 'text-brand-400 bg-brand-500/10',
  gold: 'text-gold-400 bg-gold-muted',
  success: 'text-success bg-success-muted',
  danger: 'text-danger bg-danger-muted',
  neutral: 'text-text-secondary bg-surface-elevated',
}

export function StatCard({ label, value, icon, loading, hint, tone = 'neutral', className }: StatCardProps) {
  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-4', className)}>
      <div className="flex items-center gap-2">
        <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', toneStyles[tone])}>
          <Icon icon={icon} className="size-4" />
        </div>
        <p className="truncate text-xs font-medium text-text-secondary sm:text-sm">{label}</p>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-24" />
      ) : (
        <p
          className={cn(
            'mt-2 text-base font-semibold tracking-tight break-words min-[380px]:text-lg sm:text-xl',
            tone === 'danger' ? 'text-danger' : tone === 'gold' ? 'text-gold-400' : 'text-text-primary',
          )}
        >
          {value}
        </p>
      )}
      {hint && !loading && <p className="mt-0.5 truncate text-xs text-text-muted">{hint}</p>}
    </div>
  )
}

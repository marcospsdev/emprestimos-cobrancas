import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'
import { GlassSurface } from '@/components/effects/GlassSurface'
import { Skeleton } from './Skeleton'

interface StatCardProps {
  label: string
  value: string
  icon: string
  loading?: boolean
  trend?: { value: string; positive: boolean }
  tone?: 'brand' | 'gold' | 'success' | 'danger' | 'neutral'
}

const toneStyles: Record<NonNullable<StatCardProps['tone']>, string> = {
  brand: 'text-brand-400 bg-brand-500/10 border-brand-600/30',
  gold: 'text-gold-400 bg-gold-muted border-gold-600/30',
  success: 'text-success bg-success-muted border-success/30',
  danger: 'text-danger bg-danger-muted border-danger/30',
  neutral: 'text-text-secondary bg-surface-elevated border-border-strong',
}

export function StatCard({ label, value, icon, loading, trend, tone = 'brand' }: StatCardProps) {
  return (
    <GlassSurface
      borderRadius={12}
      backgroundOpacity={0.55}
      distortionScale={-40}
      blur={9}
      saturation={1.15}
      contentClassName="p-5"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-text-secondary">{label}</p>
        <div className={cn('flex size-9 items-center justify-center rounded-lg border', toneStyles[tone])}>
          <Icon icon={icon} className="size-4.5" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">{value}</p>
      )}
      {trend && !loading && (
        <p
          className={cn(
            'mt-2 flex items-center gap-1 text-xs font-medium',
            trend.positive ? 'text-success' : 'text-danger',
          )}
        >
          <Icon icon={trend.positive ? 'tabler:trending-up' : 'tabler:trending-down'} className="size-3.5" />
          {trend.value}
        </p>
      )}
    </GlassSurface>
  )
}

import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'border-border-strong bg-surface-elevated text-text-secondary',
        brand: 'border-brand-600/40 bg-brand-500/10 text-brand-300',
        gold: 'border-gold-600/40 bg-gold-muted text-gold-400',
        success: 'border-success/30 bg-success-muted text-success',
        danger: 'border-danger/30 bg-danger-muted text-danger',
        warning: 'border-warning/30 bg-warning-muted text-warning',
        info: 'border-info/30 bg-info-muted text-info',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}

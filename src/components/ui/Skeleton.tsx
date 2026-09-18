import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-md bg-[linear-gradient(110deg,var(--color-surface-elevated)_8%,var(--color-surface-hover)_18%,var(--color-surface-elevated)_33%)] bg-[length:200%_100%]',
        className,
      )}
      {...props}
    />
  )
}

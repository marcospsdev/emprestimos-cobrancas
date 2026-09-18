import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  textClassName?: string
}

const sizeClasses = {
  sm: { icon: 'size-4.5', text: 'text-sm' },
  md: { icon: 'size-6', text: 'text-lg' },
  lg: { icon: 'size-9', text: 'text-2xl' },
}

export function BrandMark({ size = 'md', className, textClassName }: BrandMarkProps) {
  const { icon, text } = sizeClasses[size]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Icon icon="tabler:hand-coins" className={cn(icon, 'shrink-0 text-brand-400')} />
      <span className={cn(text, 'font-semibold tracking-tight text-text-primary whitespace-nowrap', textClassName)}>
        MeusEmpréstimos
      </span>
    </div>
  )
}

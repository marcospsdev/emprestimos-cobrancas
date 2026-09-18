import type { LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({ className, children, required, ...props }: LabelProps) {
  return (
    <label className={cn('mb-1.5 block text-sm font-medium text-text-secondary', className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-brand-500">*</span>}
    </label>
  )
}

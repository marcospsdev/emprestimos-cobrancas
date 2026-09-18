import type { ReactNode } from 'react'
import { Label } from './Label'
import { cn } from '@/lib/cn'

interface FieldShellProps {
  label?: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}

export function FieldShell({ label, htmlFor, required, error, hint, className, children }: FieldShellProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

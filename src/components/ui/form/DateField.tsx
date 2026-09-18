import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { FieldShell } from './FieldShell'
import { inputBaseClass, inputErrorClass } from './inputStyles'

export interface DateFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  ({ label, error, hint, required, className, id, ...props }, ref) => {
    const autoId = useId()
    const fieldId = id ?? autoId
    return (
      <FieldShell label={label} htmlFor={fieldId} required={required} error={error} hint={hint}>
        <input
          ref={ref}
          id={fieldId}
          type="date"
          className={cn(inputBaseClass, 'pr-8 [color-scheme:dark]', error && inputErrorClass, className)}
          aria-invalid={!!error}
          {...props}
        />
      </FieldShell>
    )
  },
)
DateField.displayName = 'DateField'

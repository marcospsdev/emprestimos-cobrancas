import { forwardRef, useId } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { FieldShell } from './FieldShell'
import { inputBaseClass, inputErrorClass } from './inputStyles'

export interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, hint, required, className, id, rows = 3, ...props }, ref) => {
    const autoId = useId()
    const fieldId = id ?? autoId
    return (
      <FieldShell label={label} htmlFor={fieldId} required={required} error={error} hint={hint}>
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          className={cn(inputBaseClass, 'h-auto resize-none py-2', error && inputErrorClass, className)}
          aria-invalid={!!error}
          {...props}
        />
      </FieldShell>
    )
  },
)
TextareaField.displayName = 'TextareaField'

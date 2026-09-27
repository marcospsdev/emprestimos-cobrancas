import { forwardRef, useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'
import { FieldShell } from './FieldShell'
import { inputBaseClass, inputErrorClass } from './inputStyles'

export interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, hint, required, className, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    const autoId = useId()
    const fieldId = id ?? autoId
    return (
      <FieldShell label={label} htmlFor={fieldId} required={required} error={error} hint={hint}>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={visible ? 'text' : 'password'}
            className={cn(inputBaseClass, 'pr-12 sm:pr-10', error && inputErrorClass, className)}
            aria-invalid={!!error}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg sm:right-1 sm:size-8 sm:rounded-md text-text-muted transition-colors hover:text-text-primary"
            tabIndex={-1}
          >
            <Icon icon={visible ? 'tabler:eye-off' : 'tabler:eye'} className="size-4.5" />
          </button>
        </div>
      </FieldShell>
    )
  },
)
PasswordField.displayName = 'PasswordField'

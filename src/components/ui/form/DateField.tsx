import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, MouseEvent } from 'react'
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
  ({ label, error, hint, required, className, id, onClick, ...props }, ref) => {
    const autoId = useId()
    const fieldId = id ?? autoId

    // Por padrão o navegador só abre o calendário clicando no ícone; aqui
    // qualquer toque/clique no campo abre. showPicker() pode não existir
    // (navegadores antigos) ou lançar erro — aí fica o comportamento nativo.
    const handleClick = (e: MouseEvent<HTMLInputElement>) => {
      onClick?.(e)
      if (e.defaultPrevented || props.disabled || props.readOnly) return
      try {
        e.currentTarget.showPicker?.()
      } catch {
        /* comportamento nativo */
      }
    }

    return (
      <FieldShell label={label} htmlFor={fieldId} required={required} error={error} hint={hint}>
        <input
          ref={ref}
          id={fieldId}
          type="date"
          onClick={handleClick}
          className={cn(inputBaseClass, 'cursor-pointer pr-8 [color-scheme:dark]', error && inputErrorClass, className)}
          aria-invalid={!!error}
          {...props}
        />
      </FieldShell>
    )
  },
)
DateField.displayName = 'DateField'

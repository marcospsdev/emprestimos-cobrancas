import { useId } from 'react'
import { NumericFormat } from 'react-number-format'
import { cn } from '@/lib/cn'
import { FieldShell } from './FieldShell'
import { inputBaseClass, inputErrorClass } from './inputStyles'

export interface PercentFieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  value: number | null | undefined
  onValueChange: (value: number | null) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

/** Porcentagem com vírgula (ex.: 12,5 %), teclado numérico no celular. */
export function PercentField({
  label,
  error,
  hint,
  required,
  className,
  value,
  onValueChange,
  placeholder = '0 %',
  disabled,
  id,
}: PercentFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldShell label={label} htmlFor={fieldId} required={required} error={error} hint={hint}>
      <NumericFormat
        id={fieldId}
        value={value ?? ''}
        onValueChange={(values) => onValueChange(values.floatValue ?? null)}
        onFocus={(e) => e.currentTarget.select()}
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={2}
        suffix=" %"
        inputMode="decimal"
        enterKeyHint="next"
        allowNegative={false}
        isAllowed={(values) => (values.floatValue ?? 0) <= 9999}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(inputBaseClass, error && inputErrorClass, className)}
        aria-invalid={!!error}
      />
    </FieldShell>
  )
}

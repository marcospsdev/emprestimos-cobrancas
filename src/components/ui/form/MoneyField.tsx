import { useId } from 'react'
import { NumericFormat } from 'react-number-format'
import { cn } from '@/lib/cn'
import { FieldShell } from './FieldShell'
import { inputBaseClass, inputErrorClass } from './inputStyles'

export interface MoneyFieldProps {
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

export function MoneyField({
  label,
  error,
  hint,
  required,
  className,
  value,
  onValueChange,
  placeholder = 'R$ 0,00',
  disabled,
  id,
}: MoneyFieldProps) {
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
        fixedDecimalScale
        prefix="R$ "
        allowNegative={false}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(inputBaseClass, error && inputErrorClass, className)}
        aria-invalid={!!error}
      />
    </FieldShell>
  )
}

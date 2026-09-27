import { cn } from '@/lib/cn'
import { Label } from '@/components/ui/form/Label'
import { PAYMENT_METHODS } from './status'

interface PaymentMethodPickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

/** Botões grandes em vez de campo de texto: um toque escolhe, outro toque desmarca. Opcional. */
export function PaymentMethodPicker({ value, onChange, label = 'Forma de pagamento (opcional)' }: PaymentMethodPickerProps) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {PAYMENT_METHODS.map((method) => {
          const active = value === method
          return (
            <button
              key={method}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(active ? '' : method)}
              className={cn(
                'h-11 cursor-pointer rounded-xl border px-4 text-sm font-medium transition-colors sm:h-9 sm:rounded-lg sm:px-3',
                active
                  ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                  : 'border-border-strong bg-surface-elevated text-text-secondary hover:bg-surface-hover',
              )}
            >
              {method}
            </button>
          )
        })}
      </div>
    </div>
  )
}

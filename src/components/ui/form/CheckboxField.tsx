import { useId } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'

export interface CheckboxFieldProps {
  label: string
  /** Texto de apoio embaixo do rótulo. */
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

/**
 * Checkbox do app (no lugar do nativo do navegador): a linha inteira é
 * tocável (≥ 48px), a caixa tem 24px e, marcada, fica verde com o check
 * branco e a linha ganha um fundo verde leve. Usa um <input> de verdade
 * (escondido) para teclado e leitor de tela.
 */
export function CheckboxField({ label, description, checked, onChange, disabled, className, id }: CheckboxFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId

  return (
    <label
      htmlFor={fieldId}
      className={cn(
        'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors select-none',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/40',
        checked
          ? 'border-success/50 bg-success-muted'
          : 'border-border-strong bg-surface-elevated hover:bg-surface-hover',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        id={fieldId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
          checked ? 'border-success bg-success text-white' : 'border-border-strong bg-surface',
        )}
      >
        <Icon
          icon="tabler:check"
          className={cn('size-4 transition-transform duration-150', checked ? 'scale-100' : 'scale-0')}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-base font-medium sm:text-sm', checked ? 'text-success' : 'text-text-primary')}>
          {label}
        </span>
        {description && <span className="mt-0.5 block text-sm text-text-secondary sm:text-xs">{description}</span>}
      </span>
    </label>
  )
}

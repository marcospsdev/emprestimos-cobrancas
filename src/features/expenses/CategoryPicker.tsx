import { Icon } from '@iconify/react'
import { Label } from '@/components/ui/form/Label'
import { cn } from '@/lib/cn'
import { EXPENSE_CATEGORIES, getCategory } from './categories'

interface CategoryPickerProps {
  value: string
  onChange: (key: string) => void
  error?: string
}

/** Categorias como botões grandes com ícone e nome (mais fácil que uma lista suspensa). */
export function CategoryPicker({ value, onChange, error }: CategoryPickerProps) {
  const selected = value ? getCategory(value) : null
  return (
    <div className="flex flex-col">
      <Label required>Categoria</Label>
      <div role="radiogroup" aria-label="Categoria" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {EXPENSE_CATEGORIES.map((cat) => {
          const active = cat.key === value
          return (
            <button
              key={cat.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(cat.key)}
              className={cn(
                'flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center text-xs font-medium leading-tight transition-colors',
                active
                  ? 'border-brand-500 bg-brand-500/12 text-brand-300'
                  : 'border-border-strong bg-surface-elevated text-text-secondary hover:bg-surface-hover active:bg-surface-hover',
              )}
            >
              <Icon icon={cat.icon} className="size-5.5 shrink-0" />
              {cat.label}
            </button>
          )
        })}
      </div>
      {error ? (
        <p className="mt-1.5 text-sm text-danger">{error}</p>
      ) : (
        selected && <p className="mt-1.5 text-sm text-text-muted">{selected.hint}</p>
      )}
    </div>
  )
}

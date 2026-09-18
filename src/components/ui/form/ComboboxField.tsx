import { useId, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/cn'
import { FieldShell } from './FieldShell'
import { inputBaseClass, inputErrorClass } from './inputStyles'

export interface ComboboxOption {
  value: string
  label: string
  description?: string
}

export interface ComboboxFieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  placeholder?: string
  searchPlaceholder?: string
  options: ComboboxOption[]
  value: string | null
  onChange: (value: string | null) => void
  onCreateNew?: () => void
  createNewLabel?: string
  emptyMessage?: string
  disabled?: boolean
  clearable?: boolean
  className?: string
}

export function ComboboxField({
  label,
  error,
  hint,
  required,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Buscar...',
  options,
  value,
  onChange,
  onCreateNew,
  createNewLabel = 'Cadastrar novo',
  emptyMessage = 'Nenhum resultado encontrado',
  disabled,
  clearable = true,
  className,
}: ComboboxFieldProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const autoId = useId()

  const selected = options.find((o) => o.value === value) ?? null

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q),
    )
  }, [options, query])

  return (
    <FieldShell label={label} htmlFor={autoId} required={required} error={error} hint={hint} className={className}>
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery('')
        }}
      >
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            id={autoId}
            disabled={disabled}
            className={cn(
              inputBaseClass,
              'cursor-pointer justify-between text-left',
              !selected && 'text-text-muted',
              error && inputErrorClass,
            )}
          >
            <span className="flex min-w-0 flex-col items-start truncate">
              <span className="truncate">{selected ? selected.label : placeholder}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {selected && clearable && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(null)
                  }}
                  className="cursor-pointer rounded p-0.5 text-text-muted hover:text-text-primary"
                >
                  <Icon icon="tabler:x" className="size-3.5" />
                </span>
              )}
              <Icon icon="tabler:chevron-down" className="size-4 text-text-muted" />
            </span>
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg border border-border-strong bg-surface-elevated shadow-card data-[state=open]:animate-fade-in"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Icon icon="tabler:search" className="size-4 text-text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-text-muted">{emptyMessage}</p>
              ) : (
                filtered.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                      setQuery('')
                    }}
                    className={cn(
                      'flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover',
                      opt.value === value ? 'text-brand-300' : 'text-text-primary',
                    )}
                  >
                    <span className="flex w-full items-center gap-2">
                      {opt.value === value && <Icon icon="tabler:check" className="size-3.5 shrink-0" />}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {opt.description && (
                      <span className="pl-5 text-xs text-text-muted">{opt.description}</span>
                    )}
                  </button>
                ))
              )}
            </div>
            {onCreateNew && (
              <div className="border-t border-border p-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setQuery('')
                    onCreateNew()
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-brand-400 transition-colors hover:bg-brand-500/10"
                >
                  <Icon icon="tabler:plus" className="size-4" />
                  {createNewLabel}
                </button>
              </div>
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </FieldShell>
  )
}

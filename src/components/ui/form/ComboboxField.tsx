import { useId, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/cn'
import { isTouchDevice } from '@/lib/device'
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
  /** Recebe o texto digitado na busca, para já preencher o cadastro novo. */
  onCreateNew?: (query: string) => void
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
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q))
  }, [options, query])

  const close = () => {
    setOpen(false)
    setQuery('')
  }

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
            <span className="min-w-0 truncate">{selected ? selected.label : placeholder}</span>
            <span className="flex shrink-0 items-center gap-1">
              {selected && clearable && !disabled && (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label="Limpar"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(null)
                  }}
                  className="cursor-pointer rounded p-1 text-text-muted hover:text-text-primary"
                >
                  <Icon icon="tabler:x" className="size-4" />
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
            collisionPadding={12}
            // No celular, abrir a lista NÃO deve focar a busca (abriria o
            // teclado e esconderia metade das opções). A pessoa toca na busca
            // se quiser digitar. No computador, focar a busca agiliza.
            onOpenAutoFocus={(e) => {
              if (isTouchDevice()) e.preventDefault()
            }}
            className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-border-strong bg-surface-elevated shadow-card data-[state=open]:animate-fade-in"
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Icon icon="tabler:search" className="size-4 shrink-0 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                enterKeyHint="search"
                className="h-12 w-full bg-transparent text-base text-text-primary placeholder:text-text-muted outline-none sm:h-10 sm:text-sm"
              />
            </div>
            <div className="max-h-[min(16rem,40dvh)] overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-text-muted">{emptyMessage}</p>
              ) : (
                filtered.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value)
                      close()
                    }}
                    className={cn(
                      'flex min-h-12 w-full cursor-pointer flex-col items-start justify-center gap-0.5 rounded-lg px-3 py-2 text-left text-base transition-colors hover:bg-surface-hover sm:min-h-10 sm:text-sm',
                      opt.value === value ? 'text-brand-300' : 'text-text-primary',
                    )}
                  >
                    <span className="flex w-full items-center gap-2">
                      {opt.value === value && <Icon icon="tabler:check" className="size-4 shrink-0" />}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {opt.description && <span className="text-xs text-text-muted">{opt.description}</span>}
                  </button>
                ))
              )}
            </div>
            {onCreateNew && (
              <div className="border-t border-border p-1">
                <button
                  type="button"
                  onClick={() => {
                    const typed = query.trim()
                    close()
                    onCreateNew(typed)
                  }}
                  className="flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-base font-medium text-brand-400 transition-colors hover:bg-brand-500/10 sm:min-h-10 sm:text-sm"
                >
                  <Icon icon="tabler:user-plus" className="size-4.5" />
                  {query.trim() ? `${createNewLabel}: "${query.trim()}"` : createNewLabel}
                </button>
              </div>
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </FieldShell>
  )
}

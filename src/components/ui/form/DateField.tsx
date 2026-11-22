import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Icon } from '@iconify/react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {
  addDays,
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  setMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/cn'
import { isTouchDevice } from '@/lib/device'
import { formatDate } from '@/lib/format'
import { FieldShell } from './FieldShell'
import { inputBaseClass, inputErrorClass } from './inputStyles'

export interface DateFieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  /** Data em yyyy-MM-dd ('' = vazio), igual ao que o banco guarda. */
  value: string | null | undefined
  onChange: (value: string) => void
  onBlur?: () => void
  /** Limites opcionais (yyyy-MM-dd). */
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

const ISO = 'yyyy-MM-dd'
const WEEK_OPTIONS = { weekStartsOn: 0 as const } // domingo, como no calendário brasileiro
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = parseISO(value)
  return isValid(d) ? d : null
}

/**
 * Campo de data com calendário próprio (sem o seletor nativo do navegador),
 * no visual do app. Valor sempre em yyyy-MM-dd, na data local.
 */
export function DateField({
  label,
  error,
  hint,
  required,
  value,
  onChange,
  onBlur,
  min,
  max,
  placeholder = 'Escolher data',
  disabled,
  className,
  id,
}: DateFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const [open, setOpen] = useState(false)
  const selected = toDate(value)

  return (
    <FieldShell label={label} htmlFor={fieldId} required={required} error={error} hint={hint} className={className}>
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) onBlur?.()
        }}
      >
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            id={fieldId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-haspopup="dialog"
            className={cn(
              inputBaseClass,
              'cursor-pointer justify-between gap-2 text-left',
              !selected && 'text-text-muted',
              error && inputErrorClass,
            )}
          >
            <span className="min-w-0 truncate">
              {selected ? (
                <>
                  {formatDate(value)}
                  <span className="ml-2 text-sm text-text-muted sm:text-xs">{WEEKDAY_NAMES[selected.getDay()]}</span>
                </>
              ) : (
                placeholder
              )}
            </span>
            <Icon icon="tabler:calendar" className="size-4.5 shrink-0 text-text-muted" />
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            // O próprio calendário decide o foco (dia selecionado no computador, nada no celular).
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="z-50 rounded-2xl border border-border-strong bg-surface-elevated p-3 shadow-card outline-none data-[state=open]:animate-fade-in sm:rounded-xl"
          >
            <Calendar
              selected={selected}
              min={toDate(min)}
              max={toDate(max)}
              clearable={!required && !!selected}
              onSelect={(d) => {
                onChange(d ? format(d, ISO) : '')
                setOpen(false)
                onBlur?.()
              }}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </FieldShell>
  )
}

interface CalendarProps {
  selected: Date | null
  min: Date | null
  max: Date | null
  clearable: boolean
  onSelect: (date: Date | null) => void
}

function Calendar({ selected, min, max, clearable, onSelect }: CalendarProps) {
  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState<'days' | 'months'>('days')
  const [month, setMonthState] = useState(() => startOfMonth(selected ?? today))
  const [focused, setFocused] = useState<Date>(() => selected ?? today)
  const gridRef = useRef<HTMLDivElement>(null)
  // No computador, ao abrir já foca o dia (setas navegam); no celular não foca nada.
  const keyboardNav = useRef(!isTouchDevice())

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), WEEK_OPTIONS),
        end: endOfWeek(endOfMonth(month), WEEK_OPTIONS),
      }),
    [month],
  )

  const isDisabled = (d: Date) =>
    (min && format(d, ISO) < format(min, ISO)) || (max && format(d, ISO) > format(max, ISO)) || false

  // Depois de navegar pelo teclado, leva o foco para o dia destacado.
  useEffect(() => {
    if (!keyboardNav.current) return
    keyboardNav.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${format(focused, ISO)}"]`)?.focus()
  }, [focused, month])

  const moveFocus = (next: Date) => {
    keyboardNav.current = true
    setFocused(next)
    if (!isSameMonth(next, month)) setMonthState(startOfMonth(next))
  }

  const onGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
      Home: () => startOfWeek(focused, WEEK_OPTIONS),
      End: () => endOfWeek(focused, WEEK_OPTIONS),
    }
    const fn = map[e.key]
    if (!fn) return
    e.preventDefault()
    moveFocus(fn())
  }

  const monthTitle = format(month, "MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="w-[19.5rem] max-w-[calc(100vw-3rem)] select-none sm:w-[17.5rem]">
      {/* Cabeçalho: ‹ mês/ano › — tocar no título troca para a escolha de mês/ano */}
      <div className="mb-2 flex items-center justify-between gap-1">
        <NavButton
          label={view === 'days' ? 'Mês anterior' : 'Ano anterior'}
          icon="tabler:chevron-left"
          onClick={() => setMonthState((m) => (view === 'days' ? addMonths(m, -1) : addYears(m, -1)))}
        />
        <button
          type="button"
          onClick={() => setView((v) => (v === 'days' ? 'months' : 'days'))}
          className="flex h-11 min-w-0 cursor-pointer items-center gap-1 rounded-lg px-3 text-base font-semibold text-text-primary capitalize transition-colors hover:bg-surface-hover sm:h-9 sm:text-sm"
          aria-label={view === 'days' ? 'Escolher mês e ano' : 'Voltar para os dias'}
        >
          {view === 'days' ? monthTitle : format(month, 'yyyy')}
          <Icon icon={view === 'days' ? 'tabler:chevron-down' : 'tabler:chevron-up'} className="size-4 text-text-muted" />
        </button>
        <NavButton
          label={view === 'days' ? 'Próximo mês' : 'Próximo ano'}
          icon="tabler:chevron-right"
          onClick={() => setMonthState((m) => (view === 'days' ? addMonths(m, 1) : addYears(m, 1)))}
        />
      </div>

      {view === 'months' ? (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => {
            const m = setMonth(month, i)
            const active = selected && isSameMonth(m, selected)
            const current = isSameMonth(m, today)
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setMonthState(startOfMonth(m))
                  setView('days')
                }}
                className={cn(
                  'h-12 cursor-pointer rounded-xl text-base capitalize transition-colors sm:h-10 sm:rounded-lg sm:text-sm',
                  active
                    ? 'bg-brand-500 font-semibold text-white'
                    : current
                      ? 'border border-brand-500/50 text-brand-300 hover:bg-surface-hover'
                      : 'text-text-primary hover:bg-surface-hover',
                )}
              >
                {format(m, 'MMM', { locale: ptBR }).replace('.', '')}
              </button>
            )
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7" aria-hidden>
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="flex h-8 items-center justify-center text-xs font-medium text-text-muted">
                {d}
              </span>
            ))}
          </div>
          <div ref={gridRef} role="grid" aria-label={monthTitle} onKeyDown={onGridKeyDown} className="grid grid-cols-7 gap-y-0.5">
            {days.map((d) => {
              const iso = format(d, ISO)
              const outside = !isSameMonth(d, month)
              const isSelected = !!selected && isSameDay(d, selected)
              const isToday = isSameDay(d, today)
              const disabled = isDisabled(d)
              const tabbable = isSameDay(d, focused)
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  data-day={iso}
                  tabIndex={tabbable ? 0 : -1}
                  disabled={disabled}
                  aria-selected={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  onClick={() => onSelect(d)}
                  onFocus={() => setFocused(d)}
                  className={cn(
                    'mx-auto flex size-11 cursor-pointer items-center justify-center rounded-full text-base transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:size-9 sm:text-sm',
                    isSelected
                      ? 'bg-brand-500 font-semibold text-white'
                      : isToday
                        ? 'border border-brand-500/60 font-semibold text-brand-300 hover:bg-surface-hover'
                        : outside
                          ? 'text-text-muted/60 hover:bg-surface-hover'
                          : 'text-text-primary hover:bg-surface-hover',
                    disabled && 'cursor-not-allowed opacity-30 hover:bg-transparent',
                  )}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
        {clearable ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="h-11 cursor-pointer rounded-lg px-3 text-base text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary sm:h-9 sm:text-sm"
          >
            Limpar
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={isDisabled(today)}
          onClick={() => onSelect(today)}
          className="h-11 cursor-pointer rounded-lg px-3 text-base font-medium text-brand-400 transition-colors hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:text-sm"
        >
          Hoje
        </button>
      </div>
    </div>
  )
}

function NavButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary sm:size-9"
    >
      <Icon icon={icon} className="size-5 sm:size-4.5" />
    </button>
  )
}

import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/lib/format'
import type { CategoryTotal } from './status'

interface CategoryBreakdownProps {
  rows: CategoryTotal[]
  /** Categoria selecionada (filtro da lista). */
  selected?: string | null
  /** Com onSelect, cada linha vira um botão que filtra a lista. */
  onSelect?: (key: string | null) => void
  /** Texto extra à direita (ex.: média por mês no relatório). */
  extra?: (row: CategoryTotal) => string | null
  /** Quantas linhas mostrar (o resto é somado em "Outras"). */
  limit?: number
}

/**
 * "Onde mais gastei": uma linha por categoria, do maior gasto para o menor,
 * com barra proporcional, valor e porcentagem (barra + número, nunca só cor).
 */
export function CategoryBreakdown({ rows, selected, onSelect, extra, limit }: CategoryBreakdownProps) {
  const visible = limit && rows.length > limit ? rows.slice(0, limit) : rows
  const max = rows[0]?.total ?? 0

  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {visible.map((row, index) => {
        const active = selected === row.key
        const content = (
          <>
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full',
                index === 0 ? 'bg-gold-muted text-gold-400' : 'bg-surface-elevated text-text-secondary',
              )}
              aria-hidden
            >
              <Icon icon={row.icon} className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-base font-medium text-text-primary sm:text-sm">
                  {row.label}
                  {index === 0 && rows.length > 1 && <span className="ml-1.5 text-xs font-semibold text-gold-400">maior gasto</span>}
                </p>
                <p className="shrink-0 text-base font-semibold text-text-primary sm:text-sm">{formatCurrency(row.total)}</p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className={cn('h-full rounded-full', index === 0 ? 'bg-gold-400' : 'bg-brand-500')}
                  style={{ width: `${max > 0 ? Math.max(3, (row.total / max) * 100) : 0}%` }}
                />
              </div>
              <p className="mt-1 flex justify-between gap-2 text-sm text-text-muted sm:text-xs">
                <span>
                  {Math.round(row.percent)}% do total · {row.count} {row.count === 1 ? 'gasto' : 'gastos'}
                </span>
                {extra?.(row) && <span className="shrink-0">{extra(row)}</span>}
              </p>
            </div>
            {onSelect && (
              <Icon
                icon={active ? 'tabler:filter-off' : 'tabler:chevron-right'}
                className={cn('size-5 shrink-0', active ? 'text-brand-400' : 'text-text-muted')}
                aria-hidden
              />
            )}
          </>
        )
        return (
          <li key={row.key}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(active ? null : row.key)}
                aria-pressed={active}
                aria-label={active ? `Mostrar todas as categorias` : `Ver só ${row.label}`}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover/60 active:bg-surface-hover',
                  active && 'bg-brand-500/10',
                )}
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

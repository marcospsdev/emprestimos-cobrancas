import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { formatCurrency } from '@/lib/format'

export interface ExpensesPoint {
  label: string
  despesas: number
  lucro: number
}

const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border-strong bg-surface-elevated px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-medium text-text-primary">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey as string} className="text-text-secondary">
          <span className="mr-1 inline-block size-2 rounded-sm" style={{ background: item.color }} />
          {item.name}: <span className="font-medium text-text-primary">{formatCurrency(item.value as number)}</span>
        </p>
      ))}
    </div>
  )
}

/** Barras por mês: quanto foi gasto x quanto os empréstimos deram de lucro. */
export function ExpensesChart({ data }: { data: ExpensesPoint[] }) {
  return (
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => compact.format(value)}
            width={40}
          />
          <Tooltip content={(props) => <ChartTooltip {...props} />} cursor={{ fill: 'var(--color-surface-hover)' }} />
          <Bar dataKey="despesas" name="Despesas" fill="var(--color-text-secondary)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="lucro" name="Lucro dos empréstimos" fill="var(--color-gold-400)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ExpensesChartLegend() {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-text-secondary">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-text-secondary" /> Despesas
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-gold-400" /> Lucro dos empréstimos
      </span>
    </div>
  )
}

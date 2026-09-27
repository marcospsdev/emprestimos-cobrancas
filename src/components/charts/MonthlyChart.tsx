import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { formatCurrency } from '@/lib/format'

export interface MonthlyPoint {
  label: string
  previsto: number
  recebido: number
}

const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border-strong bg-surface-elevated px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-medium text-text-primary">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey as string} style={{ color: item.color }}>
          {item.name}: {formatCurrency(item.value as number)}
        </p>
      ))}
    </div>
  )
}

/** Barras por mês: quanto era para receber x quanto foi recebido. */
export function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
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
          <Bar dataKey="previsto" name="Para receber" fill="var(--color-border-strong)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="recebido" name="Recebido" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

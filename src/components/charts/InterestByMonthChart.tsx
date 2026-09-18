import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { formatCurrency } from '@/lib/format'

export interface InterestByMonthPoint {
  label: string
  juros: number
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border-strong bg-surface-elevated px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-medium text-text-primary">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey as string} className="flex items-center gap-2" style={{ color: item.color }}>
          {item.name}: {formatCurrency(item.value as number)}
        </p>
      ))}
    </div>
  )
}

export function InterestByMonthChart({ data }: { data: InterestByMonthPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatCurrency(value)}
            width={90}
          />
          <Tooltip content={(props) => <ChartTooltip {...props} />} cursor={{ fill: 'var(--color-surface-hover)' }} />
          <Bar dataKey="juros" name="Juros recebidos" fill="var(--color-gold-500)" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

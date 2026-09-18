import { Badge } from '@/components/ui/Badge'
import type { LoanStatus } from '@/types/database'

const STATUS_COPY: Record<LoanStatus, { label: string; variant: 'success' | 'danger' | 'gold' | 'neutral' }> = {
  ativo: { label: 'Ativo', variant: 'success' },
  quitado: { label: 'Quitado', variant: 'neutral' },
  renegociado: { label: 'Renegociado', variant: 'gold' },
  cancelado: { label: 'Cancelado', variant: 'danger' },
}

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  const copy = STATUS_COPY[status]
  return <Badge variant={copy.variant}>{copy.label}</Badge>
}

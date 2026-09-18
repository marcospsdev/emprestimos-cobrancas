import { Badge } from '@/components/ui/Badge'
import type { InstallmentStatus } from '@/types/database'

const STATUS_COPY: Record<InstallmentStatus, { label: string; variant: 'success' | 'danger' | 'info' }> = {
  pago: { label: 'Pago', variant: 'success' },
  atrasado: { label: 'Atrasado', variant: 'danger' },
  pendente: { label: 'Pendente', variant: 'info' },
}

export function InstallmentStatusBadge({ status }: { status: InstallmentStatus }) {
  const copy = STATUS_COPY[status]
  return <Badge variant={copy.variant}>{copy.label}</Badge>
}

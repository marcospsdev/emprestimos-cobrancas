const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value: number | null | undefined): string {
  return currencyFormatter.format(value ?? 0)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const [year, month, day] = value.split('T')[0].split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function todayISO(): string {
  // Usa componentes locais (não toISOString, que é UTC): no fuso do Brasil
  // (UTC-3), das 21h à meia-noite isso já retornaria a data de amanhã.
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

/** Texto para busca: minúsculo e sem acento ("João" encontra "joao"). */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

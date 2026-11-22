import { formatCurrency, formatDate } from './format'

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

/** Link wa.me para o número (assume Brasil, +55, se vier sem DDI), com texto opcional já preenchido. */
export function getWhatsAppLink(phone: string | null | undefined, message?: string): string | null {
  const digits = onlyDigits(phone)
  if (!digits) return null
  const withCountry = digits.startsWith('55') && digits.length > 11 ? digits : `55${digits}`
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${withCountry}${text}`
}

interface ChargeInfo {
  personName: string
  /** Só os juros: se informado (> 0), a mensagem oferece pagar só os juros. */
  interest?: number
  amount: number
  dueDate: string
  overdue: boolean
}

/** Mensagem de cobrança educada, pronta pra enviar — a pessoa só aperta "enviar". */
export function buildChargeMessage({ personName, amount, interest, dueDate, overdue }: ChargeInfo): string {
  const firstName = personName.trim().split(/\s+/)[0] ?? personName
  const value = formatCurrency(amount)
  const date = formatDate(dueDate)
  const option = interest && interest > 0 ? ` (ou ${formatCurrency(interest)} se for pagar só os juros deste mês)` : ''
  return overdue
    ? `Olá, ${firstName}! Tudo bem? Passando para lembrar do empréstimo no valor de ${value}${option}, que venceu em ${date}. Consegue me avisar quando vai conseguir pagar?`
    : `Olá, ${firstName}! Tudo bem? Passando para lembrar do empréstimo no valor de ${value}${option}, com pagamento combinado para ${date}.`
}

/** Formata enquanto digita: (11) 91234-5678 */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

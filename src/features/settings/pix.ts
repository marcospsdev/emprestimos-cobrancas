import { onlyDigits, maskPhone } from '@/lib/whatsapp'

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'

export const PIX_KEY_TYPES: { value: PixKeyType; label: string; placeholder: string; inputMode: 'numeric' | 'email' | 'tel' | 'text' }[] = [
  { value: 'cpf', label: 'CPF', placeholder: '000.000.000-00', inputMode: 'numeric' },
  { value: 'telefone', label: 'Celular', placeholder: '(00) 00000-0000', inputMode: 'tel' },
  { value: 'email', label: 'E-mail', placeholder: 'seuemail@exemplo.com', inputMode: 'email' },
  { value: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00', inputMode: 'numeric' },
  { value: 'aleatoria', label: 'Aleatória', placeholder: 'Cole aqui a chave aleatória', inputMode: 'text' },
]

export const pixTypeLabel = (type: PixKeyType) => PIX_KEY_TYPES.find((t) => t.value === type)?.label ?? type

function maskCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

function maskCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/** Formata enquanto digita, conforme o tipo de chave. */
export function maskPixKey(type: PixKeyType, value: string): string {
  switch (type) {
    case 'cpf':
      return maskCpf(value)
    case 'cnpj':
      return maskCnpj(value)
    case 'telefone':
      return maskPhone(value)
    case 'email':
      return value.trim().toLowerCase()
    case 'aleatoria':
      return value.trim().toLowerCase()
  }
}

/** Como a chave fica guardada no banco. */
export function normalizePixKey(type: PixKeyType, value: string): string {
  return type === 'cpf' || type === 'cnpj' || type === 'telefone' ? onlyDigits(value) : value.trim().toLowerCase()
}

function validCpf(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const digit = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

function validCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false
  const digit = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((acc, w, i) => acc + Number(cnpj[i]) * w, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13])
}

/** Mensagem de erro, ou null se a chave é válida para o tipo escolhido. */
export function validatePixKey(type: PixKeyType, value: string): string | null {
  const key = normalizePixKey(type, value)
  if (!key) return 'Informe a chave Pix'
  switch (type) {
    case 'cpf':
      return validCpf(key) ? null : 'CPF inválido. Confira os números.'
    case 'cnpj':
      return validCnpj(key) ? null : 'CNPJ inválido. Confira os números.'
    case 'telefone':
      return key.length === 11 && key[2] === '9' ? null : 'Informe o celular com DDD: (00) 90000-0000'
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key) && key.length <= 77 ? null : 'E-mail inválido'
    case 'aleatoria':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(key)
        ? null
        : 'A chave aleatória tem 32 letras e números separados por tracinhos. Copie e cole do app do banco.'
  }
}

/** Chave como aparece para as pessoas (com pontuação). */
export function formatPixKey(type: PixKeyType, key: string): string {
  return type === 'email' || type === 'aleatoria' ? key : maskPixKey(type, key)
}

export interface PixInfo {
  type: PixKeyType
  key: string
  bank: string | null
  holder: string | null
}

/** Bloco que vai no fim da mensagem de cobrança (negrito do WhatsApp com *). */
export function buildPixBlock(pix: PixInfo): string {
  const lines = ['', '', '*Para pagar via Pix:*', `Chave Pix (${pixTypeLabel(pix.type)}): ${formatPixKey(pix.type, pix.key)}`]
  if (pix.holder) lines.push(`Nome: ${pix.holder}`)
  if (pix.bank) lines.push(`Banco: ${pix.bank}`)
  return lines.join('\n')
}

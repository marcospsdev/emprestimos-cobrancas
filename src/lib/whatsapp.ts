export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

export function getWhatsAppLink(phone: string | null | undefined): string | null {
  const digits = onlyDigits(phone)
  if (!digits) return null
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${withCountry}`
}

import type { MouseEvent } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'
import { getWhatsAppLink } from '@/lib/whatsapp'

interface WhatsAppButtonProps {
  phone: string | null | undefined
  /** Texto já preenchido na conversa (ex.: mensagem de cobrança). */
  message?: string
  className?: string
  /** Com label vira um botão com ícone + texto; sem label, só o ícone. */
  label?: string
}

/** Abre a conversa no WhatsApp com a pessoa. Não renderiza nada se ela não tem telefone. */
export function WhatsAppButton({ phone, message, className, label }: WhatsAppButtonProps) {
  const link = getWhatsAppLink(phone, message)
  if (!link) return null

  const stop = (e: MouseEvent) => e.stopPropagation()
  const title = message ? 'Cobrar no WhatsApp' : 'Chamar no WhatsApp'

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={label ? undefined : title}
      onClick={stop}
      className={cn(
        'flex shrink-0 items-center justify-center text-success transition-colors',
        label
          ? 'h-12 gap-2 rounded-xl border border-success/30 bg-success-muted px-4 text-base font-medium hover:bg-success/20 sm:h-10 sm:rounded-lg sm:text-sm'
          : 'size-10 rounded-xl hover:bg-success-muted active:bg-success-muted sm:size-9 sm:rounded-lg',
        className,
      )}
    >
      <Icon icon="tabler:brand-whatsapp" className="size-5 shrink-0" />
      {label && <span className="truncate">{label}</span>}
    </a>
  )
}

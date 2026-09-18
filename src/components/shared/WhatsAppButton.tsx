import type { MouseEvent } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'
import { getWhatsAppLink } from '@/lib/whatsapp'

interface WhatsAppButtonProps {
  phone: string | null | undefined
  className?: string
  label?: string
}

/** Ícone de atalho para abrir uma conversa no WhatsApp com a pessoa (api.whatsapp.com/wa.me). */
export function WhatsAppButton({ phone, className, label }: WhatsAppButtonProps) {
  const link = getWhatsAppLink(phone)
  if (!link) return null

  const stop = (e: MouseEvent) => e.stopPropagation()

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title="Chamar no WhatsApp"
      onClick={stop}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-success-muted hover:text-success',
        label && 'w-auto gap-1.5 px-2.5 text-sm font-medium',
        className,
      )}
    >
      <Icon icon="tabler:brand-whatsapp" className="size-4.5" />
      {label}
    </a>
  )
}

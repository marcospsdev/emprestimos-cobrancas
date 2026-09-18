import { useRef, useState } from 'react'
import type { ComponentPropsWithoutRef, HTMLAttributes, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

interface DialogContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// sm: aqui é o prefixo de breakpoint, não o tamanho "sm" do modal — a largura
// máxima só deve valer no modal centralizado (tablet/desktop); no bottom sheet
// mobile o conteúdo sempre ocupa a largura toda (w-full já cobre isso).
const sizeClasses: Record<NonNullable<DialogContentProps['size']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

const DRAG_DISMISS_THRESHOLD = 110

export function DialogContent({ className, size = 'md', children, ...props }: DialogContentProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const dragInfo = useRef({ startY: 0, active: false })
  const [dragY, setDragY] = useState(0)

  const isMobileSheet = () => typeof window !== 'undefined' && window.innerWidth < 640

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isMobileSheet()) return
    dragInfo.current = { startY: e.clientY, active: true }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragInfo.current.active) return
    const delta = e.clientY - dragInfo.current.startY
    if (delta > 0) setDragY(delta)
  }

  const handlePointerUp = () => {
    if (!dragInfo.current.active) return
    dragInfo.current.active = false
    if (dragY > DRAG_DISMISS_THRESHOLD) {
      closeRef.current?.click()
    } else {
      setDragY(0)
    }
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
        className={cn(
          // Mobile: bottom sheet que sobe da parte inferior da tela. dvh (em vez de vh)
          // acompanha a viewport visual quando o teclado abre; o padding-bottom reserva
          // a área do indicador de gestos/home do celular para os botões não ficarem cortados.
          'fixed inset-x-0 top-auto bottom-0 z-50 flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-x border-border-strong bg-surface pb-[env(safe-area-inset-bottom)] shadow-card focus:outline-none data-[state=open]:animate-slide-up',
          // Desktop/tablet (sm+): modal centralizado, como antes.
          'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:pb-0 sm:data-[state=open]:animate-fade-in',
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex shrink-0 touch-none items-center justify-center py-2.5 sm:hidden"
        >
          <div className="h-1.5 w-10 rounded-full bg-border-strong" />
        </div>

        {children}

        <DialogPrimitive.Close
          ref={closeRef}
          className="absolute right-4 top-7 cursor-pointer rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:top-4"
        >
          <Icon icon="tabler:x" className="size-4.5" />
          <span className="sr-only">Fechar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('shrink-0 border-b border-border px-6 py-4', className)} {...props} />
}

export function DialogTitle({ className, ...props }: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-base font-semibold text-text-primary', className)} {...props} />
}

export function DialogDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('mt-1 text-sm text-text-secondary', className)} {...props} />
}

export function DialogBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grow overflow-y-auto px-6 py-4', className)} {...props} />
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4', className)}
      {...props}
    />
  )
}

export function SimpleDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: DialogContentProps['size']
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={size}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

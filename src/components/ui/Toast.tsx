import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// Erros e avisos ficam mais tempo: quem lê devagar precisa conseguir ler.
const TOAST_DURATION: Record<ToastType, number> = { success: 4500, info: 4500, warning: 7000, error: 7000 }

const ICONS: Record<ToastType, string> = {
  success: 'tabler:circle-check',
  error: 'tabler:alert-circle',
  info: 'tabler:info-circle',
  warning: 'tabler:alert-triangle',
}

// text-* define a cor do status; o fundo tingido, a faixa lateral e a barra de
// tempo usam essa cor (bg-current), então cada tipo fica com a sua cor.
const STYLES: Record<ToastType, string> = {
  success: 'border-success/50 text-success',
  error: 'border-danger/50 text-danger',
  info: 'border-info/50 text-info',
  warning: 'border-warning/50 text-warning',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = nextId.current++
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => removeToast(id), TOAST_DURATION[type])
    },
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[100] flex flex-col gap-2 sm:inset-x-auto sm:top-6 sm:right-6 sm:w-full sm:max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto relative overflow-hidden rounded-xl border bg-surface-elevated py-3 pr-3 pl-4 shadow-card animate-fade-in',
              STYLES[t.type],
            )}
          >
            {/* Fundo tingido na cor do status + faixa lateral */}
            <div className="pointer-events-none absolute inset-0 bg-current opacity-[0.16]" aria-hidden />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-current" aria-hidden />
            <div className="relative flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-current/20">
                <Icon icon={ICONS[t.type]} className="size-4.5" />
              </span>
              <p className="min-w-0 flex-1 self-center text-sm font-medium text-text-primary">{t.message}</p>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Fechar aviso"
                className="-mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-primary"
              >
                <Icon icon="tabler:x" className="size-4" />
              </button>
            </div>
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-current opacity-60"
              style={{ animation: `toast-progress ${TOAST_DURATION[t.type]}ms linear forwards` }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx
}

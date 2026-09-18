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

const TOAST_DURATION = 4200

const ICONS: Record<ToastType, string> = {
  success: 'tabler:circle-check',
  error: 'tabler:alert-circle',
  info: 'tabler:info-circle',
  warning: 'tabler:alert-triangle',
}

const STYLES: Record<ToastType, string> = {
  success: 'border-success/30 text-success',
  error: 'border-danger/30 text-danger',
  info: 'border-info/30 text-info',
  warning: 'border-warning/30 text-warning',
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
      setTimeout(() => removeToast(id), TOAST_DURATION)
    },
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:top-6 sm:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto relative overflow-hidden rounded-lg border bg-surface-elevated px-4 py-3 shadow-card animate-fade-in',
              STYLES[t.type],
            )}
          >
            <div className="flex items-start gap-2.5">
              <Icon icon={ICONS[t.type]} className="mt-0.5 size-4.5 shrink-0" />
              <p className="text-sm text-text-primary">{t.message}</p>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="ml-auto cursor-pointer text-text-muted transition-colors hover:text-text-primary"
              >
                <Icon icon="tabler:x" className="size-4" />
              </button>
            </div>
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-current opacity-40"
              style={{ animation: `toast-progress ${TOAST_DURATION}ms linear forwards` }}
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

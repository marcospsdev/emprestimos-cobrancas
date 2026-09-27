import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { Button } from './Button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './Dialog'
import { cn } from '@/lib/cn'

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve })
    })
  }, [])

  const close = (value: boolean) => {
    state?.resolve(value)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={!!state} onOpenChange={(open) => !open && close(false)}>
        {state && (
          <DialogContent size="sm">
            <DialogHeader className="border-b-0">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full border',
                    state.variant === 'danger'
                      ? 'border-danger/30 bg-danger-muted text-danger'
                      : 'border-brand-600/30 bg-brand-500/10 text-brand-400',
                  )}
                >
                  <Icon
                    icon={state.variant === 'danger' ? 'tabler:alert-triangle' : 'tabler:help-circle'}
                    className="size-5"
                  />
                </div>
                <div className="pt-1">
                  <DialogTitle>{state.title}</DialogTitle>
                  {state.description && <p className="mt-1.5 text-sm text-text-secondary">{state.description}</p>}
                </div>
              </div>
            </DialogHeader>
            <DialogFooter className="border-t-0">
              <Button variant="secondary" onClick={() => close(false)}>
                {state.cancelLabel ?? 'Cancelar'}
              </Button>
              <Button
                variant={state.variant === 'danger' ? 'danger' : 'primary'}
                onClick={() => close(true)}
              >
                {state.confirmLabel ?? 'Confirmar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>')
  return ctx.confirm
}

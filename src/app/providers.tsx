import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { ConfirmProvider } from '@/components/ui/ConfirmDialog'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { QueryErrorToaster } from '@/components/shared/QueryErrorToaster'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <QueryErrorToaster />
          <ConfirmProvider>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

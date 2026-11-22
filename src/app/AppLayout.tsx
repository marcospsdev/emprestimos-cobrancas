import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { BottomNav } from '@/components/layout/BottomNav'
import { PageLoader } from '@/components/ui/PageLoader'
import { LoanFormProvider } from '@/features/loans/LoanFormProvider'
import { refreshPushState } from '@/lib/push'

export function AppLayout() {
  // Situação dos avisos: ao abrir e ao voltar para o app (a pessoa pode ter
  // liberado as notificações nas configurações do celular nesse meio tempo).
  useEffect(() => {
    void refreshPushState()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshPushState()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <LoanFormProvider>
      <div className="flex min-h-dvh flex-col bg-background lg:pl-64">
        <Sidebar />
        <MobileHeader />
        {/* pb no celular: espaço para a barra inferior + área do gesto de home. */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:max-w-5xl lg:px-8 lg:py-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
        <BottomNav />
      </div>
    </LoanFormProvider>
  )
}

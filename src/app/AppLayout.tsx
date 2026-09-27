import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { BottomNav } from '@/components/layout/BottomNav'
import { PageLoader } from '@/components/ui/PageLoader'
import { LoanFormProvider } from '@/features/loans/LoanFormProvider'

export function AppLayout() {
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

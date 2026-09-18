import { Suspense, useState } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { PageLoader } from '@/components/ui/PageLoader'
import { useLocalStorageState } from '@/hooks/useLocalStorageState'
import { cn } from '@/lib/cn'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useLocalStorageState('financas:sidebar-collapsed', false)

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
      />

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-200',
          collapsed ? 'lg:ml-[76px]' : 'lg:ml-72',
        )}
      >
        <MobileHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

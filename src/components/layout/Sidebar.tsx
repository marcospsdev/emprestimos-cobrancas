import { useState } from 'react'
import { NavLink } from 'react-router'
import { Icon } from '@iconify/react'
import { GlassSurface } from '@/components/effects/GlassSurface'
import { BrandMark } from '@/components/shared/BrandMark'
import { DeveloperCredit } from '@/components/shared/DeveloperCredit'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { useAuth } from '@/context/AuthContext'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'
import { NAV_ITEMS } from '@/constants/nav'
import { cn } from '@/lib/cn'

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function Sidebar({ mobileOpen, onClose, collapsed, onToggleCollapsed }: SidebarProps) {
  const { user, signOut } = useAuth()
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'group/sidebar fixed inset-y-0 left-0 z-40 w-72 shrink-0 -translate-x-full overflow-hidden transition-[transform,width] duration-200 lg:translate-x-0',
          mobileOpen && 'translate-x-0',
          collapsed ? 'lg:w-[76px] lg:hover:w-72 lg:hover:shadow-2xl' : 'lg:w-72',
        )}
      >
        <GlassSurface
          width="100%"
          height="100%"
          borderRadius={0}
          backgroundOpacity={0.5}
          distortionScale={-30}
          blur={10}
          saturation={1.1}
          contentClassName="flex h-full flex-col"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
            <BrandMark
              size="sm"
              textClassName={collapsed ? 'lg:hidden lg:group-hover/sidebar:inline-flex' : undefined}
            />

            <button
              type="button"
              onClick={onToggleCollapsed}
              title={collapsed ? 'Fixar sidebar' : 'Minimizar sidebar'}
              className={cn(
                'cursor-pointer rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary',
                collapsed ? 'hidden lg:hidden lg:group-hover/sidebar:flex' : 'hidden lg:flex',
              )}
            >
              <Icon
                icon={collapsed ? 'tabler:layout-sidebar-left-expand' : 'tabler:layout-sidebar-left-collapse'}
                className="size-4.5"
              />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary lg:hidden"
            >
              <Icon icon="tabler:x" className="size-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-500/12 text-brand-300'
                          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                      )
                    }
                  >
                    <Icon icon={item.icon} className="size-4.5 shrink-0" />
                    <span
                      className={cn(
                        'whitespace-nowrap',
                        collapsed && 'lg:hidden lg:group-hover/sidebar:inline',
                      )}
                    >
                      {item.label}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="shrink-0 border-t border-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-brand-600/40 bg-brand-500/10 text-brand-400">
                    <Icon icon="tabler:user" className="size-4.5" />
                  </div>
                  <div
                    className={cn(
                      'min-w-0 flex-1',
                      collapsed && 'lg:hidden lg:group-hover/sidebar:block',
                    )}
                  >
                    <p className="truncate text-sm font-medium text-text-primary">{user?.email}</p>
                    <p className="text-xs text-text-muted">Administrador</p>
                  </div>
                  <Icon
                    icon="tabler:selector"
                    className={cn(
                      'size-4 shrink-0 text-text-muted',
                      collapsed && 'lg:hidden lg:group-hover/sidebar:block',
                    )}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-64">
                <DropdownMenuItem onSelect={() => setChangePasswordOpen(true)}>
                  <Icon icon="tabler:key" className="size-4" />
                  Alterar senha
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut()} className="text-danger data-[highlighted]:text-danger">
                  <Icon icon="tabler:logout" className="size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DeveloperCredit
              className={cn(
                'mt-2 px-3 text-center',
                collapsed && 'lg:hidden lg:group-hover/sidebar:block',
              )}
            />
          </div>
        </GlassSurface>
      </aside>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </>
  )
}

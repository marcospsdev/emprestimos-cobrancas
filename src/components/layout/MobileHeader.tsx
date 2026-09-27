import { Icon } from '@iconify/react'
import { BrandMark } from '@/components/shared/BrandMark'
import { UserMenu } from './UserMenu'

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between border-b border-border bg-surface/95 pr-2 pl-4 pt-[env(safe-area-inset-top)] backdrop-blur-sm lg:hidden">
      <BrandMark size="sm" />
      <UserMenu
        trigger={
          <button
            type="button"
            aria-label="Minha conta"
            className="flex size-11 cursor-pointer items-center justify-center rounded-full text-text-secondary active:bg-surface-hover"
          >
            <Icon icon="tabler:user-circle" className="size-6" />
          </button>
        }
      />
    </header>
  )
}

import { Icon } from '@iconify/react'
import { BrandMark } from '@/components/shared/BrandMark'

interface MobileHeaderProps {
  onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-sm lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="cursor-pointer rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
      >
        <Icon icon="tabler:menu-2" className="size-5.5" />
      </button>
      <BrandMark size="sm" />
    </header>
  )
}

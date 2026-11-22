import { BrandMark } from '@/components/shared/BrandMark'
import { ThemeToggleButton } from '@/components/shared/ThemeToggle'

/** Topo no celular: só a marca e o tema. A conta fica na barra de baixo ("Conta"). */
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between border-b border-border bg-surface/95 pr-2 pl-4 pt-[env(safe-area-inset-top)] backdrop-blur-sm lg:hidden">
      <BrandMark size="sm" />
      <ThemeToggleButton className="rounded-full border-0 bg-transparent backdrop-blur-none active:bg-surface-hover" />
    </header>
  )
}

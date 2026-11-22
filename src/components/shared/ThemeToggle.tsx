import { Icon } from '@iconify/react'
import { cn } from '@/lib/cn'
import { useTheme } from '@/lib/theme'

/** Botão único (telas sem menu, como o login): alterna entre claro e escuro. */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { resolved, setPreference } = useTheme()
  const next = resolved === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={next === 'light' ? 'Usar tema claro' : 'Usar tema escuro'}
      title={next === 'light' ? 'Tema claro' : 'Tema escuro'}
      className={cn(
        'flex size-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface/80 text-text-secondary backdrop-blur transition-colors hover:bg-surface-hover hover:text-text-primary',
        className,
      )}
    >
      <Icon icon={resolved === 'dark' ? 'tabler:sun' : 'tabler:moon'} className="size-5" />
    </button>
  )
}

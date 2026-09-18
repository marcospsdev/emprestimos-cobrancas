import { Icon } from '@iconify/react'

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 text-text-secondary">
      <Icon icon="tabler:loader-2" className="size-7 animate-spin text-brand-400" />
      <p className="text-sm">Carregando...</p>
    </div>
  )
}

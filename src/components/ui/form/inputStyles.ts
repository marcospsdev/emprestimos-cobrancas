// Mobile-first: 48px de altura (alvo de toque confortável) e fonte de 16px —
// abaixo de 16px o Safari do iPhone dá zoom na página ao focar o campo.
// A partir de sm: (tablet/desktop) volta ao tamanho compacto.
export const inputBaseClass =
  'flex h-12 w-full items-center rounded-xl border border-border-strong bg-surface-elevated px-3.5 text-base text-text-primary placeholder:text-text-muted transition-colors outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:rounded-lg sm:px-3 sm:text-sm'

export const inputErrorClass = 'border-danger/60 focus:border-danger focus:ring-danger/25'

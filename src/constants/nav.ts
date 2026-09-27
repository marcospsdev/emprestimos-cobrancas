export interface NavItem {
  label: string
  to: string
  icon: string
  /** Mantém o mês selecionado (?mes=) ao navegar entre telas que usam mês. */
  keepsMonth?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Resumo', to: '/', icon: 'tabler:layout-dashboard', keepsMonth: true },
  { label: 'Empréstimos', to: '/emprestimos', icon: 'tabler:coins', keepsMonth: true },
  { label: 'Pessoas', to: '/pessoas', icon: 'tabler:users' },
]

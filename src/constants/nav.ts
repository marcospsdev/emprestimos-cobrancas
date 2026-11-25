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
  { label: 'Clientes', to: '/clientes', icon: 'tabler:users' },
  // Daqui para baixo: só no menu lateral (desktop). No celular ficam no Resumo e dentro de "Conta".
  { label: 'Despesas', to: '/despesas', icon: 'tabler:receipt', keepsMonth: true },
  { label: 'Armazenamento', to: '/armazenamento', icon: 'tabler:database' },
]

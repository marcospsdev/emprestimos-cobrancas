export interface NavItem {
  label: string
  to: string
  icon: string
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: 'tabler:layout-dashboard' },
  { label: 'Pessoas', to: '/pessoas', icon: 'tabler:users' },
  { label: 'Empréstimos', to: '/emprestimos', icon: 'tabler:hand-coins' },
  { label: 'Parcelas', to: '/parcelas', icon: 'tabler:calendar-dollar' },
  { label: 'Inadimplência', to: '/inadimplencia', icon: 'tabler:alert-triangle' },
  { label: 'Relatórios', to: '/relatorios', icon: 'tabler:report-analytics' },
  { label: 'Configurações', to: '/configuracoes', icon: 'tabler:settings' },
]

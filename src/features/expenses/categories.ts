export interface ExpenseCategory {
  key: string
  label: string
  icon: string
  /** Exemplos curtos, para quem não sabe onde encaixar o gasto. */
  hint: string
}

/**
 * Categorias fixas (poucas e fáceis de entender). A chave é o que vai para o
 * banco; para criar outra, basta acrescentar aqui. "outros" fica sempre por último.
 */
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { key: 'casa', label: 'Casa', icon: 'tabler:home', hint: 'Aluguel, condomínio, reformas' },
  { key: 'contas', label: 'Contas', icon: 'tabler:bulb', hint: 'Luz, água, gás, internet, celular' },
  { key: 'mercado', label: 'Mercado', icon: 'tabler:shopping-cart', hint: 'Supermercado, feira, padaria' },
  { key: 'alimentacao', label: 'Comida fora', icon: 'tabler:tools-kitchen-2', hint: 'Restaurante, lanche, delivery' },
  { key: 'transporte', label: 'Transporte', icon: 'tabler:car', hint: 'Combustível, ônibus, Uber, oficina' },
  { key: 'saude', label: 'Saúde', icon: 'tabler:heartbeat', hint: 'Farmácia, consulta, plano de saúde' },
  { key: 'educacao', label: 'Educação', icon: 'tabler:school', hint: 'Escola, curso, material' },
  { key: 'lazer', label: 'Lazer', icon: 'tabler:confetti', hint: 'Passeio, festa, viagem, streaming' },
  { key: 'roupas', label: 'Roupas', icon: 'tabler:shirt', hint: 'Roupa, calçado, beleza' },
  { key: 'dividas', label: 'Cartão e dívidas', icon: 'tabler:credit-card', hint: 'Fatura, financiamento, boleto' },
  { key: 'familia', label: 'Família', icon: 'tabler:users', hint: 'Ajuda a parentes, filhos, pets' },
  { key: 'outros', label: 'Outros', icon: 'tabler:dots', hint: 'O que não se encaixa acima' },
]

const BY_KEY = new Map(EXPENSE_CATEGORIES.map((c) => [c.key, c]))
const FALLBACK = BY_KEY.get('outros') as ExpenseCategory

/** Categoria pela chave (chave desconhecida cai em "Outros"). */
export function getCategory(key: string | null | undefined): ExpenseCategory {
  return (key && BY_KEY.get(key)) || FALLBACK
}

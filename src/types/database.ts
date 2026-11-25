/** Derivado de `paid_at` e `due_date` — não existe coluna de status no banco. */
export type LoanStatus = 'pendente' | 'atrasado' | 'pago'

export interface Person {
  id: string
  user_id: string
  name: string
  phone: string | null
  notes: string | null
  created_at: string
}

export type PersonInput = Pick<Person, 'name'> & Partial<Pick<Person, 'phone' | 'notes'>>

export interface Loan {
  id: string
  user_id: string
  person_id: string
  description: string | null
  amount_lent: number
  /** Juros em % deste empréstimo (ex.: 20 = 20%). */
  interest_rate: number
  /** Calculado no app: amount_lent × (1 + interest_rate/100). */
  amount_to_receive: number
  /** Em quantas parcelas mensais (1 = de uma vez). O total é dividido igualmente. */
  installments: number
  /** Parcelas já pagas (registradas em loan_payments). A última quita o empréstimo. */
  installments_paid: number
  loan_date: string
  due_date: string
  paid_at: string | null
  payment_method: string | null
  created_at: string
  person?: Pick<Person, 'id' | 'name' | 'phone'> | null
}

export type LoanInput = Pick<
  Loan,
  | 'person_id'
  | 'description'
  | 'amount_lent'
  | 'interest_rate'
  | 'amount_to_receive'
  | 'installments'
  | 'loan_date'
  | 'due_date'
  | 'paid_at'
  | 'payment_method'
>

/**
 * Pagamento que não quita o empréstimo; o vencimento vai para o mês seguinte:
 * - juros: pagou só os juros (o valor devido continua igual);
 * - parcela: pagou uma parcela de um empréstimo parcelado.
 */
export interface LoanPayment {
  id: string
  user_id: string
  loan_id: string
  kind: 'juros' | 'parcela'
  amount: number
  /** Número da parcela (só quando kind = parcela). */
  installment_number: number | null
  /** Vencimento que este pagamento cobriu (mês em que aparece no resumo). */
  due_date: string
  paid_at: string
  payment_method: string | null
  created_at: string
  loan?: Pick<Loan, 'id' | 'person_id' | 'amount_lent' | 'amount_to_receive' | 'interest_rate' | 'installments' | 'description' | 'paid_at' | 'person'> | null
}

/** Configurações do sistema (linha única, compartilhada por todos os usuários). Hoje: a chave Pix da cobrança. */
export interface UserSettings {
  id: true
  /** Quem cadastrou (null se o usuário foi excluído). */
  user_id: string | null
  pix_key_type: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | null
  pix_key: string | null
  pix_bank: string | null
  pix_holder: string | null
  updated_at: string
}

export type UserSettingsInput = Pick<UserSettings, 'pix_key_type' | 'pix_key' | 'pix_bank' | 'pix_holder'>

/** Gasto do mês (pago ou a pagar). Status derivado de `paid_at` e `due_date`, como nos empréstimos. */
export interface Expense {
  id: string
  user_id: string | null
  description: string
  /** Chave de EXPENSE_CATEGORIES (ex.: 'mercado'). */
  category: string
  amount: number
  /** Data do gasto / vencimento da conta (define o mês em que aparece). */
  due_date: string
  paid_at: string | null
  notes: string | null
  /** Veio de uma conta fixa (repete todo mês). */
  fixed_expense_id: string | null
  /** Primeiro dia do mês de due_date (calculado no banco). */
  ref_month: string
  created_at: string
}

export type ExpenseInput = Pick<Expense, 'description' | 'category' | 'amount' | 'due_date' | 'paid_at' | 'notes'> &
  Partial<Pick<Expense, 'fixed_expense_id'>>

/** Conta fixa: o app lança uma despesa dela em cada mês (fn_generate_fixed_expenses). */
export interface FixedExpense {
  id: string
  user_id: string | null
  description: string
  category: string
  amount: number
  due_day: number
  /** Primeiro mês (dia 1). */
  start_month: string
  /** Último mês em que repete (dia 1); null = repete sempre. */
  end_month: string | null
  last_generated_month: string | null
  created_at: string
}

export type FixedExpenseInput = Pick<FixedExpense, 'description' | 'category' | 'amount' | 'due_day' | 'start_month'> &
  Partial<Pick<FixedExpense, 'end_month' | 'last_generated_month'>>

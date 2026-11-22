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
  | 'loan_date'
  | 'due_date'
  | 'paid_at'
  | 'payment_method'
>

/** Pagamento só dos juros: o empréstimo continua e o vencimento vai para o mês seguinte. */
export interface LoanPayment {
  id: string
  user_id: string
  loan_id: string
  kind: 'juros'
  amount: number
  /** Vencimento que este pagamento cobriu (mês em que aparece no resumo). */
  due_date: string
  paid_at: string
  payment_method: string | null
  created_at: string
  loan?: Pick<Loan, 'id' | 'person_id' | 'amount_lent' | 'amount_to_receive' | 'interest_rate' | 'description' | 'paid_at' | 'person'> | null
}

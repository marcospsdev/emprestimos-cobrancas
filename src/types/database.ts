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
  title: string
  description: string | null
  amount_lent: number
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
  | 'title'
  | 'description'
  | 'amount_lent'
  | 'amount_to_receive'
  | 'loan_date'
  | 'due_date'
  | 'paid_at'
  | 'payment_method'
>

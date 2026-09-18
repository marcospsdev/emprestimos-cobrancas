export type LoanStatus = 'ativo' | 'quitado' | 'renegociado' | 'cancelado'
export type InstallmentFrequency = 'mensal' | 'quinzenal' | 'semanal'
export type InstallmentStatus = 'pendente' | 'pago' | 'atrasado'

export interface Person {
  id: string
  user_id: string
  name: string
  cpf: string | null
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export type PersonInsert = Pick<Person, 'name'> & Partial<Pick<Person, 'cpf' | 'phone' | 'address' | 'notes'>>

export interface Loan {
  id: string
  user_id: string
  person_id: string
  principal_amount: number
  interest_rate: number
  installments_count: number
  installment_frequency: InstallmentFrequency
  first_due_date: string
  total_amount: number
  status: LoanStatus
  created_at: string
  person?: Pick<Person, 'id' | 'name' | 'phone'> | null
}

export type LoanInsert = Pick<
  Loan,
  'person_id' | 'principal_amount' | 'interest_rate' | 'installments_count' | 'first_due_date'
> &
  Partial<Pick<Loan, 'installment_frequency'>>

export interface Installment {
  id: string
  loan_id: string
  user_id: string
  sequence: number
  due_date: string
  principal_amount: number
  interest_amount: number
  amount: number
  cancelled_at: string | null
  created_at: string
}

/** Linha calculada da view `v_installments` — fonte única para Parcelas, Inadimplência, Dashboard. */
export interface InstallmentView {
  id: string
  loan_id: string
  user_id: string
  person_id: string
  person_name: string
  person_phone: string | null
  sequence: number
  due_date: string
  principal_amount: number
  interest_amount: number
  amount: number
  amount_paid: number
  remaining_amount: number
  penalty_amount: number
  updated_amount: number
  late_days: number
  status: InstallmentStatus
}

export interface Payment {
  id: string
  installment_id: string
  loan_id: string
  user_id: string
  amount: number
  payment_date: string
  notes: string | null
  created_at: string
}

export type PaymentInsert = Pick<Payment, 'installment_id' | 'amount'> &
  Partial<Pick<Payment, 'payment_date' | 'notes'>>

export interface Renegotiation {
  id: string
  user_id: string
  original_loan_id: string
  new_loan_id: string
  reason: string | null
  created_at: string
}

export interface Settings {
  user_id: string
  late_fee_percent: number
  daily_interest_percent: number
  updated_at: string
}

export interface DashboardSummary {
  total_emprestado: number
  total_recebido: number
  total_a_receber: number
  juros_recebidos: number
  juros_a_receber: number
  valores_em_atraso: number
  emprestimos_ativos: number
  proximos_vencimentos: number
}

export interface InterestByMonth {
  month: string
  juros: number
}

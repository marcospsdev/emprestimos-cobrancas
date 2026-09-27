import { createContext, useContext } from 'react'
import type { Loan } from '@/types/database'

export interface LoanFormContextValue {
  openNewLoan: (options?: { personId?: string }) => void
  openEditLoan: (loan: Loan) => void
}

export const LoanFormContext = createContext<LoanFormContextValue | null>(null)

/** Abre o formulário único de empréstimo (novo ou edição) de qualquer tela. */
export function useLoanForm() {
  const ctx = useContext(LoanFormContext)
  if (!ctx) throw new Error('useLoanForm deve ser usado dentro de <LoanFormProvider>')
  return ctx
}

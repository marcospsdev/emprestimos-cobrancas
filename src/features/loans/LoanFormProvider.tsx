import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Loan } from '@/types/database'
import { LoanFormContext } from './loanFormContext'
import { LoanFormModal } from './LoanFormModal'

/**
 * Um único formulário de empréstimo para o app inteiro: o botão "+" da barra
 * inferior, a lista, o dashboard e a tela da pessoa abrem o mesmo modal.
 */
export function LoanFormProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loan, setLoan] = useState<Loan | null>(null)
  const [personId, setPersonId] = useState<string | undefined>()

  const openNewLoan = useCallback((options?: { personId?: string }) => {
    setLoan(null)
    setPersonId(options?.personId)
    setOpen(true)
  }, [])

  const openEditLoan = useCallback((next: Loan) => {
    setLoan(next)
    setPersonId(undefined)
    setOpen(true)
  }, [])

  const value = useMemo(() => ({ openNewLoan, openEditLoan }), [openNewLoan, openEditLoan])

  return (
    <LoanFormContext.Provider value={value}>
      {children}
      <LoanFormModal open={open} onOpenChange={setOpen} loan={loan} defaultPersonId={personId} />
    </LoanFormContext.Provider>
  )
}

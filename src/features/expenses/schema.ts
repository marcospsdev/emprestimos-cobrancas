import { z } from 'zod'
import { todayISO } from '@/lib/format'

export const expenseSchema = z.object({
  amount: z.number({ error: 'Informe o valor' }).positive('Informe o valor'),
  description: z.string().trim().min(1, 'Diga com o que foi o gasto'),
  category: z.string().min(1, 'Escolha a categoria'),
  due_date: z.string().min(1, 'Informe a data'),
  /** Já pago (cadastro: quase sempre o gasto já foi feito). */
  paid: z.boolean(),
  /** Conta fixa: repete todo mês, no mesmo dia. */
  recurring: z.boolean(),
  /** Editando uma conta fixa: aplicar valor/descrição/categoria nos meses seguintes. */
  apply_future: z.boolean(),
  notes: z.string(),
})

export type ExpenseFormValues = z.infer<typeof expenseSchema>

export function emptyExpenseValues(dueDate = todayISO()): ExpenseFormValues {
  return {
    amount: undefined as unknown as number,
    description: '',
    category: '',
    due_date: dueDate,
    paid: true,
    recurring: false,
    apply_future: false,
    notes: '',
  }
}

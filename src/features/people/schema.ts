import { z } from 'zod'

export const personSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export type PersonFormValues = z.infer<typeof personSchema>

export const emptyPersonValues: PersonFormValues = {
  name: '',
  cpf: '',
  phone: '',
  address: '',
  notes: '',
}

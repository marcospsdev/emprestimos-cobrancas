import { z } from 'zod'

export const personSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome'),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

export type PersonFormValues = z.infer<typeof personSchema>

export const emptyPersonValues: PersonFormValues = { name: '', phone: '', notes: '' }

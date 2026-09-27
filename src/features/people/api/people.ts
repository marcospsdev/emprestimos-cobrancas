import { supabase } from '@/lib/supabase'
import type { Person, PersonInput } from '@/types/database'

export async function fetchPeople(): Promise<Person[]> {
  const { data, error } = await supabase.from('people').select('*').order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data as Person[]
}

export async function fetchPerson(id: string): Promise<Person> {
  const { data, error } = await supabase.from('people').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data as Person
}

export async function createPerson(payload: PersonInput): Promise<Person> {
  const { data, error } = await supabase.from('people').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as Person
}

export async function updatePerson(id: string, payload: PersonInput): Promise<Person> {
  const { data, error } = await supabase.from('people').update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Person
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from('people').delete().eq('id', id)
  if (error) {
    // 23503 = violação de chave estrangeira (a pessoa ainda tem empréstimos).
    if (error.code === '23503') throw new Error('Essa pessoa tem empréstimos cadastrados. Exclua os empréstimos antes.')
    throw new Error(error.message)
  }
}

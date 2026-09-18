import { supabase } from '@/lib/supabase'
import type { Person, PersonInsert } from '@/types/database'

export async function fetchPeople(search?: string): Promise<Person[]> {
  let query = supabase.from('people').select('*').order('name', { ascending: true })
  if (search?.trim()) query = query.ilike('name', `%${search.trim()}%`)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Person[]
}

export async function fetchPerson(id: string): Promise<Person> {
  const { data, error } = await supabase.from('people').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data as Person
}

export async function createPerson(payload: PersonInsert): Promise<Person> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão inválida')

  const { data, error } = await supabase
    .from('people')
    .insert({ ...payload, user_id: user.id })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Person
}

export async function updatePerson(id: string, payload: PersonInsert): Promise<Person> {
  const { data, error } = await supabase.from('people').update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Person
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from('people').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

import { supabase } from '@/lib/supabase'
import type { UserSettings, UserSettingsInput } from '@/types/database'

/** null = ainda não salvou nada (ou a migração da chave Pix não foi rodada). */
export async function fetchSettings(): Promise<UserSettings | null> {
  const { data, error } = await supabase.from('user_settings').select('*').maybeSingle()
  if (error) {
    // Tabela ainda não existe (migração não rodada): o app segue sem Pix.
    if (error.code === '42P01' || error.code === 'PGRST205') return null
    throw new Error(error.message)
  }
  return data as UserSettings | null
}

export async function saveSettings(payload: UserSettingsInput): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    // Linha única do sistema (id = true): a mesma chave Pix para todos os usuários.
    .upsert({ id: true, ...payload, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single()
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error('Falta rodar a migração da chave Pix no Supabase (2026-11-23_chave_pix.sql).')
    }
    throw new Error(error.message)
  }
  return data as UserSettings
}

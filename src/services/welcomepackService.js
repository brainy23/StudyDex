import { getSupabase } from '../lib/supabase'

export async function getUnopenedWelcomePack(userId) {
  const { data, error } = await getSupabase()
    .from('user_packs')
    .select('id')
    .eq('user_id', userId)
    .eq('source', 'welcome')
    .is('opened_at', null)
    .maybeSingle()
  if (error) throw error
  return data
}
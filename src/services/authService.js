import { getSupabase } from '../lib/supabase'

export async function signOutCurrentSession() {
  const { error } = await getSupabase().auth.signOut({ scope: 'local' })
  if (error) throw error
}

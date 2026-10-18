import { getSupabase } from '../lib/supabase'

export const PROFILE_FIELDS =
  'id, display_name, avatar_choice, school_level_id, school_level:levels!profiles_school_level_id_fkey(id, level_number, name)'

export async function getCurrentProfile() {
  const supabase = getSupabase()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!auth.user) throw new Error('Please log in to view your profile.')

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', auth.user.id)
    .single()

  if (error) throw error
  if (!data) throw new Error('Your profile could not be found. Please contact the StudyDex team.')
  return data
}

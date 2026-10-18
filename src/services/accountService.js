import { getSupabase } from '../lib/supabase'
import { PROFILE_FIELDS } from './profileService'
import { avatarOptions } from '../data/avatarOptions'

async function requireUser(client) {
  const { data, error } = await client.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Please log in to manage your account.')
  return data.user
}

export async function getCurrentEmailSettings() {
  const user = await requireUser(getSupabase())
  return { email: user.email || '', pendingEmail: user.new_email || '' }
}

export async function getAccountSettings() {
  const client = getSupabase()
  const user = await requireUser(client)
  const { data: profile, error } = await client
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', user.id)
    .single()
  if (error) throw error
  if (!profile) throw new Error('Your profile could not be found.')
  return { profile, email: user.email || '', pendingEmail: user.new_email || '' }
}

export async function getSchoolLevels() {
  const { data, error } = await getSupabase()
    .from('levels')
    .select('id, name, level_number')
    .order('level_number')
  if (error) throw error
  return data
}

export function validateProfileChanges({ displayName, schoolLevelId, avatarChoice }) {
  if (!displayName.trim() || displayName.trim().length > 80)
    return 'Enter a name between 1 and 80 characters.'
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolLevelId))
    return 'Choose your Primary level.'
  if (!avatarOptions.some((option) => option.value === avatarChoice))
    return 'Choose an avatar option.'
  return ''
}

export async function updateCurrentProfile(fields) {
  const validationError = validateProfileChanges(fields)
  if (validationError) throw new Error(validationError)
  const client = getSupabase()
  const user = await requireUser(client)
  const { data, error } = await client
    .from('profiles')
    .update({
      display_name: fields.displayName.trim(),
      school_level_id: fields.schoolLevelId,
      avatar_choice: fields.avatarChoice,
    })
    .eq('id', user.id)
    .select(PROFILE_FIELDS)
    .single()
  if (error) throw error
  if (!data) throw new Error('Your changes could not be saved. Please try again.')
  return data
}

export async function requestEmailChange(email) {
  const nextEmail = email.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) throw new Error('Enter a valid email address.')
  const client = getSupabase()
  const user = await requireUser(client)
  if (user.email?.toLowerCase() === nextEmail.toLowerCase())
    throw new Error('Enter an email address different from your current email.')
  const { data, error } = await client.auth.updateUser(
    { email: nextEmail },
    { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}register` },
  )
  if (error) throw error
  if (!data.user) throw new Error('Your email change could not be requested. Please try again.')
  const needsConfirmation = data.user.email?.toLowerCase() !== nextEmail.toLowerCase()
  return {
    email: data.user.email || user.email,
    pendingEmail: needsConfirmation ? data.user.new_email || nextEmail : '',
    needsConfirmation,
  }
}

export async function resendEmailChange() {
  const client = getSupabase()
  const user = await requireUser(client)
  if (!user.new_email) throw new Error('There is no email change awaiting confirmation.')
  const { error } = await client.auth.resend({
    type: 'email_change',
    email: user.email,
    options: {
      emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}register`,
    },
  })
  if (error) throw error
}

import { getSupabase } from '../lib/supabase'
import { avatarOptions } from '../data/avatarOptions'

export function validateRegistration({
  email,
  displayName,
  schoolLevel,
  avatarChoice,
  password,
  confirmPassword,
}) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.'
  if (!displayName.trim() || displayName.trim().length > 80)
    return 'Enter a name between 1 and 80 characters.'
  if (!/^p[1-6]$/.test(schoolLevel)) return 'Choose your Primary level.'
  if (!avatarOptions.some((option) => option.value === avatarChoice))
    return 'Choose Male, Female, or Prefer not to say for your avatar.'
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return 'Your password needs at least 8 characters, a letter, and a number.'
  }
  if (password !== confirmPassword) return 'Passwords do not match.'
  return ''
}

export async function registerUser(fields) {
  const validationError = validateRegistration(fields)
  if (validationError) throw new Error(validationError)
  const { data, error } = await getSupabase().auth.signUp({
    email: fields.email.trim(),
    password: fields.password,
    options: {
      data: {
        display_name: fields.displayName.trim(),
        school_level_number: Number(fields.schoolLevel.slice(1)),
        avatar_choice: fields.avatarChoice,
      },
      emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}register`,
    },
  })
  if (error) throw error
  if (!data.user) throw new Error('Unable to create your account. Please try again.')
  return { needsEmailConfirmation: !data.session }
}

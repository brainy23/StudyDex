import { getSupabase } from '../lib/supabase'
import { avatarOptions, findAvatar } from '../data/avatarOptions'

const accountChanged = () => new Error('Your account changed. Please sign in again.')
const unavailable = () => new Error('We couldn’t check your setup. Please try again.')

async function authenticatedClient(expectedUserId) {
  const client = getSupabase()
  const { data: session, error: sessionError } = await client.auth.getSession()
  const accessToken = session?.session?.access_token
  if (sessionError || !accessToken) throw new Error('Please sign in to continue your setup.')
  const { data, error } = await client.auth.getUser(accessToken)
  if (error || !data?.user?.id) throw new Error('Please sign in to continue your setup.')
  if (expectedUserId && data.user.id !== expectedUserId) throw accountChanged()
  return { client, userId: data.user.id, accessToken }
}

async function checkedRpc(name, args, { expectedUserId, readOnly = false } = {}) {
  const { client, userId, accessToken } = await authenticatedClient(expectedUserId)
  const request = client.rpc(name, args, readOnly ? { get: true } : undefined)
  // Bind the request to the verified identity even if another login happens
  // before the SDK's fetch obtains its current session token.
  request.setHeader('Authorization', `Bearer ${accessToken}`)
  const { data, error } = await request
  if (error)
    throw new Error('Your setup could not be saved or loaded. Please try again.', { cause: error })
  const { data: after, error: authError } = await client.auth.getUser()
  if (authError || after?.user?.id !== userId) throw accountChanged()
  if (data?.user_id !== userId) throw accountChanged()
  return data
}

function validateStatus(data) {
  if (
    !data ||
    !findAvatar(data.avatar_choice) ||
    !['avatar_confirmed', 'starter_claimed', 'onboarding_complete'].every(
      (key) => typeof data[key] === 'boolean',
    ) ||
    !(
      data.school_level_id === null ||
      (typeof data.school_level_id === 'string' && data.school_level_id)
    )
  ) {
    throw unavailable()
  }
  const step = !data.school_level_id
    ? 'account'
    : !data.avatar_confirmed
      ? 'avatar'
      : !data.starter_claimed
        ? 'starter'
        : 'town'
  if (data.next_step !== step || data.onboarding_complete !== (step === 'town')) throw unavailable()
  return data
}

export async function getOnboardingStatus({ expectedUserId } = {}) {
  return validateStatus(
    await checkedRpc('get_onboarding_status', undefined, { expectedUserId, readOnly: true }),
  )
}

export async function saveOnboardingAvatar(avatarChoice, { expectedUserId } = {}) {
  if (!avatarOptions.some((option) => option.value === avatarChoice))
    throw new Error('Choose one of the avatar styles.')
  const status = validateStatus(
    await checkedRpc(
      'save_onboarding_avatar',
      { p_avatar_choice: avatarChoice },
      { expectedUserId },
    ),
  )
  if (!status.avatar_confirmed || status.avatar_choice !== avatarChoice) throw unavailable()
  return status
}

export async function claimOnboardingStarter(pokeapiId, { expectedUserId } = {}) {
  if (![1, 4, 7].includes(pokeapiId)) throw new Error('Choose one of the three starters.')
  const result = await checkedRpc('claim_starter', { p_pokeapi_id: pokeapiId }, { expectedUserId })
  if (result.claimed !== true || typeof result.already_claimed !== 'boolean') throw unavailable()
  const status = await getOnboardingStatus({ expectedUserId: result.user_id })
  if (!status.starter_claimed) throw unavailable()
  return status
}

export function onboardingDestination(status, { tutorial = false } = {}) {
  return {
    name: {
      account: 'account',
      avatar: 'characterdesign',
      starter: 'starter',
      town: tutorial ? 'tutorial' : 'home',
    }[status.next_step],
  }
}

export function watchOnboardingAccount(callback) {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) =>
    callback(session?.user?.id || null),
  )
  return () => data.subscription.unsubscribe()
}

import { getSupabase } from '../lib/supabase'
import { isPackId, readPendingReward, rememberPendingReward, clearPendingReward } from '../utils/pendingReward'

// These authenticated RPCs must be reviewed and deployed before live rewards work.
// Never replace them with browser-selected rewards or direct inventory writes.
function unavailable(error) {
  const message = error?.code === 'PGRST202' || error?.code === '42883'
    ? 'Rewards are not connected yet. Your packs have not been changed.'
    : 'We could not load your rewards. Please try again.'
  return new Error(message, { cause: error })
}

async function authenticatedClient() {
  const client = getSupabase()
  const { data, error } = await client.auth.getUser()
  if (error) throw unavailable(error)
  if (!data?.user) throw new Error('Please log in to see your packs.')
  return { client, userId: data.user.id }
}

async function assertSameAccount(client, userId) {
  const { data, error } = await client.auth.getUser()
  if (error || data?.user?.id !== userId) {
    throw new Error('Your account changed. Please log in again to recover your rewards.')
  }
}

export async function getRewardInventory() {
  const { client, userId } = await authenticatedClient()
  const { data, error } = await client.rpc('get_reward_inventory')
  if (error) throw unavailable(error)
  await assertSameAccount(client, userId)
  if (data?.user_id !== userId || !Number.isSafeInteger(data.unopened_count) ||
      data.unopened_count < 0 || !Array.isArray(data.packs) ||
      data.packs.some(pack => !isPackId(pack?.id)) ||
      new Set(data.packs.map(pack => pack.id)).size !== data.packs.length ||
      data.packs.length > data.unopened_count ||
      (data.unopened_count > 0 && !data.packs.length)) {
    throw new Error('Your pack count could not be checked. Please try again.')
  }
  return { userId, count: data.unopened_count, packs: data.packs, pendingPackId: readPendingReward(userId) }
}

export async function openRewardPack(packId) {
  if (!isPackId(packId)) {
    throw new Error('Please choose one of your saved packs.')
  }
  const { client, userId } = await authenticatedClient()
  const pending = readPendingReward(userId)
  if (pending && pending !== packId) throw new Error('Please finish viewing your previous pack first.')
  rememberPendingReward(userId, packId)
  // The server checks ownership, saves the result atomically, and returns the
  // same result when this pack ID is retried (including after a network error).
  const { data, error } = await client.rpc('open_reward_pack', { p_pack_id: packId })
  if (error) throw unavailable(error)
  await assertSameAccount(client, userId)
  if (data?.user_id !== userId || data.pack_id !== packId ||
      !['pokemon', 'xp'].includes(data.reward_type) ||
      !Number.isSafeInteger(data.pokemon?.pokeapi_id) || data.pokemon.pokeapi_id < 1 ||
      typeof data.pokemon.name !== 'string' ||
      (data.reward_type === 'xp' && (!Number.isSafeInteger(data.xp_awarded) || data.xp_awarded <= 0))) {
    throw new Error('Your pack result could not be checked. Retry this same pack to recover it.')
  }
  return data
}

export function acknowledgeRewardPack(userId, packId) {
  clearPendingReward(userId, packId)
  window.dispatchEvent(new Event('studydex:rewards-changed'))
}

export function watchRewardAccount(callback) {
  return getSupabase().auth.onAuthStateChange?.((event, session) => {
    // The callback stays synchronous; callers schedule any further auth work.
    callback(event, session?.user?.id ?? null)
  })?.data?.subscription
}

export async function getStarterStatus() {
  const { client, userId } = await authenticatedClient()
  const { data, error } = await client.rpc('get_starter_status')
  if (error) throw unavailable(error)
  await assertSameAccount(client, userId)
  if (data?.user_id !== userId || typeof data.claimed !== 'boolean') {
    throw new Error('Your starter could not be checked. Please try again.')
  }
  return data
}

export async function claimStarter(pokeapiId) {
  if (![1, 4, 7].includes(pokeapiId)) throw new Error('Choose one of the three starters.')
  const { client, userId } = await authenticatedClient()
  const { data, error } = await client.rpc('claim_starter', { p_pokeapi_id: pokeapiId })
  if (error) throw unavailable(error)
  await assertSameAccount(client, userId)
  if (data?.user_id !== userId || data.claimed !== true) {
    throw new Error('Your starter could not be confirmed. Please check again before retrying.')
  }
  window.dispatchEvent(new Event('studydex:rewards-changed'))
  return data
}

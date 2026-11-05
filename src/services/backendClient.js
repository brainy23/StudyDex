import { getSupabase } from '../lib/supabase'

// Bind each operation to the identity verified at its start, including its HTTP
// Authorization header. A login in another tab cannot retarget a queued write.
export async function checkedRpc(name, args, expectedUserId) {
  const client = getSupabase()
  const { data: session, error: sessionError } = await client.auth.getSession()
  const token = session?.session?.access_token
  if (sessionError || !token) throw new Error('Please sign in to continue.')
  const { data: auth, error } = await client.auth.getUser(token)
  const owner = auth?.user?.id
  if (error || !owner || expectedUserId && owner !== expectedUserId) throw new Error('Your account changed. Please sign in again.')
  const { data, error: rpcError } = await client.rpc(name, args).setHeader('Authorization', `Bearer ${token}`)
  if (rpcError) throw rpcError
  const { data: after, error: afterError } = await client.auth.getSession()
  if (afterError || after?.session?.user?.id !== owner) throw new Error('Your account changed. Please sign in again.')
  return data
}

export function activityChanged(result) {
  window.dispatchEvent(new CustomEvent('studydex:activity', { detail: result }))
  if (result?.xp || result?.rewardType) window.dispatchEvent(new CustomEvent('studydex:pokemon-xp', { detail: result.xp || result }))
}

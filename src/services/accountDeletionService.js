import { createTransientAuthClient, getSupabase } from '../lib/supabase'

const changedAccount = () =>
  new Error('Your account changed. Reload Account Settings before trying again.')

// Remove only this account's known browser records, never another account's storage.
export function clearDeletedAccountBrowserData(userId) {
  const prefixes = [
    `studydex:completed-topics:${encodeURIComponent(userId)}:`,
    `studydex-learn-return-v1:${userId}:`,
  ]
  const exact = [`studydex:focus:v1:${userId}`, `studydex-focus-completions-v1:${userId}`]
  let complete = true
  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      const storage = globalThis[name]
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      for (const key of keys) {
        if (exact.includes(key) || prefixes.some((prefix) => key?.startsWith(prefix)))
          storage.removeItem(key)
      }
      const bossKey = 'studydex-boss-encounter-v1'
      const encounter = JSON.parse(storage.getItem(bossKey) || 'null')
      if (encounter?.owner === userId) storage.removeItem(bossKey)
    } catch {
      complete = false
    }
  }
  return complete
}

export async function deleteOwnAccount({ password, confirmation, expectedUserId }) {
  if (!expectedUserId || confirmation !== 'DELETE' || !password)
    throw new Error('Enter your password and type DELETE to confirm.')
  const client = getSupabase()
  const { data: original, error: originalError } = await client.auth.getUser()
  if (originalError || original?.user?.id !== expectedUserId) throw changedAccount()
  if (!original.user.email) throw new Error('Sign in with your email and password first.')
  const temporary = createTransientAuthClient()
  try {
    const { data, error } = await temporary.auth.signInWithPassword({
      email: original.user.email,
      password,
    })
    if (error || !data?.session?.access_token)
      throw new Error('We couldn’t confirm your password. Check it and try again.')
    if (data.user?.id !== expectedUserId || data.session.user?.id !== expectedUserId)
      throw changedAccount()
    const { data: current, error: currentError } = await client.auth.getUser()
    if (currentError || current?.user?.id !== expectedUserId) throw changedAccount()

    // The deletion endpoint derives its sole target from this verified, fresh token.
    const { data: result, error: deletionError } = await client.functions.invoke('delete-account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      body: { confirmation: 'DELETE' },
    })
    if (deletionError || result?.deleted !== true) {
      throw new Error(
        'We couldn’t confirm deletion. Try signing in again before retrying, or contact the StudyDex team.',
      )
    }
    const localDataCleared = clearDeletedAccountBrowserData(expectedUserId)
    let accountChanged = true
    try {
      const { data: session } = await client.auth.getSession()
      accountChanged = !!session?.session?.user?.id && session.session.user.id !== expectedUserId
    } catch {
      /* Deletion already succeeded; cleanup failures must not claim otherwise. */
    }
    if (!accountChanged) {
      // The installed SDK clears local auth even when the deleted user returns 401/404.
      await client.auth.signOut({ scope: 'local' }).catch(() => {})
    }
    return { deleted: true, accountChanged, localDataCleared }
  } finally {
    // Revoke the non-persisted confirmation session if deletion failed or was cancelled.
    await temporary.auth.signOut({ scope: 'local' }).catch(() => {})
  }
}

const prefix = 'studydex:pending-pack:v1:'
const fallback = new Map()

export const isPackId = value => typeof value === 'string' &&
  /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)

// Only an account-scoped pack ID is cached, never XP, a random draw or auth data.
// Recovery still requires the server to authorize and return that saved result.
export function readPendingReward(userId) {
  if (!userId) return null
  let value
  try { value = sessionStorage.getItem(prefix + userId) } catch { /* Memory fallback. */ }
  value ||= fallback.get(userId)
  return isPackId(value) ? value : null
}

export function rememberPendingReward(userId, packId) {
  if (!userId || !isPackId(packId)) throw new Error('Invalid pending pack.')
  try {
    sessionStorage.setItem(prefix + userId, packId)
    fallback.delete(userId)
  } catch { fallback.set(userId, packId) }
}

export function clearPendingReward(userId, packId) {
  if (readPendingReward(userId) !== packId) return
  fallback.delete(userId)
  try { sessionStorage.removeItem(prefix + userId) } catch { /* Storage may be unavailable. */ }
}

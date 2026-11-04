const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}
const respond = (status, code, extra = {}) =>
  new Response(JSON.stringify({ code, ...extra }), { status, headers })

function authenticatedClaims(token, user, issuer, now) {
  // getUser(token) must have succeeded before this decoder is used. Decoding alone
  // is never authentication; the Auth server validates signature and account existence.
  const part = token.split('.')[1]?.replaceAll('-', '+').replaceAll('_', '/')
  const claims = JSON.parse(atob(part + '='.repeat((4 - (part.length % 4)) % 4)))
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  const requiresMfa = user.factors?.some((factor) => factor.status === 'verified')
  return (
    claims.sub === user.id &&
    claims.iss === issuer &&
    audience.includes('authenticated') &&
    claims.role === 'authenticated' &&
    !claims.is_anonymous &&
    !user.is_anonymous &&
    (!requiresMfa || claims.aal === 'aal2') &&
    typeof claims.session_id === 'string' &&
    claims.session_id.length > 0 &&
    Number.isFinite(claims.exp) &&
    claims.exp > now &&
    Array.isArray(claims.amr) &&
    claims.amr.some(
      (method) =>
        method.method === 'password' &&
        Number.isFinite(method.timestamp) &&
        method.timestamp >= now - 300 &&
        method.timestamp <= now + 30,
    )
  )
}

export function createDeleteAccountHandler({
  getUser,
  revokeSessions,
  deleteUser,
  issuer,
  now = () => Date.now(),
}) {
  return async (request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return respond(405, 'method_not_allowed')
    const bearer = request.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/i)
    if (!bearer) return respond(401, 'sign_in_required')
    try {
      const bodyText = await request.text()
      if (bodyText.length > 1024) return respond(413, 'request_too_large')
      let body
      try {
        body = JSON.parse(bodyText)
      } catch {
        return respond(400, 'confirmation_required')
      }
      if (
        !body ||
        Array.isArray(body) ||
        body.confirmation !== 'DELETE' ||
        Object.keys(body).length !== 1
      )
        return respond(400, 'confirmation_required')
      const token = bearer[1]
      const { data, error } = await getUser(token)
      if (error || !data?.user?.id) return respond(401, 'sign_in_required')
      let recent = false
      try {
        recent = authenticatedClaims(token, data.user, issuer, Math.floor(now() / 1000))
      } catch {
        /* fail closed */
      }
      if (!recent) return respond(403, 'recent_password_required')
      const revoked = await revokeSessions(token)
      if (revoked.error) return respond(503, 'deletion_unavailable')
      // Only the authenticated account ID is used. No target ID comes from the client.
      // Auth deletion triggers the existing database cascades in the same deletion.
      const deleted = await deleteUser(data.user.id, false)
      if (deleted.error) return respond(409, 'deletion_not_completed')
      return respond(200, 'account_deleted', { deleted: true })
    } catch {
      // Never log/return tokens, passwords, user records or internal database errors.
      return respond(503, 'deletion_unavailable')
    }
  }
}

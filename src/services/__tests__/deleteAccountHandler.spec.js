import { beforeEach, expect, it, vi } from 'vitest'
import { createDeleteAccountHandler } from '../../../supabase/functions/delete-account/handler.js'

const issuer = 'https://studydex-fixture.invalid/auth/v1'
const now = 1800000000
const encode = (value) =>
  btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
const token = (patch) =>
  `${encode({ alg: 'HS256' })}.${encode({
    sub: 'student-a',
    iss: issuer,
    aud: 'authenticated',
    role: 'authenticated',
    session_id: 'session-a',
    exp: now + 300,
    amr: [{ method: 'password', timestamp: now }],
    ...patch,
  })}.fixture`
let getUser, revokeSessions, deleteUser, handler
beforeEach(() => {
  getUser = vi.fn(async () => ({
    data: { user: { id: 'student-a', is_anonymous: false } },
    error: null,
  }))
  revokeSessions = vi.fn(async () => ({ error: null }))
  deleteUser = vi.fn(async () => ({ error: null }))
  handler = createDeleteAccountHandler({
    getUser,
    revokeSessions,
    deleteUser,
    issuer,
    now: () => now * 1000,
  })
})
const request = (body = { confirmation: 'DELETE' }, jwt = token(), method = 'POST') =>
  new Request('https://function.invalid', {
    method,
    headers: { Authorization: `Bearer ${jwt}` },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  })

it('hard-deletes only the server-verified account after revoking sessions', async () => {
  const result = await handler(request())
  expect(result.status).toBe(200)
  expect(await result.json()).toEqual({ code: 'account_deleted', deleted: true })
  expect(deleteUser).toHaveBeenCalledWith('student-a', false)
  expect(revokeSessions.mock.invocationCallOrder[0]).toBeLessThan(
    deleteUser.mock.invocationCallOrder[0],
  )
  expect(result.headers.get('cache-control')).toBe('no-store')
})
it.each([{ confirmation: 'DELETE', user_id: 'student-b' }, { confirmation: 'delete' }, {}])(
  'refuses missing/ambiguous confirmation and any supplied target ID: %j',
  async (body) => {
    expect((await handler(request(body))).status).toBe(400)
    expect(deleteUser).not.toHaveBeenCalled()
  },
)
it('rejects a token the Auth server cannot validate, even when its decoded claims look valid', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid signature') })
  expect((await handler(request())).status).toBe(401)
  expect(revokeSessions).not.toHaveBeenCalled()
  expect(deleteUser).not.toHaveBeenCalled()
})
it.each([
  { sub: 'student-b' },
  { iss: 'https://other-project.invalid/auth/v1' },
  { role: 'service_role' },
  { aud: 'anon' },
  { exp: now - 1 },
  { session_id: null },
  { is_anonymous: true },
  { amr: [{ method: 'oauth', timestamp: now }] },
  { amr: [{ method: 'password', timestamp: now - 301 }] },
  { amr: [{ method: 'password', timestamp: now + 60 }] },
  { amr: undefined },
])('requires a valid own-account token and recent password proof: %j', async (patch) => {
  expect((await handler(request(undefined, token(patch)))).status).toBe(403)
  expect(deleteUser).not.toHaveBeenCalled()
})
it('does not delete when session revocation fails or expose internal errors', async () => {
  revokeSessions.mockResolvedValue({ error: new Error('synthetic private detail') })
  const result = await handler(request())
  expect(result.status).toBe(503)
  expect(await result.text()).not.toContain('private detail')
  expect(deleteUser).not.toHaveBeenCalled()
})

it('does not bypass an enrolled MFA factor with password-only authentication', async () => {
  getUser.mockResolvedValue({
    data: { user: { id: 'student-a', factors: [{ status: 'verified' }] } },
    error: null,
  })
  expect((await handler(request(undefined, token({ aal: 'aal1' })))).status).toBe(403)
  expect(deleteUser).not.toHaveBeenCalled()
  expect((await handler(request(undefined, token({ aal: 'aal2' })))).status).toBe(200)
})
it('reports a blocked deletion without attempting manual row/file cleanup', async () => {
  deleteUser.mockResolvedValue({ error: new Error('synthetic foreign-key/storage blocker') })
  const result = await handler(request())
  expect(result.status).toBe(409)
  expect(await result.json()).toEqual({ code: 'deletion_not_completed' })
  expect(deleteUser).toHaveBeenCalledTimes(1)
})
it('supports CORS preflight and rejects GET, missing authorization and oversized bodies', async () => {
  expect(
    (await handler(new Request('https://function.invalid', { method: 'OPTIONS' }))).status,
  ).toBe(204)
  expect((await handler(request(undefined, token(), 'GET'))).status).toBe(405)
  expect((await handler(new Request('https://function.invalid', { method: 'POST' }))).status).toBe(
    401,
  )
  expect(
    (await handler(request({ confirmation: 'DELETE', padding: 'x'.repeat(1024) }))).status,
  ).toBe(413)
  expect(deleteUser).not.toHaveBeenCalled()
})

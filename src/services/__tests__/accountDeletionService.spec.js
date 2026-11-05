import { beforeEach, expect, it, vi } from 'vitest'
import { clearDeletedAccountBrowserData, deleteOwnAccount } from '../accountDeletionService'

const { getUser, getSession, signOut, signIn, temporarySignOut, invoke, listFactors, challenge, verify } = vi.hoisted(() => ({
  listFactors: vi.fn(), challenge: vi.fn(), verify: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
  signIn: vi.fn(),
  temporarySignOut: vi.fn(),
  invoke: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({
  getSupabase: () => ({ auth: { getUser, getSession, signOut }, functions: { invoke } }),
  createTransientAuthClient: () => ({
    auth: { signInWithPassword: signIn, signOut: temporarySignOut, mfa: { listFactors, challenge, verify } },
  }),
}))
const fields = {
  password: 'synthetic-password',
  confirmation: 'DELETE',
  expectedUserId: 'student-a',
}
beforeEach(() => {
  vi.resetAllMocks()
  listFactors.mockResolvedValue({ data: { all: [] }, error: null })
  localStorage.clear()
  sessionStorage.clear()
  getUser.mockResolvedValue({
    data: { user: { id: 'student-a', email: 'student@example.invalid' } },
    error: null,
  })
  signIn.mockResolvedValue({
    data: {
      user: { id: 'student-a' },
      session: { access_token: 'fresh-synthetic-token', user: { id: 'student-a' } },
    },
    error: null,
  })
  invoke.mockResolvedValue({ data: { deleted: true }, error: null })
  getSession.mockResolvedValue({ data: { session: { user: { id: 'student-a' } } } })
  signOut.mockResolvedValue({ error: null })
  temporarySignOut.mockResolvedValue({ error: null })
})
it('confirms the password without replacing the main session and sends no target ID/password to the function', async () => {
  expect(await deleteOwnAccount(fields)).toEqual({
    deleted: true,
    accountChanged: false,
    localDataCleared: true,
  })
  expect(signIn).toHaveBeenCalledWith({
    email: 'student@example.invalid',
    password: fields.password,
  })
  expect(invoke).toHaveBeenCalledWith('delete-account', {
    method: 'POST',
    headers: { Authorization: 'Bearer fresh-synthetic-token' },
    body: { confirmation: 'DELETE' },
  })
  expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  expect(temporarySignOut).toHaveBeenCalledWith({ scope: 'local' })
})
it.each([{ confirmation: '' }, { password: '' }, { expectedUserId: '' }])(
  'rejects incomplete confirmation: %j',
  async (patch) => {
    await expect(deleteOwnAccount({ ...fields, ...patch })).rejects.toThrow('type DELETE')
    expect(invoke).not.toHaveBeenCalled()
  },
)
it('refuses a stale account before reauthentication', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'student-b' } } })
  await expect(deleteOwnAccount(fields)).rejects.toThrow('account changed')
  expect(signIn).not.toHaveBeenCalled()
  expect(invoke).not.toHaveBeenCalled()
})
it('refuses a wrong password or mismatched reauthentication account', async () => {
  signIn.mockResolvedValueOnce({ data: {}, error: new Error('invalid password') })
  await expect(deleteOwnAccount(fields)).rejects.toThrow('confirm your password')
  signIn.mockResolvedValueOnce({
    data: { user: { id: 'student-b' }, session: { access_token: 'other' } },
  })
  await expect(deleteOwnAccount(fields)).rejects.toThrow('account changed')
  expect(invoke).not.toHaveBeenCalled()
})
it('refuses account changes while password confirmation is in progress', async () => {
  getUser
    .mockResolvedValueOnce({
      data: { user: { id: 'student-a', email: 'student@example.invalid' } },
    })
    .mockResolvedValueOnce({ data: { user: { id: 'student-b' } } })
  await expect(deleteOwnAccount(fields)).rejects.toThrow('account changed')
  expect(invoke).not.toHaveBeenCalled()
})
it('does not clear local data or claim success after an unavailable/uncertain deletion', async () => {
  localStorage.setItem('studydex:focus:v1:student-a', 'saved')
  invoke.mockResolvedValue({ data: null, error: new Error('lost response') })
  await expect(deleteOwnAccount(fields)).rejects.toThrow('couldn’t confirm deletion')
  expect(localStorage.getItem('studydex:focus:v1:student-a')).toBe('saved')
  expect(signOut).not.toHaveBeenCalled()
})
it('clears only known records belonging to the deleted account', () => {
  for (const storage of [localStorage, sessionStorage]) {
    storage.setItem('studydex:focus:v1:student-a', 'a')
    storage.setItem('studydex:completed-topics:student-a:level-1', '[]')
    storage.setItem('studydex-learn-return-v1:student-a:topic', '{}')
    storage.setItem('studydex-focus-completions-v1:student-a', '4')
    storage.setItem('studydex:focus:v1:student-b', 'b')
    storage.setItem('unrelated-setting', 'keep')
    storage.setItem('studydex-boss-encounter-v1', JSON.stringify({ owner: 'student-a' }))
  }
  expect(clearDeletedAccountBrowserData('student-a')).toBe(true)
  expect(localStorage.length).toBe(2)
  expect(sessionStorage.length).toBe(2)
  expect(localStorage.getItem('studydex:focus:v1:student-b')).toBe('b')
  expect(localStorage.getItem('unrelated-setting')).toBe('keep')
})
it('does not sign out a different account that became active after the deletion request', async () => {
  getSession.mockResolvedValue({ data: { session: { user: { id: 'student-b' } } } })
  expect((await deleteOwnAccount(fields)).accountChanged).toBe(true)
  expect(signOut).not.toHaveBeenCalled()
})
it('does not turn confirmed server deletion into failure because cleanup/session reads fail', async () => {
  getSession.mockRejectedValue(new Error('network unavailable'))
  expect((await deleteOwnAccount(fields)).deleted).toBe(true)
})
it('steps up the isolated confirmation session before deleting an MFA-enrolled account', async () => {
  listFactors.mockResolvedValue({ data: { all: [{ id:'factor-a', status:'verified', factor_type:'totp' }] } })
  challenge.mockResolvedValue({ data: { id:'challenge-a' } })
  verify.mockResolvedValue({ data: { access_token:'verified-aal2-token' } })
  const requestMfaCode = vi.fn(async () => '123456')
  await deleteOwnAccount({ ...fields, requestMfaCode })
  expect(challenge).toHaveBeenCalledWith({ factorId:'factor-a' })
  expect(verify).toHaveBeenCalledWith({ factorId:'factor-a', challengeId:'challenge-a', code:'123456' })
  expect(invoke.mock.calls[0][1].headers.Authorization).toBe('Bearer verified-aal2-token')
})
it('does not delete after a rejected or cancelled MFA challenge', async () => {
  listFactors.mockResolvedValue({ data: { all: [{ id:'factor-a', status:'verified', factor_type:'phone' }] } })
  challenge.mockResolvedValue({ data: { id:'challenge-a' } })
  await expect(deleteOwnAccount({ ...fields, requestMfaCode: async () => null })).rejects.toThrow('cancelled')
  expect(invoke).not.toHaveBeenCalled()
  verify.mockResolvedValue({ error: new Error('invalid code') })
  await expect(deleteOwnAccount({ ...fields, requestMfaCode: async () => '123456' })).rejects.toThrow('not accepted')
  expect(invoke).not.toHaveBeenCalled()
})

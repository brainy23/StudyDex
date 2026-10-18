import { beforeEach, expect, it, vi } from 'vitest'
import { getCurrentEmailSettings, requestEmailChange, resendEmailChange } from '../accountService'

const { getUser, updateUser, resend } = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
  resend: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({
  getSupabase: () => ({ auth: { getUser, updateUser, resend } }),
}))

beforeEach(() => {
  vi.resetAllMocks()
  getUser.mockResolvedValue({
    data: { user: { id: 'user-id', email: 'old@example.com' } },
    error: null,
  })
})

it('keeps the old sign-in email active while a change awaits confirmation', async () => {
  updateUser.mockResolvedValue({
    data: { user: { email: 'old@example.com', new_email: 'new@example.com' } },
    error: null,
  })
  await expect(requestEmailChange(' new@example.com ')).resolves.toEqual({
    email: 'old@example.com',
    pendingEmail: 'new@example.com',
    needsConfirmation: true,
  })
  expect(updateUser).toHaveBeenCalledWith(
    { email: 'new@example.com' },
    { emailRedirectTo: `${window.location.origin}/register` },
  )
})

it('recognizes an email change that has already taken effect', async () => {
  updateUser.mockResolvedValue({ data: { user: { email: 'new@example.com' } }, error: null })
  await expect(requestEmailChange('new@example.com')).resolves.toEqual({
    email: 'new@example.com',
    pendingEmail: '',
    needsConfirmation: false,
  })
})

it('reloads current and pending email addresses from Auth', async () => {
  getUser.mockResolvedValue({ data: { user: { email: 'new@example.com' } }, error: null })
  await expect(getCurrentEmailSettings()).resolves.toEqual({
    email: 'new@example.com',
    pendingEmail: '',
  })
})

it('resends a pending change using the current account email and the running app origin', async () => {
  getUser.mockResolvedValue({
    data: { user: { email: 'old@example.com', new_email: 'new@example.com' } },
    error: null,
  })
  resend.mockResolvedValue({ error: null })
  await resendEmailChange()
  expect(resend).toHaveBeenCalledWith({
    type: 'email_change',
    email: 'old@example.com',
    options: { emailRedirectTo: `${window.location.origin}/register` },
  })
})

it('does not resend if the pending change has already been completed', async () => {
  await expect(resendEmailChange()).rejects.toThrow('no email change awaiting confirmation')
  expect(resend).not.toHaveBeenCalled()
})

it('reports email rate limits instead of claiming a resend succeeded', async () => {
  getUser.mockResolvedValue({
    data: { user: { email: 'old@example.com', new_email: 'new@example.com' } },
    error: null,
  })
  resend.mockResolvedValue({ error: new Error('Email rate limit exceeded') })
  await expect(resendEmailChange()).rejects.toThrow('Email rate limit exceeded')
})

it('requires a signed-in user before changing an email', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null })
  await expect(requestEmailChange('new@example.com')).rejects.toThrow('Please log in')
  expect(updateUser).not.toHaveBeenCalled()
})

it.each(['invalid-email', 'OLD@example.com'])(
  'does not submit an invalid or unchanged email: %s',
  async (email) => {
    await expect(requestEmailChange(email)).rejects.toThrow()
    expect(updateUser).not.toHaveBeenCalled()
  },
)

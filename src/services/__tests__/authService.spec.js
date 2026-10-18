import { beforeEach, expect, it, vi } from 'vitest'
import { signOutCurrentSession } from '../authService'

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ auth: { signOut } }) }))

beforeEach(() => vi.resetAllMocks())

it('signs out the current session without signing out other devices', async () => {
  signOut.mockResolvedValue({ error: null })
  await expect(signOutCurrentSession()).resolves.toBeUndefined()
  expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
})

it('reports a failed sign-out so the page can offer a retry', async () => {
  signOut.mockResolvedValue({ error: new Error('Network unavailable') })
  await expect(signOutCurrentSession()).rejects.toThrow('Network unavailable')
})

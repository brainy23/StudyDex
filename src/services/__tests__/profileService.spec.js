import { beforeEach, expect, it, vi } from 'vitest'
import { getCurrentProfile } from '../profileService'

const { getUser, from, select, eq, single } = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ auth: { getUser }, from }) }))

beforeEach(() => {
  vi.resetAllMocks()
  getUser.mockResolvedValue({ data: { user: { id: 'signed-in-user' } }, error: null })
  from.mockReturnValue({ select })
  select.mockReturnValue({ eq })
  eq.mockReturnValue({ single })
})

it('loads the saved profile and school level for the verified signed-in user', async () => {
  const profile = {
    id: 'signed-in-user',
    display_name: 'Ash',
    avatar_choice: 'female',
    school_level: { name: 'Primary 3' },
  }
  single.mockResolvedValue({ data: profile, error: null })
  await expect(getCurrentProfile()).resolves.toEqual(profile)
  expect(from).toHaveBeenCalledWith('profiles')
  expect(eq).toHaveBeenCalledWith('id', 'signed-in-user')
})

it('does not query profiles when there is no signed-in user', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null })
  await expect(getCurrentProfile()).rejects.toThrow('Please log in')
  expect(from).not.toHaveBeenCalled()
})

it('stops if the Auth server rejects the session', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid session') })
  await expect(getCurrentProfile()).rejects.toThrow('Invalid session')
  expect(from).not.toHaveBeenCalled()
})

it('reports a profile query failure instead of returning demo data', async () => {
  single.mockResolvedValue({ data: null, error: new Error('Profile unavailable') })
  await expect(getCurrentProfile()).rejects.toThrow('Profile unavailable')
})

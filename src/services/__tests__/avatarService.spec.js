import { beforeEach, expect, it, vi } from 'vitest'
import { updateCurrentAvatar } from '../accountService'
import { PROFILE_FIELDS } from '../profileService'
import { avatarOptions } from '../../data/avatarOptions'

const { getUser, from, update, eq, select, single } = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ auth: { getUser }, from }) }))

beforeEach(() => {
  vi.resetAllMocks()
  getUser.mockResolvedValue({ data: { user: { id: 'verified-student' } }, error: null })
  from.mockReturnValue({ update })
  update.mockReturnValue({ eq })
  eq.mockReturnValue({ select })
  select.mockReturnValue({ single })
})

it.each(avatarOptions.map(option => option.value))('saves only the signed-in student’s %s avatar', async (avatar) => {
  const profile = { id: 'verified-student', display_name: 'Ash', school_level_id: null, avatar_choice: avatar }
  single.mockResolvedValue({ data: profile, error: null })
  await expect(updateCurrentAvatar(avatar)).resolves.toEqual(profile)
  expect(from).toHaveBeenCalledWith('profiles')
  expect(update).toHaveBeenCalledWith({ avatar_choice: avatar })
  expect(eq).toHaveBeenCalledWith('id', 'verified-student')
  expect(select).toHaveBeenCalledWith(PROFILE_FIELDS)
})

it('rejects unknown options without making an Auth or database request', async () => {
  await expect(updateCurrentAvatar('unknown')).rejects.toThrow('Choose an avatar option')
  expect(getUser).not.toHaveBeenCalled()
  expect(from).not.toHaveBeenCalled()
})

it('requires a verified signed-in user', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null })
  await expect(updateCurrentAvatar('female-classic')).rejects.toThrow('Please log in')
  expect(update).not.toHaveBeenCalled()
})

it('preserves database permission failures', async () => {
  const error = { code: '42501', message: 'permission denied for table profiles' }
  single.mockResolvedValue({ data: null, error })
  await expect(updateCurrentAvatar('female-classic')).rejects.toEqual(error)
})

it('does not claim success when no updated profile is returned', async () => {
  single.mockResolvedValue({ data: null, error: null })
  await expect(updateCurrentAvatar('female-classic')).rejects.toThrow('Your avatar could not be saved')
})

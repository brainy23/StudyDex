import { beforeEach, expect, it, vi } from 'vitest'
import {
  getOnboardingStatus,
  saveOnboardingAvatar,
  claimOnboardingStarter,
} from '../onboardingService'
import { avatarOptions } from '../../data/avatarOptions'

const { getUser, getSession, rpc, setHeader } = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  rpc: vi.fn(),
  setHeader: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({
  getSupabase: () => ({
    auth: { getUser, getSession },
    rpc: (...args) => {
      const request = rpc(...args)
      request.setHeader = setHeader
      return request
    },
  }),
}))
const state = (patch = {}) => ({
  user_id: 'student-a',
  avatar_choice: 'prefer_not_to_say',
  school_level_id: 'level-1',
  avatar_confirmed: false,
  starter_claimed: false,
  onboarding_complete: false,
  next_step: 'avatar',
  ...patch,
})
beforeEach(() => {
  vi.resetAllMocks()
  getUser.mockResolvedValue({ data: { user: { id: 'student-a' } }, error: null })
  getSession.mockResolvedValue({
    data: { session: { access_token: 'synthetic-session-a' } },
    error: null,
  })
  rpc.mockResolvedValue({ data: state(), error: null })
})
it('reads verified own status via GET without a user ID parameter', async () => {
  await expect(getOnboardingStatus()).resolves.toEqual(state())
  expect(rpc).toHaveBeenCalledWith('get_onboarding_status', undefined, { get: true })
  expect(getUser).toHaveBeenCalledWith('synthetic-session-a')
  expect(setHeader).toHaveBeenCalledWith('Authorization', 'Bearer synthetic-session-a')
})
it.each(avatarOptions)('saves the $value style through the authenticated RPC', async (avatar) => {
  const saved = state({ avatar_choice: avatar.value, avatar_confirmed: true, next_step: 'starter' })
  rpc.mockResolvedValue({ data: saved, error: null })
  await expect(
    saveOnboardingAvatar(avatar.value, { expectedUserId: 'student-a' }),
  ).resolves.toEqual(saved)
  expect(rpc).toHaveBeenCalledWith(
    'save_onboarding_avatar',
    { p_avatar_choice: avatar.value },
    undefined,
  )
})
it.each(['male', 'female', 'prefer_not_to_say', '../unknown', ''])(
  'does not offer/save legacy or invalid selection %s',
  async (choice) => {
    await expect(saveOnboardingAvatar(choice)).rejects.toThrow('Choose one of the avatar styles')
    expect(rpc).not.toHaveBeenCalled()
  },
)
it('refuses a stale page owner before sending any mutation', async () => {
  await expect(saveOnboardingAvatar('male-1', { expectedUserId: 'student-b' })).rejects.toThrow(
    'account changed',
  )
  expect(rpc).not.toHaveBeenCalled()
})
it('rejects another account response and account changes during the request', async () => {
  rpc.mockResolvedValueOnce({ data: state({ user_id: 'student-b' }), error: null })
  await expect(getOnboardingStatus()).rejects.toThrow('account changed')
  getUser
    .mockResolvedValueOnce({ data: { user: { id: 'student-a' } } })
    .mockResolvedValueOnce({ data: { user: { id: 'student-b' } } })
  await expect(saveOnboardingAvatar('male-1')).rejects.toThrow('account changed')
})
it.each([
  { next_step: 'town' },
  { onboarding_complete: true },
  { avatar_confirmed: 'true' },
  { avatar_choice: 'missing' },
  { school_level_id: undefined },
])('rejects inconsistent or malformed server state %j', async (patch) => {
  rpc.mockResolvedValue({ data: state(patch), error: null })
  await expect(getOnboardingStatus()).rejects.toThrow('check your setup')
})
it('does not accept an unconfirmed or different avatar save', async () => {
  await expect(saveOnboardingAvatar('male-1')).rejects.toThrow('check your setup')
})
it('handles missing configuration/backend errors without claiming completion', async () => {
  rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } })
  await expect(getOnboardingStatus()).rejects.toThrow('could not be saved or loaded')
})
it('requires authentication before calling the backend', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null })
  await expect(getOnboardingStatus()).rejects.toThrow('Please sign in')
  expect(rpc).not.toHaveBeenCalled()
})
it('cannot send a write under a different newly logged-in session token', async () => {
  getUser
    .mockResolvedValueOnce({ data: { user: { id: 'student-a' } } })
    .mockResolvedValueOnce({ data: { user: { id: 'student-b' } } })
  rpc.mockResolvedValue({
    data: state({ avatar_choice: 'male-1', avatar_confirmed: true, next_step: 'starter' }),
    error: null,
  })
  await expect(saveOnboardingAvatar('male-1', { expectedUserId: 'student-a' })).rejects.toThrow(
    'account changed',
  )
  expect(setHeader).toHaveBeenCalledWith('Authorization', 'Bearer synthetic-session-a')
})
it('uses the existing starter claim then refreshes persisted completion', async () => {
  rpc
    .mockResolvedValueOnce({
      data: { user_id: 'student-a', claimed: true, already_claimed: false },
      error: null,
    })
    .mockResolvedValueOnce({
      data: state({
        avatar_choice: 'male-1',
        avatar_confirmed: true,
        starter_claimed: true,
        onboarding_complete: true,
        next_step: 'town',
      }),
      error: null,
    })
  await expect(claimOnboardingStarter(4, { expectedUserId: 'student-a' })).resolves.toMatchObject({
    next_step: 'town',
    onboarding_complete: true,
  })
  expect(rpc.mock.calls[0]).toEqual(['claim_starter', { p_pokeapi_id: 4 }, undefined])
  expect(rpc.mock.calls[1]).toEqual(['get_onboarding_status', undefined, { get: true }])
})
it('does not invent a completed starter after a malformed claim', async () => {
  await expect(claimOnboardingStarter(4)).rejects.toThrow('check your setup')
})
it('never sends an unsupported starter request', async () => {
  await expect(claimOnboardingStarter(25)).rejects.toThrow('three starters')
  expect(rpc).not.toHaveBeenCalled()
})

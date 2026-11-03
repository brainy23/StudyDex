import { beforeEach, expect, it, vi } from 'vitest'
import { getRewardInventory, openRewardPack, getStarterStatus, claimStarter } from '../rewardsService'
const { getUser, rpc } = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ auth: { getUser }, rpc }) }))
const packId = '11111111-1111-4111-8111-111111111111'
const result = { user_id: 'student', pack_id: packId, reward_type: 'pokemon', pokemon: { pokeapi_id: 4, name: 'charmander' } }
beforeEach(() => {
  vi.resetAllMocks()
  getUser.mockResolvedValue({ data: { user: { id: 'student' } }, error: null })
})
it('loads server counts without accepting a browser user ID or querying answer tables', async () => {
  rpc.mockResolvedValue({ data: { user_id: 'student', unopened_count: 3, packs: [{ id: packId }] } })
  expect(await getRewardInventory()).toEqual({ userId: 'student', count: 3, packs: [{ id: packId }] })
  expect(rpc).toHaveBeenCalledExactlyOnceWith('get_reward_inventory')
})
it('does not convert a missing backend into zero packs', async () => {
  rpc.mockResolvedValue({ error: { code: 'PGRST202' } })
  await expect(getRewardInventory()).rejects.toThrow('not connected')
})
it.each([
  { user_id: 'another-student', unopened_count: 3, packs: [{ id: packId }] },
  { user_id: 'student', unopened_count: -1, packs: [] },
  { user_id: 'student', unopened_count: 2, packs: [] },
  { user_id: 'student', unopened_count: 0, packs: [{ id: packId }] },
])('rejects mismatched or inconsistent inventory %j', async data => {
  rpc.mockResolvedValue({ data })
  await expect(getRewardInventory()).rejects.toThrow('could not be checked')
})
it('requires authentication before any rewards call', async () => {
  getUser.mockResolvedValue({ data: { user: null } })
  await expect(getRewardInventory()).rejects.toThrow('log in')
  expect(rpc).not.toHaveBeenCalled()
})
it('sends only the specific saved pack ID to the authoritative opening endpoint', async () => {
  rpc.mockResolvedValue({ data: result })
  expect(await openRewardPack(packId)).toEqual(result)
  expect(rpc).toHaveBeenCalledExactlyOnceWith('open_reward_pack', { p_pack_id: packId })
})
it('rejects invalid IDs before contacting the server', async () => {
  await expect(openRewardPack('4')).rejects.toThrow('saved packs')
  expect(rpc).not.toHaveBeenCalled()
})
it('rejects a result for another pack', async () => {
  rpc.mockResolvedValue({ data: { ...result, pack_id: 'other' } })
  await expect(openRewardPack(packId)).rejects.toThrow('Retry this same pack')
})
it('does not reveal an old account result after switching accounts', async () => {
  rpc.mockResolvedValue({ data: result })
  getUser.mockResolvedValueOnce({ data: { user: { id: 'student' } } })
    .mockResolvedValueOnce({ data: { user: { id: 'other' } } })
  await expect(openRewardPack(packId)).rejects.toThrow('account changed')
})
it('does not display invented duplicate XP', async () => {
  rpc.mockResolvedValue({ data: { ...result, reward_type: 'xp', xp_awarded: 0 } })
  await expect(openRewardPack(packId)).rejects.toThrow('could not be checked')
})

it('checks saved starter status for the authenticated account', async () => {
  rpc.mockResolvedValue({ data: { user_id: 'student', claimed: false } })
  expect(await getStarterStatus()).toEqual({ user_id: 'student', claimed: false })
  expect(rpc).toHaveBeenCalledExactlyOnceWith('get_starter_status')
})
it('submits only an eligible starter ID and waits for server confirmation', async () => {
  rpc.mockResolvedValue({ data: { user_id: 'student', claimed: true } })
  await expect(claimStarter(4)).resolves.toMatchObject({ claimed: true })
  expect(rpc).toHaveBeenCalledExactlyOnceWith('claim_starter', { p_pokeapi_id: 4 })
})
it('does not allow an arbitrary Pokemon to be claimed as a starter', async () => {
  await expect(claimStarter(150)).rejects.toThrow('three starters')
  expect(rpc).not.toHaveBeenCalled()
})

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { awardExperience } from '../experienceService'
import { planPokemonXp } from '../pokemonProgression'
const { from, rpc, previous, buddyResult } = vi.hoisted(() => ({
  from: vi.fn(), rpc: vi.fn(), previous: vi.fn(), buddyResult: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ from, rpc }) }))
vi.mock('../pokemonProgression', () => ({ planPokemonXp: vi.fn() }))
const recordId = '00000000-0000-4000-8000-000000000001'
const event = { id: '00000000-0000-4000-8000-000000000002', pokemonId: recordId, type: 'boss', health: 0 }
const original = { id: recordId, user_id: 'student', pokemon_id: 'catalogue-charmander', xp: 190, level: 1,
  pokemon: { name: 'Charmander', sprite_url: '/charmander.png' } }
const plan = { result: { name: 'Charmeleon', id: 5, xp: 40, level: 2 },
  appliedDelta: 50, evolutions: [{ from: 'charmander', to: 'charmeleon', direction: 'evolve' }], evolved: true }
beforeEach(() => {
  vi.resetAllMocks()
  from.mockImplementation(table => {
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query),
      maybeSingle: previous, single: buddyResult }
    if (!['studydex_xp_events', 'user_pokemon'].includes(table)) throw Error(`Unexpected ${table}`)
    return query
  })
  previous.mockResolvedValue({ data: null, error: null })
  buddyResult.mockResolvedValue({ data: original, error: null })
  planPokemonXp.mockResolvedValue(plan)
  rpc.mockImplementation(async (_, payload) => ({ data: payload.p_result, error: null }))
})
afterEach(() => vi.restoreAllMocks())
it('plans from the saved form then atomically persists the final species, level and XP', async () => {
  const result = await awardExperience(event)
  expect(planPokemonXp).toHaveBeenCalledWith(expect.objectContaining({ name: 'Charmander', xp: 190 }), { delta: 50 })
  expect(rpc).toHaveBeenCalledTimes(1)
  expect(rpc).toHaveBeenCalledWith('save_studydex_progression', expect.objectContaining({
    p_pokemon_record_id: recordId,
    p_expected: { pokemon_id: 'catalogue-charmander', xp: 190, level: 1 },
    p_result: expect.objectContaining({ pokemonName: 'Charmeleon', xp: 40, level: 2 }),
  }))
  expect(result.evolved).toBe(true)
})
it('passes a loss to the planner before any zero clamping', async () => {
  await awardExperience({ ...event, health: 2 })
  expect(planPokemonXp).toHaveBeenCalledWith(expect.anything(), { delta: -50 })
})
it('returns the committed result on retries without planning or writing twice', async () => {
  previous.mockResolvedValue({ data: { pokemon_record_id: recordId, reward_type: 'boss',
    result: { pokemonName: 'Charmeleon', xp: 20 } }, error: null })
  expect(await awardExperience(event)).toMatchObject({ duplicate: true, pokemonName: 'Charmeleon' })
  expect(planPokemonXp).not.toHaveBeenCalled()
  expect(rpc).not.toHaveBeenCalled()
})
it('rejects reused event IDs for a different activity', async () => {
  previous.mockResolvedValue({ data: { pokemon_record_id: recordId, reward_type: 'timer' }, error: null })
  await expect(awardExperience(event)).rejects.toThrow('another reward')
  expect(rpc).not.toHaveBeenCalled()
})
it('does not save when progression data cannot be loaded', async () => {
  planPokemonXp.mockRejectedValue(Error('PokéAPI unavailable'))
  await expect(awardExperience(event)).rejects.toThrow('PokéAPI unavailable')
  expect(rpc).not.toHaveBeenCalled()
})
it('propagates save failures without announcing a committed XP award', async () => {
  rpc.mockResolvedValue({ data: null, error: Error('Stale progress') })
  const dispatch = vi.spyOn(window, 'dispatchEvent')
  await expect(awardExperience(event)).rejects.toThrow('Stale progress')
  expect(dispatch).not.toHaveBeenCalled()
})

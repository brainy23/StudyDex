import { beforeEach, expect, it, vi } from 'vitest'
import { getOwnedPokemon, selectOwnedPokemon } from '../pokemonService'
const { getUser, rpc } = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ auth: { getUser }, rpc }) }))
const ownedId = '11111111-1111-4111-8111-111111111111'
const row = { owned_id: ownedId, pokemon_id: 'base', pokeapi_id: 5, original_pokeapi_id: 4, name: 'charmeleon', xp: 90, level: 2, stage_count: 3, evolution_stage: 1, fully_trained: false, is_selected: true, is_defeated: false, sprite_url: null }
beforeEach(() => {
  vi.resetAllMocks()
  getUser.mockResolvedValue({ data: { user: { id: 'student' } } })
  rpc.mockResolvedValue({ data: { user_id: 'student', pokemon: [row], starter_claimed: true, pending_xp: 0 } })
})
it('loads only the authenticated server collection and maps the evolved form', async () => {
  const result = await getOwnedPokemon()
  expect(rpc).toHaveBeenCalledExactlyOnceWith('get_user_pokemon', {}, { get: true })
  expect(result.pokemon[0]).toMatchObject({ ownedId, id: 5, originalSpeciesId: 4, name: 'Charmeleon', xp: 90, evolution_stage: 1, static_img: '' })
})
it('selects by owned record UUID rather than species ID or supplied user ID', async () => {
  await selectOwnedPokemon(ownedId)
  expect(rpc).toHaveBeenCalledExactlyOnceWith('select_user_pokemon', { p_owned_id: ownedId })
})
it('rejects invalid selection IDs without an RPC', async () => {
  await expect(selectOwnedPokemon('4')).rejects.toThrow('collection')
  expect(rpc).not.toHaveBeenCalled()
})
it('rejects another account response', async () => {
  rpc.mockResolvedValue({ data: { user_id: 'other', pokemon: [] } })
  await expect(getOwnedPokemon()).rejects.toThrow('account changed')
})
it('rejects an account switch while the request was in flight', async () => {
  getUser.mockResolvedValueOnce({ data: { user: { id: 'student' } } }).mockResolvedValueOnce({ data: { user: { id: 'other' } } })
  await expect(getOwnedPokemon()).rejects.toThrow('account changed')
})
it('does not substitute sample Pokemon when the server is unavailable', async () => {
  rpc.mockResolvedValue({ error: { code: 'PGRST202' } })
  await expect(getOwnedPokemon()).rejects.toThrow('could not load')
})
it('rejects duplicate ownership records or multiple selected buddies', async () => {
  rpc.mockResolvedValue({ data: { user_id: 'student', pokemon: [row, row], starter_claimed: true, pending_xp: 0 } })
  await expect(getOwnedPokemon()).rejects.toThrow('could not be checked')
})
it('requires sign-in before requesting any collection', async () => {
  getUser.mockResolvedValue({ data: { user: null } })
  await expect(getOwnedPokemon()).rejects.toThrow('log in')
  expect(rpc).not.toHaveBeenCalled()
})

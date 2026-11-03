import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { usePokemonCollection } from '../usePokemonCollection'
import { getOwnedPokemon, selectOwnedPokemon } from '../../services/pokemonService'
import { watchRewardAccount } from '../../services/rewardsService'
vi.mock('../../services/pokemonService', () => ({ getOwnedPokemon: vi.fn(), selectOwnedPokemon: vi.fn() }))
vi.mock('../../services/rewardsService', () => ({ watchRewardAccount: vi.fn() }))
let wrappers = [], state, accountChanged
const first = { ownedId: 'first', is_selected: true }, second = { ownedId: 'second', is_selected: false }
const collection = () => ({ userId: 'student', pokemon: [first, second], starterClaimed: true, pendingXp: 0 })
function consumer() { const w = mount({ setup() { state = usePokemonCollection(); return state }, template: '<div />' }); wrappers.push(w); return w }
beforeEach(() => {
  vi.resetAllMocks()
  getOwnedPokemon.mockResolvedValue(collection())
  watchRewardAccount.mockImplementation(callback => { accountChanged = callback; return { unsubscribe: vi.fn() } })
})
afterEach(() => { wrappers.forEach(w=>w.unmount()); wrappers = [] })
it('shares one persisted collection between mounted views', async () => {
  consumer(); consumer(); await flushPromises()
  expect(getOwnedPokemon).toHaveBeenCalledOnce()
  expect(state.active.value.ownedId).toBe('first')
})
it('updates selection only after the server confirms it', async () => {
  let resolve
  selectOwnedPokemon.mockReturnValue(new Promise(r=>{resolve=r}))
  consumer(); await flushPromises()
  const pending = state.select(second)
  expect(state.active.value.ownedId).toBe('first')
  resolve({ ...collection(), pokemon: [{ ...first, is_selected: false }, { ...second, is_selected: true }] })
  await pending
  expect(state.active.value.ownedId).toBe('second')
})
it('failed selection preserves the saved buddy and permits retry', async () => {
  consumer(); await flushPromises()
  selectOwnedPokemon.mockRejectedValue(new Error('Try again'))
  await state.select(second)
  expect(state.active.value.ownedId).toBe('first')
  expect(state.saving.value).toBe(false)
  expect(state.error.value).toBe('Try again')
})
it('sign-out clears ownership immediately and ignores an old response', async () => {
  let resolve
  getOwnedPokemon.mockReturnValue(new Promise(r=>{resolve=r}))
  consumer(); accountChanged('SIGNED_OUT', null)
  resolve(collection()); await flushPromises()
  expect(state.pokemon.value).toEqual([])
})
it('refreshes saved acquisitions on the Pokemon-change event', async () => {
  consumer(); await flushPromises()
  window.dispatchEvent(new Event('studydex:pokemon-changed')); await flushPromises()
  expect(getOwnedPokemon).toHaveBeenCalledTimes(2)
})

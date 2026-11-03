import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import PokemonBuddy from '../PokemonBuddy.vue'
import axios from 'axios'
vi.mock('axios', () => ({ default: { get: vi.fn() } }))
let wrapper
const form = (id, name, next = []) => ({ species: { name, url: `https://pokeapi.co/api/v2/pokemon-species/${id}/` }, evolves_to: next })
const chains = {
  charmander: form(4, 'charmander', [form(5, 'charmeleon', [form(6, 'charizard')])]),
  eevee: form(133, 'eevee', [form(134, 'vaporeon')]),
  ditto: form(132, 'ditto'),
}
const names = { 4: 'charmander', 5: 'charmeleon', 6: 'charizard', 132: 'ditto', 133: 'eevee', 134: 'vaporeon' }
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  axios.get.mockReset().mockImplementation(async url => {
    if (url.includes('/evolution-chain/')) return { data: { chain: chains[url.split('/').at(-2)] } }
    if (url.includes('/pokemon-species/')) {
      const id = Number(url.split('/').at(-2)); const name = names[id]
      const root = id <= 6 ? 'charmander' : id === 132 ? 'ditto' : 'eevee'
      return { data: { name, evolution_chain: { url: `https://pokeapi.co/api/v2/evolution-chain/${root}/` } } }
    }
    const name = url.split('/').at(-2)
    const id = Number(Object.keys(names).find(id => names[id] === name))
    return { data: { id, name, sprites: { front_default: `/${id}.png` } } }
  })
})
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals() })
function render(pokemon) {
  wrapper = mount(PokemonBuddy, { props: { activePokemon: { id: 4, originalSpeciesId: 4, name: 'Charmander', xp: 0, evolution_stage: 0, ...pokemon } } })
  return wrapper.vm
}
it('evolves at 75 XP and preserves all cumulative XP', async () => {
  const buddy = render({ xp: 74 })
  expect(await buddy.addXP(1)).toMatchObject({ accepted: true })
  expect(wrapper.emitted('update-pokemon')[0][0].changes).toMatchObject({ id: 5, xp: 75, evolution_stage: 1, stageCount: 3 })
})
it('crosses both evolution boundaries in a single award without resetting XP', async () => {
  const buddy = render({ xp: 60 })
  await buddy.addXP(130)
  expect(wrapper.emitted('update-pokemon')[0][0].changes).toMatchObject({ id: 6, xp: 190, evolution_stage: 2 })
})
it('caps at 250 XP and preserves excess for transfer', async () => {
  const buddy = render({ xp: 0 })
  expect(await buddy.addXP(300)).toMatchObject({ accepted: true, overflow: 50 })
  expect(wrapper.emitted('update-pokemon')[0][0].changes).toMatchObject({ id: 6, xp: 250, evolution_stage: 'MAX' })
  expect(wrapper.emitted('xp-overflow')[0][0].amount).toBe(50)
})
it('two-stage evolution happens at 125 XP', async () => {
  const buddy = render({ id: 133, originalSpeciesId: 133, name: 'Eevee', xp: 124 })
  await buddy.addXP(1)
  expect(wrapper.emitted('update-pokemon')[0][0].changes).toMatchObject({ id: 134, xp: 125, evolution_stage: 1, stageCount: 2 })
})
it('a non-evolving Pokemon can train beyond 125 XP', async () => {
  const buddy = render({ id: 132, originalSpeciesId: 132, name: 'Ditto', xp: 100 })
  await buddy.addXP(50)
  expect(wrapper.emitted('update-pokemon')[0][0].changes).toMatchObject({ id: 132, xp: 150, evolution_stage: 0, stageCount: 1 })
})
it('retains backwards preview behavior across the cumulative 175 boundary', async () => {
  const buddy = render({ id: 6, originalSpeciesId: 4, name: 'Charizard', xp: 175, evolution_stage: 2 })
  await buddy.subtractXP(1)
  expect(wrapper.emitted('update-pokemon')[0][0].changes).toMatchObject({ id: 5, xp: 174, evolution_stage: 1 })
})
it('a failed evolution lookup does not partially apply XP', async () => {
  axios.get.mockRejectedValue(new Error('offline'))
  const buddy = render({ xp: 74 })
  expect(await buddy.addXP(1)).toMatchObject({ accepted: false })
  expect(wrapper.emitted('update-pokemon')).toBeUndefined()
})
it('already trained Pokemon return overflow without needing the API', async () => {
  const buddy = render({ xp: 250, evolution_stage: 'MAX', stageCount: 3 })
  expect(await buddy.addXP(15)).toMatchObject({ accepted: true, overflow: 15 })
  expect(axios.get).not.toHaveBeenCalled()
})

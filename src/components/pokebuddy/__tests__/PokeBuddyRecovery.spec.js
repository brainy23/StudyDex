import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import PokeBuddy from '../PokeBuddy.vue'
import axios from 'axios'
vi.mock('axios', () => ({ default: { get: vi.fn() } }))
let wrapper
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  vi.spyOn(Math, 'random').mockReturnValue(0)
  axios.get.mockReset().mockImplementation(async url => {
    if (url.includes('pokemon-species')) return { data: { evolves_from_species: null, evolution_chain: null } }
    const id = Number(url.split('/').filter(Boolean).at(-1))
    return { data: { id, name: id === 1 ? 'bulbasaur' : id === 4 ? 'charmander' : 'pichu', sprites: { front_default: '/fixture.png' } } }
  })
})
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
async function click(label) {
  await wrapper.findAll('button').find(b => b.text() === label).trigger('click')
  await flushPromises()
}
it('offers one local recovery gift at the exact cap even without overflow and selects the new buddy', async () => {
  wrapper = mount(PokeBuddy, { global: { stubs: { NavBar: true } } })
  await flushPromises()
  for (let n = 0; n < 3; n++) await click('+50 XP')
  await click('+10 XP') // Pichu: 90 → 250 exactly, zero overflow.
  const charm = wrapper.findAll('.pokemon-card').find(card => card.find('h3').text() === 'Charmander')
  await charm.get('button').trigger('click'); await flushPromises()
  for (let n = 0; n < 3; n++) await click('+50 XP')
  for (let n = 0; n < 4; n++) await click('+10 XP') // Charmander: 60 → 250 exactly.
  expect(wrapper.get('.overflow-panel h2').text()).toBe('Your Pokémon are fully trained!')
  await click('Open gift 🎁')
  expect(wrapper.get('.pokemon-buddy h3').text()).toBe('Bulbasaur')
  expect(wrapper.findAll('.pokemon-card')).toHaveLength(3)
  expect(wrapper.find('.overflow-panel').exists()).toBe(false)
})

import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import PokedexRewardModal from '../PokedexRewardModal.vue'
import { getStudyPokemonRewards, resolveStudyPokemonReward } from '../../../services/studyPokemonRewards'

vi.mock('../../../services/studyPokemonRewards', () => ({ getStudyPokemonRewards: vi.fn(), resolveStudyPokemonReward: vi.fn() }))
vi.mock('../../../services/studyService', () => ({ resolveStudyImage: value => value }))
const maxed = { owned_id: 'max', name: 'Charizard', xp: 200, evolution_stage: 'MAX', fully_trained: true, is_selected: true }
const available = { owned_id: 'available', name: 'Squirtle', xp: 20, level: 1, evolution_stage: 0, fully_trained: false }
let wrapper
beforeEach(() => vi.resetAllMocks())
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = '' })
async function render(state) {
  getStudyPokemonRewards.mockResolvedValue(state)
  wrapper = mount(PokedexRewardModal, { props: { userId: 'student' }, attachTo: document.body })
  await flushPromises()
}
function button(text) { return [...document.querySelectorAll('button')].find(b => b.textContent.includes(text)) }

it('loads saved eligible Pokémon and transfers pending XP while activating the chosen record', async () => {
  await render({ pokemon: [maxed, available], pending_xp: 5 })
  expect(getStudyPokemonRewards).toHaveBeenCalledWith('student')
  expect(document.querySelector('dialog').open).toBe(true)
  expect(button('Open Poképack')).toBeUndefined()
  resolveStudyPokemonReward.mockResolvedValue({ pokemon: [{ ...maxed, is_selected: false }, { ...available, xp: 25, is_selected: true }], pending_xp: 0 })
  button('Squirtle').click()
  await flushPromises()
  expect(resolveStudyPokemonReward).toHaveBeenCalledExactlyOnceWith('student', { ownedId: 'available' })
  expect(wrapper.emitted('saved')).toHaveLength(1)
  expect(document.body.textContent).toContain('Squirtle is now your active buddy')
})
it('offers a saved recovery pack only when no existing Pokémon can receive XP', async () => {
  await render({ pokemon: [maxed], pending_xp: 3, recovery_pack_id: 'pack' })
  resolveStudyPokemonReward.mockResolvedValue({ pokemon: [{ ...available, is_selected: true }], pending_xp: 0 })
  button('Open Poképack').click()
  await flushPromises()
  expect(resolveStudyPokemonReward).toHaveBeenCalledExactlyOnceWith('student', { packId: 'pack' })
})
it('retains the choice and pending XP after failure and lets the user retry', async () => {
  await render({ pokemon: [maxed, available], pending_xp: 5 })
  resolveStudyPokemonReward.mockRejectedValueOnce(new Error('Network unavailable'))
  button('Squirtle').click()
  await flushPromises()
  expect(document.body.textContent).toContain('Network unavailable')
  expect(document.body.textContent).toContain('5 XP')
  expect(button('Squirtle').disabled).toBe(false)
  expect(wrapper.emitted('saved')).toBeUndefined()
})
it('does not interrupt study while the active Pokémon can still receive XP', async () => {
  await render({ pokemon: [{ ...available, is_selected: true }], pending_xp: 0 })
  expect(document.querySelector('dialog').open).toBe(false)
})
it('ignores an old account response after the signed-in user changes', async () => {
  let finish
  getStudyPokemonRewards.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  wrapper = mount(PokedexRewardModal, { props: { userId: 'old' }, attachTo: document.body })
  getStudyPokemonRewards.mockResolvedValue({ pokemon: [{ ...available, is_selected: true }], pending_xp: 0 })
  await wrapper.setProps({ userId: 'new' })
  await flushPromises()
  finish({ pokemon: [maxed], pending_xp: 20, recovery_pack_id: 'old-pack' })
  await flushPromises()
  expect(document.querySelector('dialog').open).toBe(false)
  expect(button('Open Poképack')).toBeUndefined()
})

it('uses the saved MAX level state rather than filtering by raw XP', async () => {
  await render({ pokemon: [
    { ...maxed, xp: 10 },
    { ...available, xp: 200 },
    { owned_id: 'level-max', name: 'Blastoise', level: 'MAX', xp: 0 },
  ], pending_xp: 5 })
  expect(button('Squirtle')).toBeDefined()
  expect(button('Charizard')).toBeUndefined()
  expect(button('Blastoise')).toBeUndefined()
  expect(button('Open Poképack')).toBeUndefined()
})

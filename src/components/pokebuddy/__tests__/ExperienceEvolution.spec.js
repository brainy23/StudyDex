import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import XpPrompt from '../../common/xpPrompt.vue'
import PokeSprite from '../PokeSprite.vue'
import { pokemonFetch, originalPokemon, finalPokemon, transition } from '../../../test/pokemonFixtures'
vi.mock('../../../../scripts/soundEffect', () => ({ default: vi.fn() }))
let wrapper
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(pokemonFetch))
})
afterEach(() => {
  wrapper?.unmount()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
function result(extra = {}) {
  return { id: 'activity', saving: false, delta: 30, xp: 20, level: 2,
    pokemonName: 'Charmeleon', originalPokemon, pokemon: finalPokemon,
    evolved: true, evolutions: [transition], ...extra }
}
function open(value) {
  wrapper = mount(XpPrompt, { props: { result: value }, global: { stubs: { teleport: true } } })
}
it('plays the old and new front sprites, blocks closing, then shows the evolution note', async () => {
  open(result())
  await flushPromises()
  expect(wrapper.findComponent(PokeSprite).props('facing')).toBe('front')
  expect(wrapper.get('.buddy-sprite').attributes('src')).toContain('charmander-front')
  expect(wrapper.get('.action-button').attributes('disabled')).toBeDefined()
  await wrapper.get('.xp-close').trigger('click')
  expect(wrapper.emitted('close')).toBeUndefined()
  await vi.advanceTimersByTimeAsync(1800)
  await flushPromises()
  expect(wrapper.get('.buddy-sprite').attributes('src')).toContain('charmeleon-front')
  expect(wrapper.text()).toContain('Charmeleon evolved!')
  expect(wrapper.get('.action-button').attributes('disabled')).toBeUndefined()
  await wrapper.get('.action-button').trigger('click')
  expect(wrapper.emitted('close')).toHaveLength(1)
})
it('shows the new front-facing base form after devolution', async () => {
  open(result({ delta: -10, evolved: false, devolved: true, pokemonName: 'Charmander',
    originalPokemon: finalPokemon, pokemon: originalPokemon,
    evolutions: [{ from: 'charmeleon', to: 'charmander', direction: 'devolve' }] }))
  await flushPromises()
  await vi.advanceTimersByTimeAsync(1800)
  await flushPromises()
  expect(wrapper.get('.buddy-sprite').attributes('src')).toContain('charmander-front')
  expect(wrapper.text()).toContain('Charmander devolved!')
})
it('waits until saving finishes before starting the animation', async () => {
  open(result({ saving: true }))
  await flushPromises()
  expect(wrapper.find('.charging').exists()).toBe(false)
  await wrapper.setProps({ result: result() })
  await flushPromises()
  expect(wrapper.find('.charging').exists()).toBe(true)
  await vi.advanceTimersByTimeAsync(1800)
})
it('never replays a duplicate award', async () => {
  open(result({ duplicate: true }))
  await flushPromises()
  expect(wrapper.find('.charging').exists()).toBe(false)
  expect(wrapper.get('.buddy-sprite').attributes('src')).toContain('charmeleon-front')
  expect(wrapper.get('.action-button').attributes('disabled')).toBeUndefined()
})

it('preserves the public TrainerView addXP and subtractXP methods', async () => {
  wrapper = mount(PokeSprite, { props: { activePokemon: originalPokemon } })
  const addition = wrapper.vm.addXP(30)
  await flushPromises()
  await vi.advanceTimersByTimeAsync(1800)
  const added = await addition
  expect(added).toMatchObject({ accepted: true, result: { name: 'Charmeleon', xp: 20, level: 2 } })
  expect(wrapper.emitted('update-pokemon')[0][0].changes.name).toBe('Charmeleon')
  await wrapper.setProps({ activePokemon: added.result })
  const deduction = wrapper.vm.subtractXP(30)
  await flushPromises()
  await vi.advanceTimersByTimeAsync(1800)
  expect(await deduction).toMatchObject({ accepted: true, result: { name: 'Charmander', xp: 190, level: 1 } })
})

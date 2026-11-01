import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import PokemonBackwards from '../Pokemon_Backwards.vue'

const { preference } = vi.hoisted(() => ({ preference: { value: false } }))
vi.mock('motion-v', () => ({ useReducedMotion: () => preference }))
let wrapper
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals() })

it.each([false, true])('uses the appropriate back sprite when reduced motion is %s', async reduce => {
  preference.value = reduce
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ sprites: {
    back_default: '/still.png', versions: { 'generation-v': { 'black-white': { animated: { back_default: '/animated.gif' } } } },
  } }) })))
  wrapper = mount(PokemonBackwards, { props: { pokename: '25' } })
  await flushPromises()
  expect(wrapper.get('img').attributes('src')).toBe(reduce ? '/still.png' : '/animated.gif')
})

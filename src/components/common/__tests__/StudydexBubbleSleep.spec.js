import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import StudydexBubbleNav from '../StudydexBubbleNav.vue'
let wrapper

afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })
it('keeps the menu, To-Do and Pokédex available at night while locking Study and Quiz until 7am', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T15:59:59Z'))
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/home', component: { template: '<div />' } }] })
  await router.push('/home')
  wrapper = mount(StudydexBubbleNav, { global: { plugins: [router], stubs: { teleport: true } } })
  await wrapper.get('.bubble-toggle').trigger('click')
  expect(wrapper.get('.bubble-toggle').attributes('aria-expanded')).toBe('true')
  await vi.advanceTimersByTimeAsync(1000)
  expect(wrapper.get('.bubble-toggle').attributes('aria-expanded')).toBe('true')
  expect(wrapper.get('.bubble-toggle').attributes('disabled')).toBeUndefined()
  expect(wrapper.get('.tile-study').attributes('disabled')).toBeDefined()
  expect(wrapper.get('.tile-quiz').attributes('disabled')).toBeDefined()
  expect(wrapper.get('.tile-todos').attributes('disabled')).toBeUndefined()
  expect(wrapper.get('.tile-pokedex').attributes('disabled')).toBeUndefined()
  await wrapper.get('.bubble-toggle').trigger('click')
  expect(wrapper.get('.bubble-toggle').attributes('aria-expanded')).toBe('false')
  await wrapper.get('.bubble-toggle').trigger('click')
  expect(wrapper.get('.bubble-toggle').attributes('aria-expanded')).toBe('true')
  vi.setSystemTime(new Date('2026-11-05T23:00:00Z'))
  await vi.advanceTimersByTimeAsync(1000)
  await flushPromises()
  expect(wrapper.get('.bubble-toggle').attributes('disabled')).toBeUndefined()
  expect(wrapper.get('.tile-study').attributes('disabled')).toBeUndefined()
  expect(wrapper.get('.tile-quiz').attributes('disabled')).toBeUndefined()
})

it('can navigate to Pokédex while sleeping and refuses Study and Quiz clicks', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T18:00:00Z'))
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/home', component: { template: '<div />' } },
    { path: '/collection', component: { template: '<div />' } },
  ] })
  await router.push('/home')
  wrapper = mount(StudydexBubbleNav, { global: { plugins: [router], stubs: { teleport: true } } })
  await wrapper.get('.bubble-toggle').trigger('click')
  await wrapper.get('.tile-study').trigger('click')
  await wrapper.get('.tile-quiz').trigger('click')
  expect(router.currentRoute.value.path).toBe('/home')
  await wrapper.get('.tile-pokedex').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/collection')
})

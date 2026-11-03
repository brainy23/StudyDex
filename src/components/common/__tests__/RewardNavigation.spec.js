import { ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import BubbleNav from '../StudydexBubbleNav.vue'
let inventory
vi.mock('../../../composables/useRewardInventory', () => ({ useRewardInventory: () => inventory }))
let wrapper
beforeEach(() => { inventory = { count: ref(3), label: ref('3'), notice: ref('') } })
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = '' })
async function render(options = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes: ['/home', '/trainer', '/rewards'].map(path => ({ path, component: { template: '<div />' } })) })
  await router.push('/home'); await router.isReady()
  wrapper = mount(BubbleNav, { props: options, attachTo: document.body, global: { plugins: [router], stubs: { Teleport: true } } })
  await wrapper.get('.bubble-toggle').trigger('click'); await flushPromises()
  return router
}
it('shows the shared earned/unopened count and routes the bag to rewards', async () => {
  const router = await render()
  const bag = wrapper.findAll('.bubble-item').find(b => b.attributes('aria-label').startsWith('Bag'))
  expect(bag.text()).toContain('3')
  await bag.trigger('click'); await flushPromises()
  expect(router.currentRoute.value.path).toBe('/rewards')
})
it('retains the trainer destination when there are no unopened packs', async () => {
  inventory.count.value = 0; inventory.label.value = '0'
  const router = await render()
  expect(wrapper.find('.reward-badge').exists()).toBe(false)
  await wrapper.findAll('.bubble-item').find(b => b.attributes('aria-label').startsWith('Bag')).trigger('click')
  await flushPromises(); expect(router.currentRoute.value.path).toBe('/trainer')
})
it('allows rewards access from the trainer room even when the buddy is asleep', async () => {
  const router = await render({ current: 'bag', sleeping: true })
  const bag = wrapper.findAll('.bubble-item').find(b => b.attributes('aria-label').startsWith('Bag'))
  expect(bag.attributes('disabled')).toBeUndefined()
  await bag.trigger('click'); await flushPromises()
  expect(router.currentRoute.value.path).toBe('/rewards')
})

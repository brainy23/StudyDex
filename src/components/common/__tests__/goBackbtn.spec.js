import { expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import GoBackBtn from '../goBackbtn.vue'

it('returns to the most recent page and restores its selected subject and flow', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/:page', component: { template: '<div />' } },
  ] })
  await router.push('/home')
  await router.push('/subjects?flow=quiz&subject=science')
  await router.push('/topics?flow=quiz&subject=science')
  const wrapper = mount(GoBackBtn, { global: { plugins: [router] } })
  try {
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/subjects?flow=quiz&subject=science')
  } finally { wrapper.unmount() }
})

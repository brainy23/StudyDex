import { expect, it, vi } from 'vitest'
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

it('uses an explicit destination with the requested quiz flow instead of the previous page', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/subjects', name: 'selection-subjects', component: { template: '<div />' } },
    { path: '/:page', component: { template: '<div />' } },
  ] })
  await router.push('/dashboard')
  await router.push('/topics?flow=quiz&subject=science')
  const wrapper = mount(GoBackBtn, { props: { to: { name: 'selection-subjects', query: { flow: 'quiz' } } }, global: { plugins: [router] } })
  try {
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/subjects?flow=quiz')
  } finally { wrapper.unmount() }
})

it.each(['/surprise-boss?encounter=1', '/quiz?battle=boss', '/study-decks?mode=boss_battle'])(
  'skips the previous battle %s without visiting it again', async bossPage => {
    const history = createMemoryHistory()
    const router = createRouter({ history, routes: [
      { path: '/surprise-boss', name: 'surprise-boss', component: { template: '<div />' } },
      { path: '/:page', component: { template: '<div />' } },
    ] })
    await router.push('/subjects?flow=study&subject=science')
    await router.push(bossPage)
    await router.push('/study-decks?subject=science&topic=plants')
    // Memory history does not populate the browser history back pointer.
    const state = vi.spyOn(history, 'state', 'get').mockReturnValue({ back: bossPage, position: 2 })
    const visited = []
    const remove = router.afterEach(to => visited.push(to.fullPath))
    const wrapper = mount(GoBackBtn, { global: { plugins: [router] } })
    try {
      await wrapper.get('button').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.fullPath).toBe('/subjects?flow=study&subject=science')
      expect(visited).toEqual(['/subjects?flow=study&subject=science'])
    } finally { wrapper.unmount(); remove(); state.mockRestore() }
  },
)

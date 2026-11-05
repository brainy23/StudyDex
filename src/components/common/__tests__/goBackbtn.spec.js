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

it('returns Topics → Subjects → Home without adding a Subjects/Topics loop', async () => {
  const history = createMemoryHistory()
  const router = createRouter({ history, routes: [
    { path: '/home', name: 'home', component: { template: '<div />' } },
    { path: '/subjects', name: 'selection-subjects', component: { template: '<div />' } },
    { path: '/topics', component: { template: '<div />' } },
  ] })
  await router.push('/home')
  await router.push('/subjects?flow=quiz')
  await router.push('/topics?flow=quiz&subject=science')
  const state = vi.spyOn(history, 'state', 'get').mockReturnValue({ back: '/subjects?flow=quiz', position: 2 })
  const wrapper = mount(GoBackBtn, { props: { to: { name: 'selection-subjects', query: { flow: 'quiz' } } }, global: { plugins: [router] } })
  try {
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/subjects?flow=quiz')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
    state.mockReturnValue({ back: '/home', position: 1 })
    await wrapper.setProps({ to: null })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/home')
  } finally { wrapper.unmount(); state.mockRestore() }
})
it('replaces a direct Topics visit with Subjects so the next back goes to the original page', async () => {
  const history = createMemoryHistory()
  const router = createRouter({ history, routes: [
    { path: '/subjects', name: 'selection-subjects', component: { template: '<div />' } },
    { path: '/:page', component: { template: '<div />' } },
  ] })
  await router.push('/dashboard')
  await router.push('/topics?flow=study&subject=maths')
  const state = vi.spyOn(history, 'state', 'get').mockReturnValue({ back: '/dashboard', position: 1 })
  const wrapper = mount(GoBackBtn, { props: { to: { name: 'selection-subjects', query: { flow: 'study' } } }, global: { plugins: [router] } })
  try {
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/subjects?flow=study')
    await wrapper.setProps({ to: null })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/dashboard')
  } finally { wrapper.unmount(); state.mockRestore() }
})

it('updates default parent query parameters without leaving a duplicate Subjects entry', async () => {
  const history = createMemoryHistory()
  const router = createRouter({ history, routes: [
    { path: '/subjects', name: 'selection-subjects', component: { template: '<div />' } },
    { path: '/:page', component: { template: '<div />' } },
  ] })
  await router.push('/home')
  await router.push('/subjects')
  await router.push('/topics?flow=study&subject=science')
  const state = vi.spyOn(history, 'state', 'get').mockReturnValue({ back: '/subjects', position: 2 })
  const wrapper = mount(GoBackBtn, { props: { to: { name: 'selection-subjects', query: { flow: 'study' } } }, global: { plugins: [router] } })
  try {
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/subjects?flow=study')
    await wrapper.setProps({ to: null })
    state.mockReturnValue({ back: '/home', position: 1 })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/home')
  } finally { wrapper.unmount(); state.mockRestore() }
})

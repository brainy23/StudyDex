import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, onMounted } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '../../App.vue'
import { useFloatingStudyTimer } from '../../composables/useFloatingStudyTimer'
import { studyAction } from '../../services/learningService'
import { sleepRouteGuard } from '../../utils/buddySleep'

vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ auth: {
  onAuthStateChange: callback => {
    callback('INITIAL_SESSION', { user: { id: 'student' } })
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  },
} }) }))
vi.mock('../../services/learningService', () => ({ studyAction: vi.fn() }))
vi.mock('../../services/experienceService', async original => ({ ...await original(), getRewardedTimerCount: vi.fn(async () => 0) }))
vi.mock('../../composables/useWeatherLocation', () => ({ provideWeatherLocation: () => ({ resetLocationState: vi.fn() }) }))
vi.mock('../../composables/usePokemonTransition', () => ({ usePokemonTransition: () => ({ cancel: vi.fn() }) }))
let wrapper

afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })
it('removes an already-open learning page at midnight instead of waiting for another click', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T15:59:59Z'))
  sessionStorage.clear()
  let timer
  let record
  studyAction.mockImplementation(async request => {
    record ||= { session: { id: request.sessionId, status: 'in_progress' }, block: null }
    if (request.action === 'start') record.block = { id: request.blockId, active_ms: 0, running_since: new Date().toISOString(), focus_completed_at: null }
    if (request.action === 'pause' && record.block) record.block.running_since = null
    return structuredClone(record)
  })
  const LearningPage = defineComponent({ setup() {
    timer = useFloatingStudyTimer()
    onMounted(() => timer.attach({ id: 'student' }, { id: 'topic', name: 'Fractions' }))
    return {}
  }, template: '<p>Lesson content</p>' })
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/learn', name: 'learn', component: LearningPage },
    { path: '/home', name: 'home', component: { template: '<p>Town</p>' } },
  ] })
  router.beforeEach(sleepRouteGuard)
  await router.push('/learn')
  wrapper = mount(App, { global: { plugins: [router], stubs: { PokemonTransition: true, FloatingStudyTimer: true } } })
  await flushPromises()
  expect(wrapper.text()).toContain('Lesson content')
  await timer.start()
  expect(timer.timer.running.value).toBe(true)
  await vi.advanceTimersByTimeAsync(1000)
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('home')
  expect(wrapper.text()).not.toContain('Lesson content')
  expect(wrapper.text()).toContain('Town')
  expect(timer.timer.running.value).toBe(false)
  expect(studyAction.mock.calls.some(([request]) => request.action === 'pause')).toBe(true)
})

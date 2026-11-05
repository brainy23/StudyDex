import { defineComponent, onMounted } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { provideFloatingStudyTimer, useFloatingStudyTimer } from '../useFloatingStudyTimer'
import { useFocusTimer } from '../useFocusTimer'
import FloatingStudyTimer from '../../components/common/FloatingStudyTimer.vue'
import { studyAction } from '../../services/learningService'

vi.mock('../../services/learningService', () => ({ studyAction: vi.fn() }))
vi.mock('../../services/experienceService', async original => ({ ...await original(), getRewardedTimerCount: vi.fn(async () => 0) }))
vi.mock('../../services/profileService', () => ({ getCurrentProfile: vi.fn() }))
const student = { id: 'student' }
const topic = { id: 'fractions', name: 'Fractions' }
let wrapper, controller, router, rows
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-06T04:00:00Z'))
  useFocusTimer().bind(null)
  localStorage.clear()
  sessionStorage.clear()
  rows = new Map()
  studyAction.mockReset().mockImplementation(async request => {
    let row = rows.get(request.sessionId)
    if (!row) {
      row = { session: { id: request.sessionId, status: 'in_progress' }, block: null, xp: null }
      rows.set(request.sessionId, row)
    }
    const b = row.block
    if (b?.running_since) {
      b.active_ms = Math.min(1500000, b.active_ms + Math.min(30000, Date.now() - Date.parse(b.running_since)))
      b.running_since = new Date().toISOString()
    }
    row.xp = null
    if (request.action === 'start') row.block = { id: request.blockId, block_number: (b?.block_number || 0) + 1,
      active_ms: 0, running_since: new Date().toISOString(), focus_completed_at: null }
    if (request.action === 'resume' && b) b.running_since = new Date().toISOString()
    if (request.action === 'pause' && b) b.running_since = null
    if (request.action === 'reset' && b && !b.focus_completed_at) { b.active_ms = 0; b.running_since = null }
    if (request.action === 'complete_block' && b && b.active_ms >= 1500000) {
      b.focus_completed_at ||= new Date().toISOString()
      b.running_since = null
      row.xp = { eventId: b.id, rewardType: 'timer', delta: 10, xp: 10, level: 1, pokemonName: 'Charmander' }
    }
    return structuredClone(row)
  })
})
afterEach(() => {
  wrapper?.unmount()
  useFocusTimer().bind(null)
  vi.useRealTimers()
  vi.restoreAllMocks()
})
async function open() {
  const LearningPage = defineComponent({ setup() {
    const shared = useFloatingStudyTimer()
    onMounted(() => shared.attach(student, topic))
    return {}
  }, template: '<p>Learning page</p>' })
  router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/study', component: LearningPage },
    { path: '/learn', component: LearningPage },
    { path: '/dashboard', component: { template: '<p>Dashboard</p>' } },
  ] })
  await router.push('/study')
  wrapper = mount(defineComponent({ components: { FloatingStudyTimer }, setup() {
    controller = provideFloatingStudyTimer()
    return { controller }
  }, template: '<RouterView /><FloatingStudyTimer v-if="controller.visible.value" :controller="controller" />' }), {
    global: { plugins: [router], stubs: { teleport: true, XpPrompt: true } },
  })
  await flushPromises()
}
it('keeps one timer and its backend heartbeat alive across Study, Learn and other pages', async () => {
  await open()
  await controller.start()
  await vi.advanceTimersByTimeAsync(5000)
  expect(controller.timer.seconds.value).toBe(1495)
  const sessionId = controller.session.state.value.session.id
  await router.push('/learn')
  await vi.advanceTimersByTimeAsync(20000)
  expect(controller.timer.seconds.value).toBe(1475)
  expect(controller.session.state.value.session.id).toBe(sessionId)
  expect(studyAction.mock.calls.filter(([r]) => r.action === 'start')).toHaveLength(1)
  expect(studyAction.mock.calls.some(([r]) => r.action === 'heartbeat' && r.sessionId === sessionId)).toBe(true)
  await router.push('/dashboard')
  await vi.advanceTimersByTimeAsync(10000)
  expect(wrapper.get('.floating-time').text()).toBe('24:25')
  expect(controller.session.state.value.block.active_ms).toBeGreaterThanOrEqual(30000)
})
it('finishes and presents the saved XP while Learn is open, without awarding again on return', async () => {
  await open()
  await controller.start()
  await router.push('/learn')
  await vi.advanceTimersByTimeAsync(1500000)
  await flushPromises()
  expect(controller.session.state.value.block.focus_completed_at).toBeTruthy()
  expect(controller.timer.pendingRewards.value).toEqual([])
  expect(controller.savedReward.prompt.value).toMatchObject({ rewardType: 'timer', delta: 10 })
  await router.push('/study')
  await flushPromises()
  expect(studyAction.mock.calls.filter(([r]) => r.action === 'complete_block')).toHaveLength(1)
})
it('pauses local time and the server block together when the tab becomes hidden', async () => {
  await open()
  await controller.start()
  await vi.advanceTimersByTimeAsync(10000)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  document.dispatchEvent(new Event('visibilitychange'))
  await flushPromises()
  const remaining = controller.timer.seconds.value
  await vi.advanceTimersByTimeAsync(60000)
  expect(controller.timer.seconds.value).toBe(remaining)
  expect(controller.timer.running.value).toBe(false)
  expect(controller.session.state.value.block.running_since).toBeNull()
})
it('moves within the viewport, saves its position and can be minimized', async () => {
  await open()
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 500, top: 300, width: 280, height: 180 })
  const handle = wrapper.get('.timer-drag-handle')
  function pointer(type, options = {}) {
    const event = new MouseEvent(type, { bubbles: true, ...options })
    Object.defineProperty(event, 'pointerId', { value: 1 })
    handle.element.dispatchEvent(event)
  }
  pointer('pointerdown', { button: 0, clientX: 510, clientY: 310 })
  pointer('pointermove', { clientX: 10000, clientY: -100 })
  pointer('pointerup')
  await flushPromises()
  expect(wrapper.get('.floating-study-timer').attributes('style')).toContain('left: 736px')
  expect(wrapper.get('.floating-study-timer').attributes('style')).toContain('top: 8px')
  expect(JSON.parse(localStorage.getItem('studydex:timer-position:student'))).toEqual({ x: 736, y: 8 })
  await wrapper.get('[aria-label="Minimize study timer"]').trigger('click')
  expect(wrapper.get('.floating-timer-body').isVisible()).toBe(false)
  expect(wrapper.get('.mini-time').text()).toBe('25:00')
  rect.mockRestore()
})
it('does not consume a pending reward until the server confirms a completed block', async () => {
  await open()
  await controller.start()
  const original = studyAction.getMockImplementation()
  studyAction.mockImplementation(async request => {
    if (request.action === 'complete_block') return { session: { id: request.sessionId, status: 'in_progress' },
      block: { id: 'block', active_ms: 1400000, focus_completed_at: null, running_since: null } }
    return original(request)
  })
  await vi.advanceTimersByTimeAsync(1500000)
  expect(controller.timer.pendingRewards.value).toHaveLength(1)
  expect(controller.savedReward.prompt.value).toBeNull()
  expect(controller.timer.seconds.value).toBe(100)
})

it('clears the old account’s countdown, pending rewards and reward popup on account change', async () => {
  await open()
  await controller.start()
  await vi.advanceTimersByTimeAsync(10000)
  await controller.savedReward.showSaved({ eventId: 'old-reward', delta: 10 })
  controller.clear()
  await flushPromises()
  expect(controller.timer.running.value).toBe(false)
  expect(controller.timer.seconds.value).toBe(1500)
  expect(controller.timer.pendingRewards.value).toEqual([])
  expect(controller.savedReward.prompt.value).toBeNull()
  expect(wrapper.find('.floating-study-timer').exists()).toBe(false)
})

it('refuses to start a focus block while the Pokémon is sleeping', async () => {
  await open()
  vi.setSystemTime(new Date('2026-11-05T16:00:00Z'))
  await controller.start()
  expect(controller.timer.running.value).toBe(false)
  expect(studyAction.mock.calls.some(([request]) => request.action === 'start')).toBe(false)
})

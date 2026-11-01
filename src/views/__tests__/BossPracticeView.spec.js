import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import BossPracticeView from '../SurpriseBossView.vue'
import { getCurrentProfile } from '../../services/profileService'
import { readEncounter, writeEncounter } from '../../composables/bossEncounter'
import { useTimer } from '../../components/timer/useTimer'

vi.mock('../../services/profileService', () => ({ getCurrentProfile: vi.fn() }))
let wrapper
beforeEach(() => {
  sessionStorage.clear()
  getCurrentProfile.mockResolvedValue({ id: 'student' })
})
afterEach(() => { wrapper?.unmount(); useTimer().endSession(); sessionStorage.clear() })

async function open(encounter) {
  if (encounter) writeEncounter(encounter)
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/surprise-boss', name: 'surprise-boss', component: BossPracticeView },
    { path: '/study-decks', name: 'study-decks', component: { template: '<h1>Lab</h1>' } },
  ] })
  await router.push({ name: 'surprise-boss', query: { encounter: 'practice' } })
  wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router], stubs: { ClockWeather: true, TownBackground: true, Pokemon_Backwards: true } } })
  await flushPromises()
  return router
}
function encounter() {
  return { id: 'practice', createdAt: Date.now(), owner: 'student', status: 'pending',
    topicName: 'Existing deck', questions: [['Public prompt', ['Public A', 'Public B'], 0, 'Public A']],
    snapshot: { cardIds: ['a', 'b'], queue: ['b'], remembered: ['a'], reviews: 1, flipped: false },
    returnQuery: { subject: 'science', topic_id: 'topic', mode: 'flashcards' } }
}

it('rejects a stale link or another account’s practice session', async () => {
  await open({ ...encounter(), owner: 'another-student' })
  expect(wrapper.text()).toContain('No active practice session')
  expect(wrapper.find('.demo-answers').exists()).toBe(false)
})

it('returns after an incorrect answer without resetting the saved deck or shared timer', async () => {
  const saved = encounter()
  const timer = useTimer()
  timer.bindUser('student')
  timer.startSession('topic')
  timer.pause()
  const remaining = timer.state.remainingMs
  const router = await open(saved)
  await wrapper.findAll('.demo-answers button')[1].trigger('click')
  await wrapper.get('.battle-next').trigger('click')
  await wrapper.get('.battle-end-actions button').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ ...saved.returnQuery, bossReturn: 'practice' })
  expect(readEncounter()).toMatchObject({ status: 'complete', outcome: 'lost', snapshot: saved.snapshot })
  expect(timer.state.remainingMs).toBe(remaining)
  expect(timer.state.status).toBe('paused')
})

it('allows leaving optional practice before answering and keeps the return point', async () => {
  const saved = encounter()
  const router = await open(saved)
  await wrapper.get('.arena-hud button').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('study-decks')
  expect(readEncounter()).toMatchObject({ outcome: 'left', snapshot: saved.snapshot })
})

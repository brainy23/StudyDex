import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import TopicsView from '../TopicsView.vue'
import { getCurrentProfile } from '../../services/profileService'
import { getStudentStudyCatalogue } from '../../services/studyService'
import { getStudentQuizCatalogue } from '../../services/quizPreviewService'
import { getTopicCompletions } from '../../services/learningService'
import { enterRoom } from '../../composables/useRoomTransition'

vi.mock('../../services/profileService', () => ({ getCurrentProfile: vi.fn() }))
vi.mock('../../services/studyService', async original => ({ ...await original(), getStudentStudyCatalogue: vi.fn() }))
vi.mock('../../services/quizPreviewService', () => ({ getStudentQuizCatalogue: vi.fn() }))
vi.mock('../../services/learningService', () => ({ getTopicCompletions: vi.fn() }))
vi.mock('../../composables/useRoomTransition', () => ({ enterRoom: vi.fn() }))
const catalogue = {
  subjects: [{ id: 'maths', name: 'Mathematics' }],
  topics: ['Numbers', 'Fractions', 'Shapes'].map((name, index) => ({
    id: `topic-${index + 1}`, name, subject_id: 'maths', level_id: 'p3', quiz_question_count: index === 2 ? 0 : 5,
  })),
}
let wrapper
beforeEach(() => {
  vi.resetAllMocks()
  getCurrentProfile.mockResolvedValue({ id: 'student', school_level_id: 'p3', school_level: { name: 'Primary 3' } })
  getStudentStudyCatalogue.mockResolvedValue(catalogue)
  getStudentQuizCatalogue.mockResolvedValue(catalogue)
  getTopicCompletions.mockImplementation(async (_user, flow) => flow === 'quiz'
    ? [{ topic_id: 'topic-1' }, { topic_id: 'topic-2' }]
    : [{ topic_id: 'topic-1' }, { topic_id: 'topic-3' }])
})
afterEach(() => wrapper?.unmount())
async function open(flow = 'quiz') {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/topics', name: 'selection-topics', component: TopicsView },
    ...['home', 'account', 'selection-subjects', 'study-mode'].map(name => ({ path: `/${name}`, name, component: { template: '<div />' } })),
  ] })
  await router.push(`/topics?flow=${flow}&subject=maths`)
  wrapper = mount(TopicsView, { global: { plugins: [router], stubs: { LoadingScreen: true } } })
  await flushPromises()
  return router
}
it('unlocks studied topics, grays out locked topics, and preserves separate quiz Done badges', async () => {
  const router = await open()
  const cards = wrapper.findAll('.sd-topic-card')
  expect(cards[0].attributes('disabled')).toBeUndefined()
  expect(cards[0].text()).toContain('Start quiz')
  expect(cards[0].find('.sd-done-badge').exists()).toBe(true)
  expect(cards[1].attributes('disabled')).toBeDefined()
  expect(cards[1].classes()).toContain('sd-quiz-locked')
  expect(cards[1].text()).toContain('Complete this topic in Study to unlock')
  expect(cards[1].find('.sd-done-badge').exists()).toBe(true)
  expect(cards[2].attributes('disabled')).toBeDefined()
  expect(cards[2].text()).toContain('Quiz coming soon')
  await cards[1].trigger('click')
  expect(enterRoom).not.toHaveBeenCalled()
  await cards[0].trigger('click')
  expect(enterRoom).toHaveBeenCalledExactlyOnceWith(router, 'quiz-battle', { subject: 'maths', topic: 'topic-1' })
  expect(getTopicCompletions).toHaveBeenCalledWith('student', 'study')
  expect(getTopicCompletions).toHaveBeenCalledWith('student', 'quiz')
})
it('keeps quizzes locked on progress failure and unlocks saved completions after retry', async () => {
  getTopicCompletions.mockImplementation(async (_user, flow) => {
    if (flow === 'study') throw Error('Offline')
    return []
  })
  await open()
  expect(wrapper.findAll('.sd-topic-card').every(card => card.attributes('disabled') !== undefined)).toBe(true)
  expect(wrapper.text()).toContain('Your study progress could not load')
  getTopicCompletions.mockResolvedValue([{ topic_id: 'topic-2' }])
  await wrapper.findAll('button').find(button => button.text() === 'Retry study progress').trigger('click')
  await flushPromises()
  expect(wrapper.findAll('.sd-topic-card')[1].attributes('disabled')).toBeUndefined()
})
it('keeps Study topics available and retains Study Done badges', async () => {
  await open('study')
  expect(wrapper.findAll('.sd-topic-card').every(card => card.attributes('disabled') === undefined)).toBe(true)
  expect(wrapper.findAll('.sd-done-badge')).toHaveLength(2)
  expect(wrapper.text()).not.toContain('Start quiz')
})

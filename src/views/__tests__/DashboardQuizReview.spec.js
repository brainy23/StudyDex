import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import DashboardView from '../dashboardView.vue'
import { getDashboardData } from '../../services/dashboardService'
import { getQuizReview } from '../../services/quizReviewService'

vi.mock('../../services/dashboardService', () => ({ getDashboardData: vi.fn() }))
vi.mock('../../services/quizReviewService', () => ({ getQuizReview: vi.fn() }))
vi.mock('vue3-apexcharts', () => ({ default: { template: '<div />' } }))
const { authCallback } = vi.hoisted(() => ({ authCallback: { current: null } }))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ auth: {
  onAuthStateChange: callback => { authCallback.current = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } },
} }) }))
const ready = data => ({ status: data.length ? 'ready' : 'empty', data })
const data = () => ({
  profile: { id: 'student', school_level_id: 'level-3' },
  catalogue: { status: 'ready', data: { subjects: [{ id: 'maths', name: 'Mathematics' }],
    topics: [{ id: 'topic-1', name: 'Fractions', subject_id: 'maths', level_id: 'level-3' }] } },
  buddy: { status: 'empty', data: null }, studySessions: ready([]), pomodoroBlocks: ready([]),
  quizAttempts: ready([
    { id: 'quiz-1', topic_id: 'topic-1', attempt_type: 'quiz', score: 1, total_questions: 2, xp_change: 25, completed_at: '2026-11-06T01:00:00Z' },
    { id: 'boss-1', topic_id: 'topic-1', attempt_type: 'boss_battle', score: 2, total_questions: 5, xp_change: -50, completed_at: '2026-11-06T02:00:00Z' },
  ]),
})
const review = { quizName: 'Fractions', correct: 1, total: 2, scorePercent: 50,
  questions: [1, 2].map(i => ({ id: `q${i}`, question_text: `Fraction question ${i}`,
    options: [{ id: `a${i}`, option_text: 'One half' }, { id: `b${i}`, option_text: 'One quarter' }] })),
  review: [1, 2].map(i => ({ question_id: `q${i}`, selected_option_id: i === 1 ? 'a1' : 'b2',
    correct_option_id: `a${i}`, explanation: `Explanation ${i}` })),
}
let wrapper
beforeEach(() => {
  vi.resetAllMocks()
  getDashboardData.mockResolvedValue(data())
  getQuizReview.mockResolvedValue(review)
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })
async function open() {
  wrapper = mount(DashboardView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' }, GoBackBtn: true, PokeSprite: true, teleport: true } } })
  await flushPromises()
}
it('opens the completed quiz from history and topic attempts, but does not offer boss reviews', async () => {
  await open()
  expect(wrapper.findAll('.progress-table .review-link')).toHaveLength(1)
  await wrapper.get('.progress-table .review-link').trigger('click')
  await flushPromises()
  expect(getQuizReview).toHaveBeenCalledExactlyOnceWith('quiz-1', 'student')
  expect(wrapper.get('.review-header').text()).toContain('Fractions')
  expect(wrapper.findAll('.review-question')).toHaveLength(2)
  expect(wrapper.findAll('.review-verdict').map(item => item.text())).toEqual(['Correct', 'Wrong'])
  await wrapper.get('[aria-label="Close quiz review"]').trigger('click')
  await wrapper.get('.topic-toggle').trigger('click')
  await wrapper.get('.attempt-row .review-link').trigger('click')
  await flushPromises()
  expect(getQuizReview).toHaveBeenCalledTimes(2)
  expect(wrapper.get('.quiz-review-modal').text()).toContain('Your answer: One quarter')
})
it('shows loading and retry errors, and ignores responses after the review is dismissed', async () => {
  getQuizReview.mockRejectedValueOnce(Error('Connection lost'))
  await open()
  await wrapper.get('.progress-table .review-link').trigger('click')
  await flushPromises()
  expect(wrapper.get('.quiz-review-modal [role="alert"]').text()).toContain('Connection lost')
  let resolve
  getQuizReview.mockReturnValueOnce(new Promise(done => { resolve = done }))
  await wrapper.get('.review-retry').trigger('click')
  expect(wrapper.get('.quiz-review-modal [role="status"]').text()).toContain('Loading')
  await wrapper.get('[aria-label="Close quiz review"]').trigger('click')
  resolve(review)
  await flushPromises()
  expect(wrapper.find('.quiz-review-modal').exists()).toBe(false)
})
it('closes and discards a pending review when the authenticated account changes', async () => {
  let resolve
  getQuizReview.mockReturnValueOnce(new Promise(done => { resolve = done }))
  await open()
  await wrapper.get('.progress-table .review-link').trigger('click')
  authCallback.current('SIGNED_OUT')
  resolve(review)
  await flushPromises()
  expect(wrapper.find('.quiz-review-modal').exists()).toBe(false)
})

const studySessionCard = () => wrapper.findAll('.stat-card').find(card => card.get('.stat-label').text() === 'Study sessions')
it('counts every completed focus block today in Singapore time, including blocks without XP', async () => {
  vi.setSystemTime(new Date('2026-11-06T04:00:00Z'))
  const dashboard = data()
  dashboard.studySessions = ready([
    { id: 'active-session', mode: 'flashcards', status: 'in_progress', xp_change: 0 },
    { id: 'lesson', mode: 'learn', status: 'completed', completed_at: '2026-11-06T00:00:00Z', xp_change: 0 },
  ])
  dashboard.pomodoroBlocks = ready([
    // Midnight SGT falls on the previous UTC date; this still counts today.
    ...Array.from({ length: 5 }, (_, i) => ({ id: `block-${i}`, session_id: 'active-session',
      focus_completed_at: `2026-11-05T${16 + i}:00:00Z`, focus_seconds: 1500,
      xp_earned: i < 4 ? 10 : 0, xp_awarded_at: i < 4 ? `2026-11-05T${16 + i}:00:00Z` : null })),
    { id: 'yesterday', session_id: 'active-session', focus_completed_at: '2026-11-05T15:59:59Z', focus_seconds: 1500, xp_earned: 10 },
    { id: 'incomplete', session_id: 'active-session', focus_completed_at: null, focus_seconds: 1000, break_completed_at: '2026-11-06T02:00:00Z', xp_earned: 0 },
  ])
  getDashboardData.mockResolvedValue(dashboard)
  await open()
  expect(studySessionCard().get('.stat-value').text()).toBe('5')
  expect(studySessionCard().text()).toContain('Focus blocks completed today')
})
it('shows unavailable instead of a misleading zero when completed blocks cannot load', async () => {
  const dashboard = data()
  dashboard.pomodoroBlocks = { status: 'error', data: null, message: 'Unable to load blocks' }
  getDashboardData.mockResolvedValue(dashboard)
  await open()
  expect(studySessionCard().get('.stat-value').text()).toBe('—')
})
it('resets the displayed daily block count after midnight in Singapore', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-06T15:59:45Z'))
  const dashboard = data()
  dashboard.studySessions = ready([{ id: 'session', status: 'in_progress', xp_change: 0 }])
  dashboard.pomodoroBlocks = ready([{ id: 'block', session_id: 'session',
    focus_completed_at: '2026-11-06T15:59:40Z', focus_seconds: 1500, xp_earned: 10 }])
  getDashboardData.mockResolvedValue(dashboard)
  await open()
  expect(studySessionCard().get('.stat-value').text()).toBe('1')
  await vi.advanceTimersByTimeAsync(60000)
  expect(studySessionCard().get('.stat-value').text()).toBe('0')
})

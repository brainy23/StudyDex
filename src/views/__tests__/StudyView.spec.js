import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import StudyView from '../studyView.vue'
import { getCurrentProfile } from '../../services/profileService'
import {
  getStudyCatalogue,
  getTopicLesson,
  getTopicFlashcards,
  getStudyQuestions,
  getSelectedStudyBuddy,
} from '../../services/studyService'
import { useTimer } from '../../components/timer/useTimer'
import {
  studentProfile,
  studyCatalogue,
  studyLesson,
  bossQuestions,
} from '../../test/studyFixtures'

vi.mock('../../services/profileService', () => ({ getCurrentProfile: vi.fn() }))
vi.mock('../../services/studyService', async () => ({
  ...(await vi.importActual('../../services/studyService')),
  getStudyCatalogue: vi.fn(),
  getTopicLesson: vi.fn(),
  getTopicFlashcards: vi.fn(),
  getStudyQuestions: vi.fn(),
  getSelectedStudyBuddy: vi.fn(),
}))
let wrapper
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  useTimer().endSession()
  getCurrentProfile.mockResolvedValue(structuredClone(studentProfile))
  getStudyCatalogue.mockResolvedValue(structuredClone(studyCatalogue))
  getTopicLesson.mockResolvedValue(structuredClone(studyLesson))
  getTopicFlashcards.mockResolvedValue([])
  getStudyQuestions.mockImplementation(async (id, purpose) =>
    purpose === 'boss_battle' ? structuredClone(bossQuestions) : [],
  )
  getSelectedStudyBuddy.mockResolvedValue(null)
})
afterEach(() => {
  useTimer().endSession()
  wrapper?.unmount()
})

async function open(query = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/study-decks', name: 'study-decks', component: StudyView },
      { path: '/home', component: { template: '<div>Town</div>' } },
      { path: '/account', component: { template: '<div>Account</div>' } },
    ],
  })
  await router.push({ name: 'study-decks', query })
  await router.isReady()
  wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  await flushPromises()
  return router
}
const button = (text) => wrapper.findAll('button').find((item) => item.text() === text)

it('uses the registered level automatically, shows ordered goals, and never asks for a level', async () => {
  await open()
  expect(getStudyCatalogue).toHaveBeenCalledWith('level-3')
  expect(wrapper.text()).toContain('Primary 3')
  expect(wrapper.get('.study-overview h2').text()).toBe('Test topic')
  expect(wrapper.findAll('.study-goals li').map((item) => item.text())).toEqual(
    studyLesson.goals.map((goal) => goal.goal_text),
  )
  expect(wrapper.findAll('select')).toHaveLength(1)
  expect(
    wrapper
      .get('#study-subject')
      .findAll('option')
      .map((option) => option.text()),
  ).toEqual(['Mathematics', 'Science'])
  expect(useTimer().state.status).toBe('idle')
})

it('shows Account Settings when the school level is missing without defaulting or fetching content', async () => {
  getCurrentProfile.mockResolvedValue({
    ...studentProfile,
    school_level_id: null,
    school_level: null,
  })
  await open()
  expect(wrapper.text()).toContain('Set your school level first')
  expect(wrapper.get('a[href="/account"]').text()).toBe('Open Account Settings')
  expect(getStudyCatalogue).not.toHaveBeenCalled()
  expect(getTopicLesson).not.toHaveBeenCalled()
})

it('uses a different registered level and handles a level with no published topics', async () => {
  getCurrentProfile.mockResolvedValue({
    ...studentProfile,
    school_level_id: 'level-4',
    school_level: { name: 'Primary 4' },
  })
  getStudyCatalogue.mockResolvedValue({ ...studyCatalogue, topics: [] })
  await open()
  expect(getStudyCatalogue).toHaveBeenCalledWith('level-4')
  expect(wrapper.text()).toContain('There are no available Mathematics topics for Primary 4 yet')
  expect(getTopicLesson).not.toHaveBeenCalled()
})

it('progresses through all seven concepts, presents their checks, and offers revision and the Boss Battle', async () => {
  const router = await open()
  await button('Start learning').trigger('click')
  for (let index = 0; index < 7; index++) {
    expect(wrapper.get('.study-concept h2').text()).toBe(`Concept ${index + 1}`)
    expect(wrapper.get('.study-example .study-copy').text()).toBe(`Worked example ${index + 1}`)
    expect(wrapper.get('.study-question legend').text()).toBe(`Check concept ${index + 1}`)
    expect(
      button(index === 6 ? 'Finish topic' : 'Next concept').attributes('disabled'),
    ).toBeDefined()
    await wrapper.find('input[type="radio"]').setValue()
    await button(index === 6 ? 'Finish topic' : 'Next concept').trigger('click')
  }
  expect(wrapper.get('.study-completion').text()).toContain('7 of 7 concepts read')
  expect(wrapper.get('.study-header-progress label').text()).toContain('7 / 7')
  await button('Boss Battle').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query).toMatchObject({ mode: 'quiz', battle: 'boss' })
  expect(wrapper.get('.study-quiz h2').text()).toBe('Boss Battle')
  expect(wrapper.text()).toContain('Scoring and battle rewards are not available yet')
})

it('shows honest flashcard/quiz empty states and retains learning progress between modes', async () => {
  await open()
  await button('Start learning').trigger('click')
  await wrapper.find('input[type="radio"]').setValue()
  await button('Next concept').trigger('click')
  await button('Flashcards').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('There are no flashcards for this topic yet')
  await button('Quiz').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('There are no regular quiz questions')
  await button('Learn').trigger('click')
  await flushPromises()
  expect(wrapper.get('.study-concept h2').text()).toBe('Concept 2')
})

it('switches subjects without substituting sample content and rejects unavailable topic URLs', async () => {
  const router = await open()
  await wrapper.get('#study-subject').setValue('science')
  await flushPromises()
  expect(wrapper.text()).toContain('There are no available Science topics for Primary 3 yet')
  await router.push({ name: 'study-decks', query: { topic: 'other-level-topic' } })
  await flushPromises()
  expect(wrapper.text()).toContain('This topic is unavailable')
  expect(getTopicLesson).not.toHaveBeenCalledWith('other-level-topic')
})

it('reports RLS failures and lets the student retry', async () => {
  getStudyCatalogue.mockRejectedValueOnce({
    code: '42501',
    message: 'permission denied for table topics',
  })
  await open()
  expect(wrapper.get('[role="alert"]').text()).toContain('does not have permission')
  await button('Try again').trigger('click')
  await flushPromises()
  expect(wrapper.find('.study-overview').exists()).toBe(true)
})

it('keeps reading available if quick checks are denied', async () => {
  getTopicLesson.mockResolvedValueOnce({
    ...structuredClone(studyLesson),
    questions: [],
    errors: { questions: { code: '42501' } },
  })
  await open()
  await button('Start learning').trigger('click')
  expect(wrapper.get('.study-check [role="alert"]').text()).toContain('does not have permission')
  expect(button('Next concept').attributes('disabled')).toBeUndefined()
})

it('reports missing concepts without adding sample material', async () => {
  getTopicLesson.mockResolvedValue({ goals: [], concepts: [], questions: [], errors: {} })
  await open()
  expect(wrapper.text()).toContain('This topic has no lesson concepts yet')
  expect(button('Start learning')).toBeUndefined()
})

it('does not mistake an RLS-filtered empty catalogue for a working lesson', async () => {
  getStudyCatalogue.mockResolvedValue({ subjects: [], topics: [] })
  await open()
  expect(wrapper.text()).toContain('No subjects are visible to your account')
  expect(wrapper.text()).toContain('read access may not have been enabled')
  expect(wrapper.find('.study-overview').exists()).toBe(false)
})

it('reads real selected buddy stats without blocking content when the buddy is unavailable', async () => {
  getSelectedStudyBuddy.mockResolvedValue({
    level: 5,
    xp: 72,
    pokemon: { name: 'Pikachu', sprite_url: '/assets/quiz_buddy.png' },
  })
  await open()
  expect(wrapper.get('.study-buddy').text()).toContain('Level 5 · 72 XP')
  expect(getSelectedStudyBuddy).toHaveBeenCalledWith('student-ash')
  expect(wrapper.find('.study-overview').exists()).toBe(true)
})

it('starts on demand, keeps the timer through mode/topic changes, and pauses on leaving Poké Lab', async () => {
  const router = await open()
  await button('Start Study Session').trigger('click')
  const deadline = useTimer().state.deadlineAt
  await button('Flashcards').trigger('click')
  await flushPromises()
  expect(useTimer().state.status).toBe('running')
  expect(useTimer().state.deadlineAt).toBe(deadline)
  await wrapper.get('#study-subject').setValue('science')
  await flushPromises()
  expect(useTimer().state.deadlineAt).toBe(deadline)
  await router.push('/home')
  expect(useTimer().state.status).toBe('paused')
  await router.push('/study-decks')
  await flushPromises()
  expect(button('Resume')).toBeDefined()
  await button('Resume').trigger('click')
  expect(useTimer().state.status).toBe('running')
})

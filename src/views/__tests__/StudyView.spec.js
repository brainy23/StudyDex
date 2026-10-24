import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import StudyView from '../studyView.vue'
import ArenaView from '../quizView.vue'
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
  revisionCards,
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
  vi.useRealTimers()
})

async function open(query = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/study-decks', name: 'study-decks', component: StudyView },
      { path: '/quiz', name: 'quiz', component: ArenaView },
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

it('progresses through all seven concepts and hands off to Arena with the same topic', async () => {
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
  expect(getStudyQuestions).not.toHaveBeenCalled()
  await button('Quiz me!').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('quiz')
  expect(router.currentRoute.value.query).toMatchObject({ subject: 'maths', topic: 'topic-1' })
  await button('Boss Battle').trigger('click')
  await flushPromises()
  expect(wrapper.get('.study-quiz h2').text()).toBe('Boss Battle')
  expect(wrapper.text()).toContain('answers are not graded or saved')
})

it('unlocks one quiz per completed topic and keeps both available after entering Arena', async () => {
  getStudyCatalogue.mockResolvedValue({
    ...structuredClone(studyCatalogue),
    topics: [studyCatalogue.topics[0], { ...studyCatalogue.topics[0], id: 'topic-2', name: 'Second fixture topic' }],
  })
  getTopicLesson.mockResolvedValue({
    ...structuredClone(studyLesson),
    concepts: [studyLesson.concepts[0]],
    questions: [studyLesson.questions[0]],
  })
  getStudyQuestions.mockImplementation(async (id) => [{
    ...structuredClone(bossQuestions[0]),
    id: `${id}-quiz`, topic_id: id, question_purpose: 'quiz', question_text: `Quiz for ${id}`,
  }])
  const router = await open()
  expect(button('Quiz me!').attributes('disabled')).toBeDefined()
  expect(getStudyQuestions).not.toHaveBeenCalled()
  for (const name of ['Test topic', 'Second fixture topic']) {
    await button(name).trigger('click')
    await flushPromises()
    expect(button('Quiz me!').attributes('disabled')).toBeDefined()
    await button('Start learning').trigger('click')
    await wrapper.find('input[type="radio"]').setValue()
    await button('Finish topic').trigger('click')
    expect(button('Quiz me!').attributes('disabled')).toBeUndefined()
  }
  await button('Quiz me!').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ subject: 'maths', topic: 'topic-2' })
  expect(wrapper.text()).toContain('2 of 2 topics covered')
  expect(wrapper.get('.study-question legend').text()).toBe('Quiz for topic-2')
  await wrapper.findAll('.study-topic-list button')[0].trigger('click')
  await flushPromises()
  expect(wrapper.get('.study-question legend').text()).toBe('Quiz for topic-1')
  expect(getStudyQuestions.mock.calls).toEqual([['topic-2', 'quiz'], ['topic-1', 'quiz']])
  await wrapper.find('input[type="radio"]').setValue()
  await button('Review my choices').trigger('click')
  expect(wrapper.text()).toContain('2 of 2 topics covered')
  await wrapper.findAll('.study-topic-list button')[1].trigger('click')
  await flushPromises()
  expect(wrapper.get('.study-question legend').text()).toBe('Quiz for topic-2')
})

it('keeps only Learn and Flashcards in Lab and retains learning progress between them', async () => {
  await open()
  await button('Start learning').trigger('click')
  await wrapper.find('input[type="radio"]').setValue()
  await button('Next concept').trigger('click')
  await button('Flashcards').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('There are no flashcards for this topic yet')
  expect(wrapper.findAll('.study-mode-nav button').map((item) => item.text())).toEqual(['Learn', 'Flashcards'])
  expect(button('Quiz')).toBeUndefined()
  expect(button('Boss Battle')).toBeUndefined()
  expect(wrapper.find('.study-quiz').exists()).toBe(false)
  expect(getStudyQuestions).not.toHaveBeenCalled()
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

it('retains a 15-card revision when switching modes, topics and an empty subject', async () => {
  getStudyCatalogue.mockResolvedValue({
    ...structuredClone(studyCatalogue),
    topics: [studyCatalogue.topics[0], { ...studyCatalogue.topics[0], id: 'topic-2', name: 'Second fixture topic' }],
  })
  getTopicFlashcards.mockImplementation(async (id) =>
    id === 'topic-1' ? structuredClone(revisionCards) : [{ ...revisionCards[0], id: 'second-card', front_text: 'Second topic fixture' }],
  )
  const router = await open({ mode: 'flashcards' })
  await wrapper.get('.study-flip-card').trigger('click')
  await button('Easy').trigger('click')
  expect(wrapper.get('.study-review-progress').text()).toContain('1 / 15 remembered')
  await button('Learn').trigger('click')
  await flushPromises()
  await button('Flashcards').trigger('click')
  await flushPromises()
  expect(wrapper.get('.study-review-progress').text()).toContain('1 / 15 remembered')
  await button('Second fixture topic').trigger('click')
  await flushPromises()
  await button('Flashcards').trigger('click')
  await flushPromises()
  expect(wrapper.get('.study-card-front').text()).toContain('Second topic fixture')
  expect(getTopicFlashcards).toHaveBeenCalledWith('topic-2')
  await wrapper.get('#study-subject').setValue('science')
  await flushPromises()
  expect(wrapper.text()).toContain('There are no available Science topics')
  await router.push({ name: 'study-decks', query: { topic: 'topic-1', mode: 'flashcards' } })
  await flushPromises()
  expect(wrapper.get('.study-review-progress').text()).toContain('1 / 15 remembered')
  expect(wrapper.get('.study-card-front .study-card-text').text()).toBe(revisionCards[1].front_text)
  expect(getTopicFlashcards.mock.calls.filter(([id]) => id === 'topic-1')).toHaveLength(1)
})

it('keeps the running timer deadline and buddy stats unchanged while rating cards and switching modes', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-24T02:00:00Z'))
  getTopicFlashcards.mockResolvedValue(structuredClone(revisionCards))
  getSelectedStudyBuddy.mockResolvedValue({ level: 5, xp: 72, pokemon: { name: 'Pikachu' } })
  await open({ mode: 'flashcards' })
  await button('Start Study Session').trigger('click')
  const timer = useTimer()
  const deadline = timer.state.deadlineAt
  vi.setSystemTime(new Date(Date.now() + 10000))
  timer.sync()
  expect(timer.display.value).toBe('24:50')
  for (const rating of ['Again', 'Hard', 'Easy']) {
    await wrapper.get('.study-flip-card').trigger('click')
    await button(rating).trigger('click')
    expect(timer.state.deadlineAt).toBe(deadline)
    expect(timer.state.status).toBe('running')
  }
  await button('Learn').trigger('click')
  await flushPromises()
  await button('Flashcards').trigger('click')
  await flushPromises()
  expect(timer.state.deadlineAt).toBe(deadline)
  expect(timer.display.value).toBe('24:50')
  expect(wrapper.get('.study-buddy').text()).toContain('Level 5 · 72 XP')
  expect(getSelectedStudyBuddy).toHaveBeenCalledTimes(1)
  expect(timer.state).not.toHaveProperty('xp')
  expect(wrapper.get('.study-review-progress').text()).toContain('1 / 15 remembered')
})

it('shows loading while flashcards are pending, then renders the returned deck', async () => {
  let finishLoading
  getTopicFlashcards.mockReturnValueOnce(new Promise((resolve) => { finishLoading = resolve }))
  await open({ mode: 'flashcards' })
  expect(wrapper.get('.study-flashcards [role="status"]').text()).toBe('Loading flashcards…')
  expect(wrapper.find('.study-flip-card').exists()).toBe(false)
  finishLoading(structuredClone(revisionCards))
  await flushPromises()
  expect(wrapper.get('.study-review-progress').text()).toContain('0 / 15 remembered')
  expect(wrapper.get('.study-card-front .study-card-text').text()).toBe(revisionCards[0].front_text)
})

it.each([
  [{ code: '42501', message: 'permission denied for table flashcards' }, 'does not have permission'],
  [new Error('Failed to fetch'), 'Failed to fetch'],
])('handles flashcard errors independently and supports a successful retry: %s', async (error, message) => {
  getTopicFlashcards.mockRejectedValueOnce(error).mockResolvedValue(structuredClone(revisionCards))
  await open({ mode: 'flashcards' })
  expect(wrapper.get('.study-flashcards [role="alert"]').text()).toContain(message)
  expect(wrapper.find('.study-flip-card').exists()).toBe(false)
  await button('Learn').trigger('click')
  await flushPromises()
  expect(wrapper.get('.study-overview h2').text()).toBe('Test topic')
  await button('Flashcards').trigger('click')
  await flushPromises()
  await button('Try again').trigger('click')
  await flushPromises()
  expect(wrapper.find('.study-flashcards [role="alert"]').exists()).toBe(false)
  expect(wrapper.get('.study-review-progress').text()).toContain('0 / 15 remembered')
  expect(getTopicFlashcards).toHaveBeenCalledTimes(2)
})

it('does not retrieve educational content after profile authentication fails', async () => {
  getCurrentProfile.mockRejectedValue(new Error('Please log in to view your profile.'))
  await open({ mode: 'flashcards' })
  expect(wrapper.get('[role="alert"]').text()).toContain('Please log in')
  expect(getStudyCatalogue).not.toHaveBeenCalled()
  expect(getTopicFlashcards).not.toHaveBeenCalled()
})

it('starts a fresh revision after the study page is destroyed and loaded again', async () => {
  getTopicFlashcards.mockResolvedValue(structuredClone(revisionCards))
  await open({ mode: 'flashcards' })
  await wrapper.get('.study-flip-card').trigger('click')
  await button('Easy').trigger('click')
  expect(wrapper.get('.study-review-progress').text()).toContain('1 / 15 remembered')
  wrapper.unmount()
  await open({ mode: 'flashcards' })
  expect(wrapper.get('.study-review-progress').text()).toContain('0 / 15 remembered')
  expect(wrapper.get('.study-card-front .study-card-text').text()).toBe(revisionCards[0].front_text)
  expect(getTopicFlashcards).toHaveBeenCalledTimes(2)
})

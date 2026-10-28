import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ArenaView from '../quizView.vue'
import { getCurrentProfile } from '../../services/profileService'
import { getStudyCatalogue, getStudyQuestions, getTopicLesson, getTopicFlashcards } from '../../services/studyService'
import { studentProfile, studyCatalogue, bossQuestions } from '../../test/studyFixtures'
import { useTopicCompletion } from '../../composables/useTopicCompletion'

vi.mock('../../services/profileService', () => ({ getCurrentProfile: vi.fn() }))
vi.mock('../../services/studyService', async () => ({
  ...(await vi.importActual('../../services/studyService')),
  getStudyCatalogue: vi.fn(),
  getStudyQuestions: vi.fn(),
  getTopicLesson: vi.fn(),
  getTopicFlashcards: vi.fn(),
}))

const quizQuestions = bossQuestions.map((question, index) => ({
  ...structuredClone(question),
  id: `quiz-${index}`,
  question_text: `Fixture quiz question ${index + 1}`,
  question_purpose: 'quiz',
}))
let wrapper
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  const completion = useTopicCompletion()
  completion.bindStudent(studentProfile.id, studentProfile.school_level_id)
  completion.markComplete('topic-1')
  getCurrentProfile.mockResolvedValue(structuredClone(studentProfile))
  getStudyCatalogue.mockResolvedValue(structuredClone(studyCatalogue))
  getStudyQuestions.mockImplementation(async (_topicId, purpose) =>
    structuredClone(purpose === 'boss_battle' ? bossQuestions : quizQuestions),
  )
})
afterEach(() => wrapper?.unmount())

async function open(query = {}, preview = true) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/quiz', name: 'quiz', component: ArenaView },
      { path: '/study-decks', name: 'study-decks', component: { template: '<div>Lab revision</div>' } },
      { path: '/home', component: { template: '<div>Town</div>' } },
      { path: '/account', component: { template: '<div>Account Settings</div>' } },
    ],
  })
  await router.push({ name: 'quiz', query })
  await router.isReady()
  wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  await flushPromises()
  if (preview) await previewQuestions()
  return router
}
const button = (text) => wrapper.findAll('button').find((item) => item.text() === text)
async function previewQuestions() {
  const preview = button('Preview Questions')
  if (preview) await preview.trigger('click')
}

it('opens an unlocked quiz using the saved school level, without fetching learning resources', async () => {
  await open()
  expect(getStudyCatalogue).toHaveBeenCalledWith('level-3')
  expect(getStudyQuestions.mock.calls).toEqual([['topic-1', 'quiz']])
  expect(getTopicLesson).not.toHaveBeenCalled()
  expect(getTopicFlashcards).not.toHaveBeenCalled()
  expect(wrapper.get('h1').text()).toBe('Poké Arena')
  expect(wrapper.get('.study-level').text()).toBe('Primary 3')
  expect(wrapper.findAll('select')).toHaveLength(1)
  expect(wrapper.get('.study-question legend').text()).toBe(quizQuestions[0].question_text)
  expect(wrapper.find('.study-timer').exists()).toBe(false)
  expect(wrapper.find('.study-flashcards').exists()).toBe(false)
})

it('allows direct Arena entry without Learn completion and offers the topic overview', async () => {
  localStorage.clear()
  const router = await open({ subject: 'maths', topic_id: 'topic-1' }, false)
  expect(wrapper.text()).toContain('0 of 1 topics read')
  expect(getStudyQuestions.mock.calls).toEqual([['topic-1', 'quiz']])
  expect(wrapper.find('.study-question').exists()).toBe(false)
  expect(button('Start Quiz').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('Secure grading is not available yet')
  await button('Review Entire Topic').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ subject: 'maths', topic_id: 'topic-1', mode: 'learn', review: 'topic' })
  expect(router.currentRoute.value.name).toBe('study-decks')
})

it('keeps Boss Battles separate from regular quizzes before completing a topic', async () => {
  localStorage.clear()
  await open()
  await button('Boss Battle').trigger('click')
  await flushPromises()
  expect(getStudyQuestions.mock.calls).toEqual([['topic-1', 'quiz'], ['topic-1', 'boss_battle']])
  expect(wrapper.find('.study-question').exists()).toBe(false)
  await previewQuestions()
  expect(wrapper.get('.study-question legend').text()).toBe(bossQuestions[0].question_text)
  await button('Topic Quiz').trigger('click')
  await flushPromises()
  await previewQuestions()
  expect(wrapper.get('.study-question legend').text()).toBe(quizQuestions[0].question_text)
  expect(getStudyQuestions).toHaveBeenCalledTimes(2)
})

it('keeps reading history separate by account without treating it as assessment eligibility', async () => {
  await open()
  expect(wrapper.text()).toContain('1 of 1 topics read')
  wrapper.unmount()
  getCurrentProfile.mockResolvedValue({ ...studentProfile, id: 'another-student' })
  await open({}, false)
  expect(wrapper.find('.study-question').exists()).toBe(false)
  expect(wrapper.text()).toContain('0 of 1 topics read')
  expect(button('Preview Questions')).toBeDefined()
})

it('keeps quiz and Boss Battle choices separate and reviews choices without claiming a score or saved attempt', async () => {
  const router = await open()
  expect(button('Next question').attributes('disabled')).toBeDefined()
  await wrapper.find('input[type="radio"]').setValue()
  await button('Boss Battle').trigger('click')
  await flushPromises()
  await previewQuestions()
  expect(router.currentRoute.value.query.battle).toBe('boss')
  expect(wrapper.get('.study-quiz h2').text()).toBe('Boss Battle')
  expect(wrapper.find('input[type="radio"]').element.checked).toBe(false)
  await wrapper.find('input[type="radio"]').setValue()
  await button('Topic Quiz').trigger('click')
  await flushPromises()
  expect(wrapper.find('input[type="radio"]').element.checked).toBe(true)
  await button('Next question').trigger('click')
  await wrapper.findAll('input[type="radio"]')[1].setValue()
  await button('Review my choices').trigger('click')
  expect(wrapper.findAll('.study-answer-summary li')).toHaveLength(2)
  expect(wrapper.get('.study-answer-summary').text()).toContain('Choice 1')
  expect(wrapper.get('.study-answer-summary').text()).toContain('Choice 2')
  expect(wrapper.text()).toContain('They have not been submitted or graded')
  expect(wrapper.text()).toContain('answers are not graded or saved')
  expect(getStudyQuestions.mock.calls).toEqual([['topic-1', 'quiz'], ['topic-1', 'boss_battle']])
  await button('Review questions').trigger('click')
  expect(wrapper.get('.study-question legend').text()).toBe(quizQuestions[0].question_text)
})

it('returns to revision in Lab with the selected subject and topic', async () => {
  const router = await open({ subject: 'maths', topic: 'topic-1', battle: 'boss' })
  await wrapper.get('a[href^="/study-decks"]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('study-decks')
  expect(router.currentRoute.value.query).toEqual({ subject: 'maths', topic_id: 'topic-1', mode: 'flashcards' })
})

it('loads another topic, preserves the assessment type, and retains choices when returning', async () => {
  getStudyCatalogue.mockResolvedValue({
    ...structuredClone(studyCatalogue),
    topics: [studyCatalogue.topics[0], { ...studyCatalogue.topics[0], id: 'science-topic', subject_id: 'science', name: 'Fixture Science topic' }],
  })
  getStudyQuestions.mockImplementation(async (topicId, purpose) => [{
    ...structuredClone(purpose === 'boss_battle' ? bossQuestions[0] : quizQuestions[0]),
    id: `${topicId}-${purpose}`,
    question_text: `${topicId} ${purpose} question`,
  }])
  const router = await open({ battle: 'boss' })
  await wrapper.find('input[type="radio"]').setValue()
  await wrapper.get('#arena-subject').setValue('science')
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ subject: 'science', topic_id: 'science-topic', battle: 'boss' })
  await previewQuestions()
  expect(wrapper.get('.study-question legend').text()).toBe('science-topic boss_battle question')
  expect(getStudyQuestions).toHaveBeenCalledWith('science-topic', 'boss_battle')
  await wrapper.get('#arena-subject').setValue('maths')
  await flushPromises()
  expect(wrapper.find('input[type="radio"]').element.checked).toBe(true)
})

it('shows empty question sets and offers Boss Battle or a return to Lab', async () => {
  getStudyQuestions.mockResolvedValue([])
  const router = await open()
  expect(wrapper.text()).toContain('There are no regular quiz questions')
  await button('View Boss Battle').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('There is no Boss Battle for this topic yet')
  await button('Revise in Poké Lab').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('study-decks')
})

it.each([
  [{ code: '42501', message: 'permission denied for table questions' }, 'does not have permission'],
  [new Error('Failed to fetch'), 'Failed to fetch'],
])('shows assessment errors and retries without substituting questions: %s', async (error, message) => {
  getStudyQuestions.mockRejectedValueOnce(error).mockResolvedValue(quizQuestions)
  await open()
  expect(wrapper.get('.study-quiz [role="alert"]').text()).toContain(message)
  expect(wrapper.find('.study-question').exists()).toBe(false)
  await button('Try again').trigger('click')
  await flushPromises()
  expect(wrapper.find('.study-quiz [role="alert"]').exists()).toBe(false)
  await previewQuestions()
  expect(wrapper.get('.study-question legend').text()).toBe(quizQuestions[0].question_text)
  expect(getStudyQuestions).toHaveBeenCalledTimes(2)
})

it('shows loading while questions are pending and isolates a late quiz response from Boss Battle', async () => {
  let finishQuiz
  getStudyQuestions.mockImplementation((_id, purpose) => purpose === 'quiz'
    ? new Promise((resolve) => { finishQuiz = resolve })
    : Promise.resolve(structuredClone(bossQuestions)))
  await open()
  expect(wrapper.get('.study-quiz [role="status"]').text()).toBe('Loading questions…')
  await button('Boss Battle').trigger('click')
  await flushPromises()
  finishQuiz(structuredClone(quizQuestions))
  await flushPromises()
  expect(wrapper.get('.study-quiz h2').text()).toBe('Boss Battle')
  await previewQuestions()
  expect(wrapper.get('.study-question legend').text()).toBe(bossQuestions[0].question_text)
  await button('Topic Quiz').trigger('click')
  await flushPromises()
  await previewQuestions()
  expect(wrapper.get('.study-question legend').text()).toBe(quizQuestions[0].question_text)
})

it('requires a saved level rather than asking for another level or fetching assessments', async () => {
  getCurrentProfile.mockResolvedValue({ ...studentProfile, school_level_id: null, school_level: null })
  await open()
  expect(wrapper.text()).toContain('Set your school level first')
  expect(wrapper.get('a[href="/account"]').text()).toBe('Open Account Settings')
  expect(getStudyCatalogue).not.toHaveBeenCalled()
  expect(getStudyQuestions).not.toHaveBeenCalled()
})

it('rejects a topic outside the available level catalogue', async () => {
  await open({ topic: 'other-level-topic' })
  expect(wrapper.text()).toContain('This topic is unavailable')
  expect(getStudyQuestions).not.toHaveBeenCalled()
})

it('handles a subject without topics and preserves choices when returning', async () => {
  const router = await open()
  await wrapper.find('input[type="radio"]').setValue()
  await wrapper.get('#arena-subject').setValue('science')
  await flushPromises()
  expect(wrapper.text()).toContain('No assessment topics are available')
  expect(wrapper.find('.study-question').exists()).toBe(false)
  await router.push({ name: 'quiz', query: { topic: 'topic-1' } })
  await flushPromises()
  expect(wrapper.find('input[type="radio"]').element.checked).toBe(true)
  expect(getStudyQuestions).toHaveBeenCalledTimes(1)
})

it('reports profile authentication failure without requesting content', async () => {
  getCurrentProfile.mockRejectedValue(new Error('Please log in to view your profile.'))
  await open()
  expect(wrapper.get('[role="alert"]').text()).toContain('Please log in')
  expect(getStudyCatalogue).not.toHaveBeenCalled()
  expect(getStudyQuestions).not.toHaveBeenCalled()
})

it('supports retrying the catalogue when Arena cannot open', async () => {
  getStudyCatalogue.mockRejectedValueOnce(new Error('Catalogue unavailable')).mockResolvedValue(studyCatalogue)
  await open()
  expect(wrapper.get('[role="alert"]').text()).toContain('Catalogue unavailable')
  await button('Try again').trigger('click')
  await flushPromises()
  await previewQuestions()
  expect(wrapper.get('.study-question legend').text()).toBe(quizQuestions[0].question_text)
})

it('respects canonical topic_id over legacy topic and does not auto-start a quiz preview', async () => {
  getStudyCatalogue.mockResolvedValue({
    ...structuredClone(studyCatalogue),
    topics: [...studyCatalogue.topics, { ...studyCatalogue.topics[0], id: 'science-topic', subject_id: 'science', name: 'living things' }],
  })
  const router = await open({ topic_id: 'science-topic', topic: 'topic-1' }, false)
  expect(getStudyQuestions.mock.calls).toEqual([['science-topic', 'quiz']])
  expect(wrapper.get('.main-study > .study-eyebrow').text()).toBe('Science · Living Things')
  expect(wrapper.get('.study-quiz h2').text()).toBe('Topic Quiz')
  expect(wrapper.find('.study-question').exists()).toBe(false)
  expect(button('Start Quiz').attributes('disabled')).toBeDefined()
  await previewQuestions()
  expect(wrapper.find('.study-question').exists()).toBe(true)
  expect(router.currentRoute.value.query.topic_id).toBe('science-topic')
})

it('does not substitute Boss Battle questions or infer grades when the regular quiz is missing', async () => {
  getStudyQuestions.mockImplementation(async (_id, purpose) => purpose === 'quiz' ? [] : structuredClone(bossQuestions))
  await open({ topic_id: 'topic-1', score: '0', concept_id: 'concept-1' }, false)
  expect(wrapper.text()).toContain('There are no regular quiz questions')
  expect(getStudyQuestions.mock.calls).toEqual([['topic-1', 'quiz']])
  expect(wrapper.find('.study-question').exists()).toBe(false)
  expect(button('Review Weak Concepts')).toBeUndefined()
  expect(button('Retry Quiz')).toBeUndefined()
  expect(wrapper.text()).not.toMatch(/you failed|weak concepts|0%/i)
  expect(button('Review Entire Topic')).toBeDefined()
})

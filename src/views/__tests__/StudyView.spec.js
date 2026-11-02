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
import { useArenaTransition } from '../../composables/useArenaTransition'
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
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 25, name: 'pikachu', sprites: { front_default: '' } }) }))
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
  useArenaTransition().cancel()
  useTimer().endSession()
  wrapper?.unmount()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function open(query = { topic_id: 'topic-1' }) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/study-decks', name: 'study-decks', component: StudyView },
      { path: '/quiz', name: 'quiz', component: ArenaView },
      { path: '/home', component: { template: '<div>Town</div>' } },
      { path: '/account', component: { template: '<div>Account</div>' } },
    ],
  })
  await router.push({ name: 'study-decks', query: 'topic_id' in query || 'topic' in query ? query : { topic_id: 'topic-1', ...query } })
  await router.isReady()
  wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router], stubs: { ClockWeather: true } } })
  await flushPromises()
  return router
}
const button = (text) => wrapper.findAll('button').find((item) => item.text() === text)
async function chooseSubject(name) {
  if (button('Topics')) await button('Topics').trigger('click')
  const back = wrapper.find('.picker-back')
  if (back.exists()) await back.trigger('click')
  const subject = wrapper.findAll('.arena-picker .bubble-card').find(item => item.get('strong').text() === name)
  await subject.trigger('click')
  await flushPromises()
}
async function chooseTopic(name) {
  const topic = wrapper.findAll('.arena-picker .topic-grid .bubble-card').find(item => item.get('strong').text() === name)
  await topic.trigger('click')
  await flushPromises()
}


it('uses the registered level automatically, shows ordered goals, and never asks for a level', async () => {
  await open()
  expect(getStudyCatalogue).toHaveBeenCalledWith('level-3')
  expect(wrapper.get('.study-overview h2').text()).toBe('Test Topic')
  expect(wrapper.findAll('.study-goals li').map((item) => item.text())).toEqual(
    studyLesson.goals.map((goal) => goal.goal_text),
  )
  expect(wrapper.findAll('select')).toHaveLength(0)
  await button('Topics').trigger('click')
  await wrapper.get('.picker-back').trigger('click')
  expect(wrapper.findAll('.arena-picker .bubble-card strong').map(item => item.text())).toEqual(['Mathematics', 'Science'])
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
  await chooseSubject('Mathematics')
  expect(wrapper.text()).toContain('There are no available Mathematics topics for Primary 4 yet')
  expect(getTopicLesson).not.toHaveBeenCalled()
})

it('reads all seven concepts without MCQs, offers completion choices, and preserves topic context', async () => {
  getTopicFlashcards.mockResolvedValue(structuredClone(revisionCards))
  const router = await open()
  await button('Start Learning').trigger('click')
  for (let index = 0; index < 7; index++) {
    expect(wrapper.get('.study-concept h2').text()).toBe(`Concept ${index + 1}`)
    expect(wrapper.get('.study-explanation').text()).toBe(`Explanation ${index + 1}`)
    expect(wrapper.get('.study-example .study-copy').text()).toBe(`Worked example ${index + 1}`)
    expect(wrapper.find('.study-question').exists()).toBe(false)
    expect(wrapper.find('input[type="radio"]').exists()).toBe(false)
    const next = button(index === 6 ? 'Finish Topic' : 'Next Concept')
    expect(next.attributes('disabled')).toBeUndefined()
    await next.trigger('click')
  }
  expect(wrapper.get('.study-completion').text()).toContain('7 of 7 concepts read')
  expect(wrapper.find('.study-header progress').exists()).toBe(false)
  expect(wrapper.get('.study-topic-progress').text()).toContain('7 of 7 concepts read')
  expect(getStudyQuestions).not.toHaveBeenCalled()
  expect(router.currentRoute.value.name).toBe('study-decks')
  await button('Review with Flashcards').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query.mode).toBe('flashcards')
  expect(wrapper.get('.study-review-progress').text()).toContain('0 / 15 remembered')
  expect(getTopicFlashcards).toHaveBeenCalledWith('topic-1')
  await button('Learn').trigger('click')
  await flushPromises()
  expect(wrapper.find('.study-completion').exists()).toBe(true)
  await wrapper.get('.study-completion').findAll('button').find((item) => item.text() === 'Go to Poké Arena').trigger('click')
  expect(useArenaTransition().state.active).toBe(true)
  await useArenaTransition().skip()
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('quiz')
  expect(router.currentRoute.value.query).toEqual({ subject: 'maths', topic_id: 'topic-1' })
  expect(getStudyQuestions.mock.calls).toEqual([['topic-1', 'quiz']])
  expect(wrapper.text()).toContain('There are no regular quiz questions')
  expect(button('Start Quiz').attributes('disabled')).toBeDefined()
})

it('can revisit the roadmap and previous concepts without losing reading progress', async () => {
  await open()
  await button('Start Learning').trigger('click')
  await button('Next Concept').trigger('click')
  await button('Previous Concept').trigger('click')
  expect(wrapper.get('.study-concept h2').text()).toBe('Concept 1')
  const roadmap = wrapper.get('nav[aria-label="Concept roadmap"]')
  expect(roadmap.findAll('li')).toHaveLength(7)
  expect(roadmap.get('button[aria-current="step"]').attributes('aria-label')).toContain('Concept 1')
  await roadmap.findAll('li button')[6].trigger('click')
  await button('Finish Topic').trigger('click')
  await button('Revisit Concepts').trigger('click')
  expect(wrapper.get('.study-overview h2').text()).toBe('Test Topic')
  expect(wrapper.get('.study-topic-progress').text()).toContain('2 of 7 concepts read')
})

it('keeps only Learn and Flashcards in Lab and retains learning progress between them', async () => {
  await open()
  await button('Start Learning').trigger('click')
  await button('Next Concept').trigger('click')
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
  await chooseSubject('Science')
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

it('ignores legacy quick checks and their errors in Learn', async () => {
  getTopicLesson.mockResolvedValueOnce({
    ...structuredClone(studyLesson),
    errors: { questions: { code: '42501' } },
  })
  await open()
  await button('Start Learning').trigger('click')
  expect(wrapper.find('.study-check').exists()).toBe(false)
  expect(wrapper.find('input[type="radio"]').exists()).toBe(false)
  expect(button('Next Concept').attributes('disabled')).toBeUndefined()
})

it('reports missing concepts without adding sample material', async () => {
  getTopicLesson.mockResolvedValue({ goals: [], concepts: [], questions: [], errors: {} })
  await open()
  expect(wrapper.text()).toContain('This topic has no lesson concepts yet')
  expect(button('Start Learning')).toBeUndefined()
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
  expect(wrapper.get('.lab-footer').text()).toContain('Level 5 · 72 XP')
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
  await chooseSubject('Science')
  await flushPromises()
  expect(useTimer().state.deadlineAt).toBe(deadline)
  await router.push('/home')
  expect(useTimer().state.status).toBe('paused')
  await router.push('/study-decks?topic_id=topic-1')
  await flushPromises()
  expect(button('Resume')).toBeDefined()
  await button('Resume').trigger('click')
  expect(useTimer().state.status).toBe('running')
})

it('retains a 15-card revision when switching modes, topics and an empty subject', async () => {
  getStudyCatalogue.mockResolvedValue({
    ...structuredClone(studyCatalogue),
    topics: [studyCatalogue.topics[0], { ...studyCatalogue.topics[0], id: 'topic-2', name: 'Second Fixture Topic' }],
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
  await button('Topics').trigger('click')
  await chooseTopic('Second Fixture Topic')
  await flushPromises()
  await button('Flashcards').trigger('click')
  await flushPromises()
  expect(wrapper.get('.study-card-front').text()).toContain('Second topic fixture')
  expect(getTopicFlashcards).toHaveBeenCalledWith('topic-2')
  await chooseSubject('Science')
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
  for (const rating of ['Again', 'Easy']) {
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
  expect(wrapper.get('.lab-footer').text()).toContain('Level 5 · 72 XP')
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
  expect(wrapper.get('.study-overview h2').text()).toBe('Test Topic')
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

async function completeDeck() {
  while (wrapper.find('.study-flip-card').exists()) {
    await wrapper.get('.study-flip-card').trigger('click')
    await button('Easy').trigger('click')
  }
}

it('hands a completed direct-entry Flashcard topic to Arena without requiring Learn', async () => {
  getStudyCatalogue.mockResolvedValue({
    ...structuredClone(studyCatalogue),
    topics: [...studyCatalogue.topics, { ...studyCatalogue.topics[0], id: 'science-topic', subject_id: 'science', name: 'living things' }],
  })
  getTopicFlashcards.mockResolvedValue(structuredClone(revisionCards))
  const router = await open({ topic_id: 'science-topic', mode: 'flashcards' })
  await completeDeck()
  expect(wrapper.get('.study-completion').text()).toContain('15 unique cards remembered')
  expect(getStudyQuestions).not.toHaveBeenCalled()
  await wrapper.get('.study-completion').findAll('button').find((item) => item.text() === 'Go to Poké Arena').trigger('click')
  await useArenaTransition().skip()
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ subject: 'science', topic_id: 'science-topic' })
  expect(getStudyQuestions.mock.calls).toEqual([['science-topic', 'quiz']])
  expect(wrapper.get('.study-quiz h2').text()).toBe('Topic Quiz')
  expect(wrapper.text()).toContain('There are no regular quiz questions')
  expect(wrapper.find('.study-question').exists()).toBe(false)
})

it('returns to topic selection with the saved level and opens another populated topic', async () => {
  getStudyCatalogue.mockResolvedValue({
    ...structuredClone(studyCatalogue),
    topics: [...studyCatalogue.topics, { ...studyCatalogue.topics[0], id: 'other-topic', subject_id: 'science', name: 'another topic' }],
  })
  getTopicFlashcards.mockResolvedValue([revisionCards[0]])
  const router = await open({ mode: 'flashcards' })
  await completeDeck()
  await button('Revise Another Topic').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ view: 'topics', mode: 'flashcards', from_topic_id: 'topic-1' })
  expect(wrapper.find('.study-topic-selection').exists()).toBe(true)
  expect(getStudyCatalogue.mock.calls).toEqual([['level-3']])
  await chooseSubject('Science')
  await chooseTopic('Another Topic')
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ subject: 'science', topic_id: 'other-topic', mode: 'flashcards' })
  expect(wrapper.get('.study-review-progress').text()).toContain('0 / 1 remembered')
})

it.each([false, true])('explains when no other populated topics exist (empty alternative: %s)', async (emptyAlternative) => {
  if (emptyAlternative) {
    getStudyCatalogue.mockResolvedValue({
      ...structuredClone(studyCatalogue),
      topics: [...studyCatalogue.topics, { ...studyCatalogue.topics[0], id: 'empty-topic' }],
    })
    getTopicLesson.mockImplementation(async (id) => id === 'empty-topic'
      ? { goals: [], concepts: [], errors: {} }
      : structuredClone(studyLesson))
  }
  getTopicFlashcards.mockImplementation(async (id) => id === 'empty-topic' ? [] : [revisionCards[0]])
  await open({ mode: 'flashcards' })
  await completeDeck()
  await button('Revise Another Topic').trigger('click')
  await flushPromises()
  const selection = wrapper.get('.study-topic-selection')
  expect(selection.text()).toContain(emptyAlternative ? 'No other populated topics' : 'No other topics')
  expect(selection.findAll('.study-topic-list button')[0].attributes('disabled')).toBeUndefined()
  expect(selection.findAll('.study-topic-list button:disabled')).toHaveLength(emptyAlternative ? 1 : 0)
})

it('opens requested concept revision in topic order, marks only matching concepts, and accepts legacy links', async () => {
  const router = await open({ topic: 'topic-1', mode: 'learn', review: 'concepts', concept_ids: ['concept-3', 'foreign-concept', 'concept-1'] })
  expect(wrapper.get('.study-concept h2').text()).toBe('Concept 4')
  const roadmap = wrapper.get('nav[aria-label="Concept roadmap"]')
  expect(roadmap.findAll('.study-roadmap-steps button').filter((item) => item.attributes('aria-label').includes('Revisit')).map((item) => item.attributes('aria-label').split(': ')[1].split(' · ')[0])).toEqual(['Concept 2', 'Concept 4'])
  expect(wrapper.text()).not.toMatch(/weak|failed|score/i)
  await router.push({ name: 'study-decks', query: { topic_id: 'topic-1', mode: 'learn', review: 'topic' } })
  await flushPromises()
  expect(wrapper.find('.study-overview').exists()).toBe(true)
})

it('falls back to the overview for missing or foreign concepts without labeling them weak', async () => {
  await open({ topic_id: 'topic-1', mode: 'learn', concept_ids: ['foreign-concept'] })
  expect(wrapper.find('.study-overview').exists()).toBe(true)
  expect(wrapper.text()).toContain('Those concepts are unavailable in this topic')
  expect(wrapper.find('.study-concept').exists()).toBe(false)
})

it('reports failed topic availability checks and lets the student retry before selecting', async () => {
  getStudyCatalogue.mockResolvedValue({
    ...structuredClone(studyCatalogue),
    topics: [...studyCatalogue.topics, { ...studyCatalogue.topics[0], id: 'other-topic', name: 'Another topic' }],
  })
  getTopicLesson.mockImplementation(async (id) => {
    if (id === 'other-topic') throw new Error('Content check unavailable')
    return structuredClone(studyLesson)
  })
  getTopicFlashcards.mockImplementation(async (id) => id === 'other-topic' ? [] : [revisionCards[0]])
  const router = await open({ mode: 'flashcards' })
  await completeDeck()
  await button('Revise Another Topic').trigger('click')
  await flushPromises()
  const selection = wrapper.get('.study-topic-selection')
  expect(selection.get('[role="alert"]').text()).toContain('Content check unavailable')
  expect(selection.text()).not.toContain('No other populated topics')
  getTopicLesson.mockResolvedValue(structuredClone(studyLesson))
  await selection.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(selection.find('[role="alert"]').exists()).toBe(false)
  await selection.findAll('.study-topic-list button')[1].trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ subject: 'maths', topic_id: 'other-topic', mode: 'learn' })
  expect(wrapper.find('.study-overview').exists()).toBe(true)
})

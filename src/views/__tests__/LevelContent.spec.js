import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Subjects from '../SubjectsView.vue'
import Topics from '../TopicsView.vue'
import Mode from '../StudyModeView.vue'
import Learn from '../LearnView.vue'
import Flashcards from '../studyView.vue'
import Arena from '../quizView.vue'
import { filterStudentCatalogue } from '../../utils/studyCatalogue'
import { getCurrentProfile } from '../../services/profileService'
import {
  getStudentStudyCatalogue,
  getStudyQuestions,
  getTopicLesson,
  getTopicFlashcards,
  getSelectedStudyBuddy,
} from '../../services/studyService'
import { getStudentQuizCatalogue } from '../../services/quizPreviewService'
import { usePokemonTransition } from '../../composables/usePokemonTransition'

vi.mock('../../services/profileService', () => ({ getCurrentProfile: vi.fn() }))
vi.mock('../../services/studyService', async (importOriginal) => ({
  ...(await importOriginal()),
  getStudentStudyCatalogue: vi.fn(),
  getStudyQuestions: vi.fn(),
  getTopicLesson: vi.fn(),
  getTopicFlashcards: vi.fn(),
  getSelectedStudyBuddy: vi.fn(async () => null),
}))
vi.mock('../../services/quizPreviewService', async (importOriginal) => ({
  ...(await importOriginal()),
  getStudentQuizCatalogue: vi.fn(),
}))
const raw = {
  subjects: [
    { id: 'math', name: 'Mathematics' },
    { id: 'science', name: 'Science' },
  ],
  topics: [1, 2, 3, 4, 5, 6].flatMap((level) =>
    ['math', 'science'].map((subject) => ({
      id: `${subject}-${level}`,
      name: `${subject === 'math' ? 'Numbers' : 'Plants'} P${level}`,
      subject_id: subject,
      level_id: `level-${level}`,
      topic_order: 1,
    })),
  ),
}
let profile
let wrapper
function student(level) {
  return {
    id: 'student-a',
    school_level_id: `level-${level}`,
    school_level: { level_number: level, name: `Primary ${level}` },
  }
}
function question(index) {
  return {
    id: `q-${index}`,
    topic_id: 'math-1',
    question_text: `2 × ${index} − 1\n● ●`,
    question_type: 'mcq',
    question_purpose: 'quiz',
    difficulty: 1,
    options: [1, 2, 3, 4].map((order) => ({
      id: `q-${index}-o-${order}`,
      question_id: `q-${index}`,
      option_text: `Option ${order}`,
      option_order: order,
    })),
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  profile = student(1)
  localStorage.clear()
  sessionStorage.clear()
  getCurrentProfile.mockImplementation(async () => structuredClone(profile))
  getStudentStudyCatalogue.mockImplementation(async (value) => filterStudentCatalogue(raw, value))
  getStudentQuizCatalogue.mockImplementation(async (value) => {
    const data = filterStudentCatalogue(raw, value)
    return { ...data, topics: data.topics.map((topic) => ({ ...topic, quiz_question_count: 3 })) }
  })
  getStudyQuestions.mockResolvedValue([1, 2, 3].map(question))
  getTopicLesson.mockResolvedValue({
    goals: [],
    concepts: [
      {
        id: 'concept',
        title: 'Count objects',
        explanation_text: '● ●\n● ●',
        example_text: '2 × 2 = 4\n4 − 1 = 3',
      },
    ],
    errors: {},
  })
  getTopicFlashcards.mockResolvedValue([
    {
      id: 'card',
      topic_id: 'math-1',
      front_text: '2 × 2',
      back_text: '4\n● ● ● ●',
      front_image_path: null,
      back_image_path: null,
      card_order: 1,
    },
  ])
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: false })),
  )
})
afterEach(() => {
  usePokemonTransition().cancel()
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
async function open(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/subjects', name: 'selection-subjects', component: Subjects },
      { path: '/topics', name: 'selection-topics', component: Topics },
      { path: '/mode', name: 'study-mode', component: Mode },
      { path: '/learn', name: 'learn', component: Learn },
      { path: '/study', name: 'study-decks', component: Flashcards },
      { path: '/arena', name: 'quiz-battle', component: Arena },
      ...['home', 'account', 'surprise-boss'].map((name) => ({
        path: `/${name}`,
        name,
        component: { template: '<div />' },
      })),
    ],
  })
  await router.push(path)
  await router.isReady()
  wrapper = mount(
    { template: '<RouterView />' },
    {
      global: {
        plugins: [router],
        stubs: {
          ClockWeather: true,
          TownBackground: true,
          PokeSprite: true,
        },
      },
    },
  )
  await flushPromises()
  return router
}
it.each([1, 2, 3, 4, 5, 6])(
  'shows only subjects available for saved P%s in Lab and Arena',
  async (level) => {
    profile = student(level)
    for (const flow of ['study', 'quiz']) {
      await open(`/subjects?flow=${flow}`)
      const choices = wrapper.findAll('.sd-path strong').map((item) => item.text())
      expect(choices).toEqual(level < 3 ? ['Mathematics'] : ['Mathematics', 'Science'])
      wrapper.unmount()
      wrapper = null
    }
  },
)
it('opens Mathematics topics, Learn and Flashcards using database topic IDs', async () => {
  const router = await open('/topics?flow=study&subject=math')
  expect(wrapper.findAll('.sd-topic-card')).toHaveLength(1)
  expect(wrapper.text()).toContain('Numbers P1')
  await wrapper.get('.sd-topic-card').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ subject: 'math', topic: 'math-1' })
  await wrapper.findAll('.sd-path')[0].trigger('click')
  const transition = usePokemonTransition()
  expect(transition.state.destination).toBe('Learn Room')
  transition.skipAnimation()
  transition.presented(transition.state.sequence)
  await flushPromises()
  expect(transition.state.active).toBe(false)
  expect(wrapper.get('.inline-whiteboard').text()).toContain('2 × 2 = 4\n4 − 1 = 3')
  expect(getTopicLesson).toHaveBeenCalledWith('math-1')
  await router.push('/study?subject=math&topic=math-1')
  await flushPromises()
  expect(wrapper.text()).toContain('2 × 2')
  await wrapper.get('.screen-flip').trigger('click')
  expect(wrapper.text()).toContain('● ● ● ●')
  expect(wrapper.findAll('.answer-content img')).toHaveLength(0)
})
it.each(['/learn', '/study', '/mode', '/arena'])(
  'rejects a different-level topic on direct %s links',
  async (path) => {
    await open(`${path}?subject=math&topic=math-6`)
    expect(wrapper.text()).toMatch(/school level/)
    expect(getTopicLesson).not.toHaveBeenCalled()
    expect(getTopicFlashcards).not.toHaveBeenCalled()
    expect(getStudyQuestions).not.toHaveBeenCalled()
  },
)
it('does not silently replace an invalid subject with Science', async () => {
  await open('/topics?flow=study&subject=unknown')
  expect(wrapper.findAll('.sd-topic-card')).toHaveLength(0)
})

it('keeps lesson text available while the optional buddy request is pending', async () => {
  getSelectedStudyBuddy.mockReturnValueOnce(new Promise(() => {}))
  await open('/learn?subject=math&topic=math-1')
  expect(wrapper.get('.inline-whiteboard').text()).toContain('Count objects')
  expect(wrapper.text()).not.toContain('Opening your Poké Lab')
})
it('previews all three real Math questions with no correctness, local score or persistence', async () => {
  await open('/arena?subject=math&topic=math-1')
  expect(wrapper.get('#arena-question').text()).toContain('2 × 1 − 1\n● ●')
  expect(wrapper.get('.demo-caption').text()).toContain('1 / 3')
  expect(wrapper.text()).toContain('no grading or saved results')
  for (let index = 0; index < 3; index++) {
    await wrapper.findAll('.demo-answers button')[0].trigger('click')
    expect(wrapper.findAll('.correct,.wrong')).toHaveLength(0)
    expect(wrapper.text()).toContain('does not check answers')
    await wrapper.get('.battle-next').trigger('click')
  }
  expect(wrapper.text()).toContain('You explored 3 questions')
  expect(wrapper.text()).toContain('not graded')
  expect(localStorage.length).toBe(0)
  expect(sessionStorage.length).toBe(0)
})
it('reloads a changed topic URL instead of retaining the previous preview', async () => {
  const router = await open('/arena?subject=math&topic=math-1')
  await router.push('/arena?subject=math&topic=math-6')
  await flushPromises()
  expect(wrapper.find('#arena-question').exists()).toBe(false)
  expect(wrapper.text()).toContain('school level')
})
it('shows read failures with retry instead of inventing Science demos', async () => {
  getStudentQuizCatalogue.mockRejectedValueOnce(new Error('permission denied'))
  await open('/subjects?flow=quiz')
  expect(wrapper.get('[role="alert"]').text()).toContain('permission')
  await wrapper.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(wrapper.findAll('.sd-path strong').map((item) => item.text())).toEqual(['Mathematics'])
})

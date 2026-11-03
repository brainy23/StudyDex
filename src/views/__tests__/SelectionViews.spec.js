import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import SubjectsView from '../SubjectsView.vue'
import TopicsView from '../TopicsView.vue'
import StudyModeView from '../StudyModeView.vue'
import { getCurrentProfile } from '../../services/profileService'
import { getStudyCatalogue } from '../../services/studyService'

vi.mock('../../services/profileService', () => ({ getCurrentProfile: vi.fn() }))
vi.mock('../../services/studyService', async () => ({
  ...(await vi.importActual('../../services/studyService')),
  getStudyCatalogue: vi.fn(),
}))

let wrapper
const maths = { id: 'maths', name: 'mathematics' }
const science = { id: 'science', name: 'science' }
const mathTopic = { id: 'math-topic', subject_id: maths.id, name: 'numbers', topic_order: 1 }
const scienceTopic = { id: 'science-topic', subject_id: science.id, name: 'plants', topic_order: 1 }
beforeEach(() => {
  vi.resetAllMocks()
  getCurrentProfile.mockResolvedValue({
    id: 'student',
    school_level_id: 'level-3',
    school_level: { name: 'Primary 3' },
  })
  getStudyCatalogue.mockResolvedValue({
    subjects: [maths, science],
    topics: [mathTopic, scienceTopic],
  })
})
afterEach(() => wrapper?.unmount())

async function open(component, query = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component },
      ...['selection-subjects', 'selection-topics', 'study-mode', 'study-decks', 'quiz-battle'].map(
        (name) => ({
          path: `/${name}`,
          name,
          component: { template: '<div />' },
        }),
      ),
      { path: '/home', component: { template: '<div />' } },
      { path: '/account', component: { template: '<div />' } },
    ],
  })
  await router.push({ path: '/', query })
  await router.isReady()
  wrapper = mount(component, { global: { plugins: [router] } })
  await flushPromises()
  return router
}
function button(label) {
  return wrapper.findAll('button').find((item) => item.text().includes(label))
}

it.each([1, 2, 3, 4, 5, 6])(
  'enables Mathematics using published topics for saved Primary %i',
  async (level) => {
    getCurrentProfile.mockResolvedValue({
      id: 'student',
      school_level_id: `level-${level}`,
      school_level: { name: `Primary ${level}` },
    })
    getStudyCatalogue.mockResolvedValue({ subjects: [maths, science], topics: [mathTopic] })
    const router = await open(SubjectsView)
    expect(getStudyCatalogue).toHaveBeenCalledWith(`level-${level}`)
    expect(button('Mathematics').element.disabled).toBe(false)
    expect(button('Science').element.disabled).toBe(true)
    expect(button('English').element.disabled).toBe(true)
    await button('Mathematics').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('selection-topics')
    expect(router.currentRoute.value.query).toEqual({ subject: 'maths', flow: 'study' })
  },
)

it.each(['study', 'quiz'])(
  'shows only published Mathematics topics in the %s flow',
  async (flow) => {
    const router = await open(TopicsView, { subject: 'maths', flow })
    expect(wrapper.get('h1').text()).toBe('Your Mathematics adventure')
    expect(wrapper.findAll('.sd-topic-card')).toHaveLength(1)
    expect(wrapper.get('.sd-topic-card').text()).toContain('Numbers')
    expect(wrapper.text()).not.toContain('Plants')
    await wrapper.get('.sd-topic-card').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe(flow === 'quiz' ? 'quiz-battle' : 'study-mode')
    expect(router.currentRoute.value.query).toEqual({ subject: 'maths', topic_id: 'math-topic' })
  },
)

it.each([
  ['Learn', 'learn'],
  ['Study', 'flashcards'],
])('opens Mathematics %s using the existing Lab engine', async (label, mode) => {
  const router = await open(StudyModeView, { subject: 'maths', topic_id: 'math-topic' })
  await button(label).trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('study-decks')
  expect(router.currentRoute.value.query).toEqual({
    subject: 'maths',
    topic_id: 'math-topic',
    mode,
  })
})

it('preserves legacy topic links while preferring topic_id', async () => {
  await open(StudyModeView, { subject: 'maths', topic_id: 'math-topic', topic: 'science-topic' })
  expect(button('Learn')).toBeDefined()
  wrapper.unmount()
  await open(StudyModeView, { subject: 'maths', topic: 'math-topic' })
  expect(button('Study')).toBeDefined()
})

it('rejects a topic from another subject instead of showing it as Mathematics', async () => {
  await open(StudyModeView, { subject: 'maths', topic_id: 'science-topic' })
  expect(wrapper.text()).toContain('This topic is unavailable')
  expect(wrapper.findAll('.sd-path')).toHaveLength(0)
})

it('does not substitute another subject when an unknown subject is requested', async () => {
  await open(TopicsView, { subject: 'not-published' })
  expect(wrapper.findAll('.sd-topic-card')).toHaveLength(0)
})

it('does not request a catalogue or invent a school level when the profile level is missing', async () => {
  getCurrentProfile.mockResolvedValue({ id: 'student', school_level_id: null })
  await open(SubjectsView)
  expect(getStudyCatalogue).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('Set your school level')
})

it('shows permission errors in quiz selection without falling back to demo topics', async () => {
  getStudyCatalogue.mockRejectedValue({ code: '42501', message: 'permission denied' })
  await open(TopicsView, { subject: 'maths', flow: 'quiz' })
  expect(wrapper.get('[role="alert"]').text()).toContain('does not have permission')
  expect(wrapper.findAll('.sd-topic-card')).toHaveLength(0)
  getStudyCatalogue.mockResolvedValue({ subjects: [maths], topics: [mathTopic] })
  await button('Try again').trigger('click')
  await flushPromises()
  expect(wrapper.findAll('.sd-topic-card')).toHaveLength(1)
})

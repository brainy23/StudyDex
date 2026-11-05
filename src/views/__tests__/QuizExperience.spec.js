import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import QuizView from '../quizView.vue'
import XpPrompt from '../../components/common/xpPrompt.vue'
import { startQuiz, submitQuiz } from '../../services/quizService'
import { getCurrentProfile } from '../../services/profileService'
import { getStudentStudyCatalogue, getSelectedStudyBuddy } from '../../services/studyService'
import { awardExperience } from '../../services/experienceService'
import { studentProfile, studyCatalogue } from '../../test/studyFixtures'
import { pokemonFetch } from '../../test/pokemonFixtures'
vi.mock('../../../scripts/soundEffect', () => ({ default: vi.fn() }))

vi.mock('../../services/profileService', () => ({ getCurrentProfile: vi.fn() }))
vi.mock('../../services/quizService', () => ({ startQuiz: vi.fn(), submitQuiz: vi.fn() }))
vi.mock('../../services/experienceService', () => ({ awardExperience: vi.fn() }))
vi.mock('../../services/studyService', async original => ({ ...await original(),
  getStudentStudyCatalogue: vi.fn(), getSelectedStudyBuddy: vi.fn(),
}))
vi.mock('../../services/learningService', () => ({ getTopicCompletions: vi.fn(async () => []) }))
const questions = Array.from({ length: 5 }, (_, i) => ({ id: `q${i}`, question_text: `Question ${i + 1}`,
  options: [{ id: `a${i}`, option_text: 'First answer' }, { id: `b${i}`, option_text: 'Second answer' }],
}))
const savedResult = { run_id: 'attempt-1', eventId: 'attempt-1', rewardType: 'quiz',
  correct: 4, total: 5, scorePercent: 80, delta: 40, appliedDelta: 40, xp: 140, level: 1,
  pokemonName: 'Charmander', duplicate: false, review: [] }
let wrapper
beforeEach(() => {
  vi.resetAllMocks()
  sessionStorage.clear()
  getCurrentProfile.mockResolvedValue(structuredClone(studentProfile))
  getStudentStudyCatalogue.mockResolvedValue(structuredClone(studyCatalogue))
  getSelectedStudyBuddy.mockResolvedValue({ id: 'owned', xp: 100, level: 1, pokemon: { name: 'Charmander' } })
  startQuiz.mockResolvedValue({ run_id: 'attempt-1', questions, result: null, attempt_number: 1, attempt_limit: 3 })
  submitQuiz.mockResolvedValue(structuredClone(savedResult))
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ name: 'raichu', sprites: { front_default: '/mentor.png' } }) })))
})
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals() })
async function open(realSprite = false) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/quiz', name: 'quiz-battle', component: QuizView },
    { path: '/home', name: 'home', component: { template: '<div />' } },
    { path: '/topics', name: 'selection-topics', component: { template: '<div />' } },
  ] })
  await router.push('/quiz?subject=maths&topic=topic-1')
  wrapper = mount({ template: '<RouterView />' }, { global: {
    plugins: [router], stubs: { teleport: true, PokeSprite: !realSprite, ClockWeather: true, StudydexBubbleNav: true },
  } })
  await flushPromises()
  return router
}
const button = text => wrapper.findAll('button').find(item => item.text().includes(text))
async function answerAll() {
  for (let i = 0; i < 5; i++) {
    await wrapper.findAll('.demo-answers button')[0].trigger('click')
    await button(i < 4 ? 'Next question' : 'Submit quiz').trigger('click')
  }
}
it('submits the grades once, then shows the XP prompt with score and final saved total', async () => {
  await open()
  await answerAll()
  await flushPromises()
  expect(submitQuiz).toHaveBeenCalledExactlyOnceWith('attempt-1', { q0: 'a0', q1: 'a1', q2: 'a2', q3: 'a3', q4: 'a4' }, studentProfile.id)
  expect(wrapper.findComponent(XpPrompt).props('result')).toMatchObject({ scorePercent: 80, delta: 40, xp: 140 })
  expect(wrapper.get('.quiz-score').text()).toContain('4 / 5 correct')
  expect(wrapper.get('.amount').text()).toContain('+40')
  expect(wrapper.get('.buddy-total').text()).toContain('140')
  expect(awardExperience).not.toHaveBeenCalled()
})
it('shows a pending prompt, blocks double submission, and retries with the same attempt and answers', async () => {
  let reject
  submitQuiz.mockReturnValueOnce(new Promise((_, rejectPromise) => { reject = rejectPromise }))
  await open()
  await answerAll()
  await flushPromises()
  expect(wrapper.get('.xp-close').attributes('disabled')).toBeDefined()
  expect(wrapper.get('.feedback-panel').text()).toContain('Grading your answers')
  expect(submitQuiz).toHaveBeenCalledTimes(1)
  reject(Error('Connection lost'))
  await flushPromises()
  expect(wrapper.get('.error-panel').text()).toContain('Connection lost')
  submitQuiz.mockResolvedValueOnce({ ...savedResult, duplicate: true })
  await button('Retry saving').trigger('click')
  await flushPromises()
  expect(submitQuiz).toHaveBeenCalledTimes(2)
  expect(submitQuiz.mock.calls[1]).toEqual(submitQuiz.mock.calls[0])
  expect(wrapper.get('.reward-label').text()).toBe('ALREADY RECORDED')
  expect(awardExperience).not.toHaveBeenCalled()
})
it('reopens a saved reward and restores a completed attempt without awarding again', async () => {
  startQuiz.mockResolvedValueOnce({ run_id: 'attempt-1', questions, result: savedResult })
  await open()
  expect(wrapper.find('.quiz-score').exists()).toBe(false)
  await button('View XP reward').trigger('click')
  expect(wrapper.get('.amount').text()).toContain('+40')
  expect(wrapper.get('.reward-label').text()).toBe('ALREADY RECORDED')
  expect(submitQuiz).not.toHaveBeenCalled()
  expect(awardExperience).not.toHaveBeenCalled()
})
it('displays applied XP separately when a saved reward hits the buddy XP cap', async () => {
  submitQuiz.mockResolvedValueOnce({ ...savedResult, appliedDelta: 5, xp: 250 })
  await open()
  await answerAll()
  await flushPromises()
  expect(wrapper.text()).toContain('40 XP earned. 5 XP applied')
  expect(wrapper.get('.buddy-total').text()).toContain('250')
})
it('discards a late submission response after the quiz topic changes', async () => {
  let resolve
  submitQuiz.mockReturnValueOnce(new Promise(resolvePromise => { resolve = resolvePromise }))
  const router = await open()
  await answerAll()
  await router.push('/quiz?subject=maths&topic=not-available')
  await flushPromises()
  resolve(savedResult)
  await flushPromises()
  expect(wrapper.findComponent(XpPrompt).props('result')).toBeNull()
  expect(wrapper.text()).toContain('school level')
})

it('plays the saved Vue evolution plan in the front-facing quiz prompt', async () => {
  vi.useFakeTimers()
  try {
    submitQuiz.mockResolvedValueOnce({ ...savedResult, delta: 50, xp: 40, level: 2,
      pokemonName: 'Charmeleon', evolved: true,
      originalPokemon: { name: 'Charmander', xp: 190, level: 1 },
      pokemon: { name: 'Charmeleon', xp: 40, level: 2 },
      evolutions: [{ from: 'charmander', to: 'charmeleon', direction: 'evolve' }],
    })
    fetch.mockImplementation(url => /charmander|charmeleon|evolution-chain/.test(String(url))
      ? pokemonFetch(url)
      : Promise.resolve({ ok: true, json: async () => ({ name: 'raichu', sprites: { front_default: '/mentor.png' } }) }))
    await open(true)
    await answerAll()
    await flushPromises()
    expect(wrapper.get('.evolution-preview .buddy-sprite').attributes('src')).toContain('charmander-front')
    await vi.advanceTimersByTimeAsync(1800)
    await flushPromises()
    expect(wrapper.get('.evolution-preview .buddy-sprite').attributes('src')).toContain('charmeleon-front')
    expect(wrapper.text()).toContain('Charmeleon evolved!')
    expect(awardExperience).not.toHaveBeenCalled()
  } finally { vi.useRealTimers() }
})

it('keeps answers editable and restores selections when moving backwards and forwards', async () => {
  await open()
  const choose = index => wrapper.findAll('.demo-answers button')[index].trigger('click')
  await choose(0)
  await choose(1)
  expect(wrapper.findAll('.demo-answers button')[1].attributes('aria-pressed')).toBe('true')
  await button('Next question').trigger('click')
  await choose(1)
  await button('Previous question').trigger('click')
  expect(wrapper.get('#arena-question').text()).toBe('Question 1')
  expect(wrapper.findAll('.demo-answers button')[1].attributes('aria-pressed')).toBe('true')
  await choose(0)
  await button('Next question').trigger('click')
  expect(wrapper.findAll('.demo-answers button')[1].attributes('aria-pressed')).toBe('true')
  await button('Next question').trigger('click')
  await choose(0)
  await button('Next question').trigger('click')
  await choose(1)
  await button('Next question').trigger('click')
  await choose(0)
  await button('Previous question').trigger('click')
  expect(wrapper.findAll('.demo-answers button')[1].attributes('aria-pressed')).toBe('true')
  await choose(0)
  await button('Next question').trigger('click')
  expect(submitQuiz).not.toHaveBeenCalled()
  await button('Submit quiz').trigger('click')
  await flushPromises()
  expect(submitQuiz).toHaveBeenCalledExactlyOnceWith('attempt-1', {
    q0: 'a0', q1: 'b1', q2: 'a2', q3: 'a3', q4: 'a4',
  }, studentProfile.id)
})

it('allows skipping questions but prevents final submission until every question is answered', async () => {
  await open()
  expect(button('Previous question').attributes('disabled')).toBeDefined()
  for (let i = 0; i < 4; i++) await button('Next question').trigger('click')
  expect(wrapper.get('#arena-question').text()).toBe('Question 5')
  expect(button('Submit quiz').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('5 questions still need an answer')
  await button('Go to first unanswered').trigger('click')
  expect(wrapper.get('#arena-question').text()).toBe('Question 1')
  expect(submitQuiz).not.toHaveBeenCalled()
})

it('returns Continue to quiz topics with the same subject selected', async () => {
  const router = await open()
  await answerAll()
  await flushPromises()
  await wrapper.get('.xp-prompt .action-button').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('selection-topics')
  expect(router.currentRoute.value.query).toEqual({ flow: 'quiz', subject: 'maths' })
  expect(submitQuiz).toHaveBeenCalledTimes(1)
})

it('only dismisses the XP popup when its close button is clicked', async () => {
  const router = await open()
  await answerAll()
  await flushPromises()
  await wrapper.get('.xp-close').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('quiz-battle')
  expect(wrapper.findComponent(XpPrompt).props('result')).toBeNull()
})

it('keeps a return button and reports a cancelled topic navigation', async () => {
  const router = await open()
  router.beforeEach(to => to.name === 'selection-topics' ? false : true)
  await answerAll()
  await flushPromises()
  await wrapper.get('.xp-prompt .action-button').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('quiz-battle')
  expect(wrapper.text()).toContain('Could not return to topics')
  expect(button('Choose topic')).toBeDefined()
})

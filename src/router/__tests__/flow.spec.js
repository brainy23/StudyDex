import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createAppRouter } from '../index'
import App from '../../App.vue'
import axios from 'axios'
import { studentProfile, studyCatalogue, studyLesson } from '../../test/studyFixtures'
import { getCurrentProfile } from '../../services/profileService'
import { useTimer } from '../../components/timer/useTimer'
import { getStudyCatalogue, getTopicLesson, getStudyQuestions } from '../../services/studyService'
import { useTopicCompletion } from '../../composables/useTopicCompletion'
import { useArenaTransition } from '../../composables/useArenaTransition'

const { getSession, signInWithPassword, getUser, signOut } = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({
  getSupabase: () => ({ auth: { getSession, signInWithPassword, getUser, signOut } }),
}))
vi.mock('../../services/profileService', () => ({
  getCurrentProfile: vi.fn(async () => structuredClone(studentProfile)),
}))
// Use deterministic API responses; the weather flow still runs without network access.
vi.mock('vue3-apexcharts', () => ({
  default: { name: 'VueApexCharts', template: '<div class="test-chart" />' },
}))
vi.mock('axios', () => ({
  default: {
    get: vi.fn(async (url) => {
      if (url.includes('api.open-meteo.com')) {
        return { data: { current: { temperature_2m: 29, weather_code: 0, cloud_cover: 10, is_day: 1 } } }
      }
      if (url.includes('api-open.data.gov.sg')) {
        return { data: { data: { stations: [], readings: [] } } }
      }
      return { data: { sprites: { default: '/test-pokeball.png' } } }
    }),
  },
}))
vi.mock('../../services/studyService', async () => ({
  ...(await vi.importActual('../../services/studyService')),
  getStudyCatalogue: vi.fn(async () => structuredClone(studyCatalogue)),
  getTopicLesson: vi.fn(async () => structuredClone(studyLesson)),
  getTopicFlashcards: vi.fn(async () => []),
  getStudyQuestions: vi.fn(async () => []),
  getSelectedStudyBuddy: vi.fn(async () => null),
}))

let wrapper
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ sprites: { front_default: '/test-pikachu.png' } }),
    })),
  )
  window.location.hash = ''
  getSession.mockResolvedValue({ data: { session: null }, error: null })
})
afterEach(() => {
  useArenaTransition().cancel()
  useTimer().endSession()
  wrapper?.unmount()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function open(path) {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return router
}

function mockGeolocation(implementation) {
  const getCurrentPosition = vi.fn(implementation)
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  return getCurrentPosition
}

it('keeps the tutorial protected even when the old development bypass flag is set', async () => {
  vi.stubEnv('VITE_SKIP_AUTH', 'true')
  try {
    const router = await open('/tutorial')
    expect(router.currentRoute.value.name).toBe('login')
    expect(wrapper.find('.tutorial').exists()).toBe(false)
  } finally { vi.unstubAllEnvs() }
})

it.each([
  ['Study', '/subjects'], ['Quiz', '/subjects'], ['Bag', '/trainer'],
])('connects the Town %s navigation button to %s', async (label, destination) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 2, 12))
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const router = await open('/home')
  const nav = wrapper.findAll('.sd-navbar .sd-nav-button').find(button => button.find('.sd-nav-label').text() === label)
  expect(nav.attributes('disabled')).toBeUndefined()
  await nav.trigger('click')
  await vi.dynamicImportSettled()
  await flushPromises()
  expect(router.currentRoute.value.path).toBe(destination)
})

async function returnToTown(router) {
  await router.push('/quiz')
  await flushPromises()
  await router.push('/home')
  await flushPromises()
}

function expectWeatherLocation(latitude, longitude) {
  expect(axios.get).toHaveBeenCalledWith(
    'https://api.open-meteo.com/v1/forecast',
    expect.objectContaining({ params: expect.objectContaining({ latitude, longitude }) }),
  )
}

it('remembers Not Now when returning to Town without requesting device location', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const getCurrentPosition = mockGeolocation()
  const router = await open('/home')
  expect(wrapper.get('dialog.location-dialog').element.open).toBe(true)
  await wrapper.get('.location-skip').trigger('click')
  await flushPromises()
  expectWeatherLocation(1.3521, 103.8198)
  axios.get.mockClear()
  await returnToTown(router)
  expect(wrapper.get('dialog.location-dialog').element.open).toBe(false)
  expect(getCurrentPosition).not.toHaveBeenCalled()
  expectWeatherLocation(1.3521, 103.8198)
})

it('reuses device coordinates on return without another geolocation request', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const getCurrentPosition = mockGeolocation((success) => {
    success({ coords: { latitude: 1.3, longitude: 103.8 } })
  })
  const router = await open('/home')
  await wrapper.get('.location-allow').trigger('click')
  await flushPromises()
  expectWeatherLocation(1.3, 103.8)
  axios.get.mockClear()
  await returnToTown(router)
  expect(wrapper.get('dialog.location-dialog').element.open).toBe(false)
  expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  expectWeatherLocation(1.3, 103.8)
})

it.each([
  ['denied', (_success, failure) => failure({ code: 1 })],
  ['unavailable', (_success, failure) => failure({ code: 2 })],
  ['timed out', (_success, failure) => failure({ code: 3 })],
  ['blocked synchronously', () => { throw new Error('Location blocked') }],
])('keeps Singapore weather after device location is %s, without asking again', async (_label, implementation) => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const getCurrentPosition = mockGeolocation(implementation)
  const router = await open('/home')
  await wrapper.get('.location-allow').trigger('click')
  await flushPromises()
  expectWeatherLocation(1.3521, 103.8198)
  axios.get.mockClear()
  await returnToTown(router)
  expect(wrapper.get('dialog.location-dialog').element.open).toBe(false)
  expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  expectWeatherLocation(1.3521, 103.8198)
})

it('uses Singapore when the browser has no geolocation support', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  vi.stubGlobal('navigator', {})
  const router = await open('/home')
  await wrapper.get('.location-allow').trigger('click')
  await flushPromises()
  await returnToTown(router)
  expect(wrapper.get('dialog.location-dialog').element.open).toBe(false)
  expectWeatherLocation(1.3521, 103.8198)
})

it('shares an unfinished location request across Town visits and starts weather only on the active page', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  let finishLocation
  const getCurrentPosition = mockGeolocation((success) => { finishLocation = success })
  const router = await open('/home')
  await wrapper.get('.location-allow').trigger('click')
  await returnToTown(router)
  expect(wrapper.get('dialog.location-dialog').element.open).toBe(false)
  expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  axios.get.mockClear()
  finishLocation({ coords: { latitude: 1.3, longitude: 103.8 } })
  await flushPromises()
  expectWeatherLocation(1.3, 103.8)
  expect(axios.get.mock.calls.filter(([url]) => url.includes('api.open-meteo.com'))).toHaveLength(1)
})

it('asks again in a fresh app instance, as it would after a page reload', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const getCurrentPosition = mockGeolocation()
  await open('/home')
  await wrapper.get('.location-skip').trigger('click')
  await flushPromises()
  wrapper.unmount()
  axios.get.mockClear()
  await open('/home')
  expect(wrapper.get('dialog.location-dialog').element.open).toBe(true)
  expect(getCurrentPosition).not.toHaveBeenCalled()
  expect(axios.get.mock.calls.some(([url]) => url.includes('api.open-meteo.com'))).toBe(false)
})

it('starts at landing-info, logs in to landing, and waits for Start before opening home', async () => {
  const router = await open('/')
  expect(router.currentRoute.value.name).toBe('landing-info')
  await wrapper.get('a[href="/login"]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('login')
  await wrapper.get('#username-input').setValue(' ash@example.com ')
  await wrapper.get('#password-input').setValue('Password123')
  signInWithPassword.mockImplementation(async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
    return { data: { session: { access_token: 'test' } }, error: null }
  })
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(signInWithPassword).toHaveBeenCalledWith({
    email: 'ash@example.com',
    password: 'Password123',
  })
  expect(router.currentRoute.value.name).toBe('landing')
  expect(wrapper.text()).toContain('Welcome, Ash!')
  expect(wrapper.text()).toContain('Primary 3')
  await wrapper.get('a.enter-btn').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/home')
  expect(wrapper.find('.world-page').exists()).toBe(true)
  expect(wrapper.get('.trainer-name').text()).toBe('Ash')
  expect(wrapper.get('.trainer-avatar').attributes('src')).toBe('/avatars/female.png')
})

it('keeps failed logins on the login page with feedback', async () => {
  const router = await open('/login')
  signInWithPassword.mockResolvedValue({
    data: { session: null },
    error: new Error('Invalid login credentials'),
  })
  await wrapper.get('#username-input').setValue('ash@example.com')
  await wrapper.get('#password-input').setValue('wrong-password')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('login')
  expect(wrapper.get('[role="alert"]').text()).toBe('Invalid login credentials')
})

it.each(['/landing', '/home', '/account', '/study-decks', '/trainer', '/dashboard', '/quiz'])(
  'sends visitors without a session from %s to login',
  async (path) => {
    const router = await open(path)
    expect(router.currentRoute.value.name).toBe('login')
  },
)

it('returns a confirmed signup to landing', async () => {
  window.location.hash = '#access_token=test&type=signup'
  getUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null })
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const router = await open('/register')
  expect(router.currentRoute.value.name).toBe('landing')
})

it('opens signup from landing-info and keeps the registration alias working', async () => {
  const router = await open('/')
  await wrapper.get('a[href="/signup"]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('register')
  expect(wrapper.find('#email-input').exists()).toBe(true)
  await router.push('/register')
  expect(router.currentRoute.value.name).toBe('register')
})

it('logs out from the town menu and blocks protected pages afterward', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  signOut.mockImplementation(async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    return { error: null }
  })
  const router = await open('/home')
  await wrapper.get('.trainer-profile-trigger').trigger('click')
  await wrapper.get('.trainer-logout').trigger('click')
  await flushPromises()
  expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  expect(router.currentRoute.value.name).toBe('login')
  for (const path of ['/home', '/account', '/landing', '/study-decks', '/trainer', '/dashboard', '/quiz']) {
    await router.push(path)
    expect(router.currentRoute.value.name).toBe('login')
  }
})

it('keeps a single Edit Profile action and opens the existing Account Settings page', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const router = await open('/home')
  await wrapper.get('.trainer-profile-trigger').trigger('click')
  const actions = wrapper.findAll('.trainer-dropdown button')
  expect(actions.filter((button) => button.text().includes('Edit Profile'))).toHaveLength(1)
  expect(actions.some((button) => /Edit name|Change avatar/.test(button.text()))).toBe(false)
  await actions.find((button) => button.text().includes('Edit Profile')).trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('account')
})

it('supports the saved Prefer not to say avatar without requesting a missing local image', async () => {
  getCurrentProfile.mockResolvedValueOnce({ ...studentProfile, avatar_choice: 'prefer_not_to_say' })
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  await open('/home')
  expect(wrapper.get('.trainer-avatar').attributes('src')).toContain('/pokemon/132.png')
})

it('refreshes Town’s profile avatar when returning from another tab', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  await open('/home')
  expect(wrapper.get('.trainer-avatar').attributes('src')).toBe('/avatars/female.png')
  getCurrentProfile.mockResolvedValueOnce({ ...studentProfile, avatar_choice: 'male' })
  window.dispatchEvent(new Event('focus'))
  await flushPromises()
  expect(wrapper.get('.trainer-avatar').attributes('src')).toBe('/avatars/male.png')
  wrapper.unmount()
  getCurrentProfile.mockClear()
  window.dispatchEvent(new Event('focus'))
  await flushPromises()
  expect(getCurrentProfile).not.toHaveBeenCalled()
  wrapper = null
})

it('keeps the new Trainer House and dashboard reachable behind login', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const router = await open('/home')
  const trainer = wrapper
    .findAll('.building-button')
    .find((button) => button.text().includes('Trainer House'))
  await trainer.trigger('click')
  await vi.dynamicImportSettled()
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/trainer')
  expect(wrapper.find('.trainer-page').exists()).toBe(true)
  await router.push('/home')
  await flushPromises()
  await wrapper.get('.trainer-profile-trigger').trigger('click')
  await wrapper
    .findAll('.trainer-dropdown button')
    .find((button) => button.text().includes('My Progress'))
    .trigger('click')
  await vi.dynamicImportSettled()
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/dashboard')
  expect(wrapper.find('.student-dashboard').exists()).toBe(true)
  expect(wrapper.get('.welcome-title h1').text()).toBe('Hello, Ash!')
  expect(wrapper.text()).toContain('Sample progress preview')
})

it('keeps a failed logout on home and allows retrying without duplicate requests', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  let finishLogout
  signOut.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishLogout = resolve
      }),
  )
  const router = await open('/home')
  await wrapper.get('.trainer-profile-trigger').trigger('click')
  await wrapper.get('.trainer-logout').trigger('click')
  expect(wrapper.get('.trainer-logout').attributes('disabled')).toBeDefined()
  expect(wrapper.get('.trainer-logout').text()).toContain('Logging out…')
  expect(signOut).toHaveBeenCalledTimes(1)
  finishLogout({ error: new Error('Network unavailable') })
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('home')
  expect(wrapper.get('.trainer-notice').text()).toContain('We couldn’t log you out')
  signOut.mockImplementationOnce(async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    return { error: null }
  })
  await wrapper.get('.trainer-profile-trigger').trigger('click')
  await wrapper.get('.trainer-logout').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('login')
})


async function chooseMathTopic(flow = 'study') {
  await vi.dynamicImportSettled()
  await flushPromises()
  await wrapper.findAll('.sd-path').find(button => button.text().includes('Mathematics')).trigger('click')
  await vi.dynamicImportSettled()
  await flushPromises()
  await wrapper.get('.sd-topic-card').trigger('click')
  await vi.dynamicImportSettled()
  await flushPromises()
  if (flow === 'study') {
    await wrapper.findAll('.sd-path').find(button => button.get('strong').text() === 'Learn').trigger('click')
    await flushPromises()
  }
}

it('opens profile-level lessons from Poké Lab and supports learning mode navigation', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const router = await open('/home')
  const lab = wrapper
    .findAll('.building-button')
    .find((button) => button.text().includes('Poké Lab'))
  await lab.trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/subjects')
  await chooseMathTopic()
  expect(router.currentRoute.value.path).toBe('/study-decks')
  expect(wrapper.get('.study-overview h2').text()).toBe('Test Topic')
  expect(getStudyCatalogue).toHaveBeenCalledWith('level-3')
  const revision = wrapper
    .findAll('.study-mode-nav button')
    .find((button) => button.text() === 'Flashcards')
  await revision.trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query.mode).toBe('flashcards')
  expect(wrapper.text()).toContain('There are no flashcards for this topic yet')
})

it('keeps Poké Arena separate from the Poké Lab study screen', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const router = await open('/home')
  const arena = wrapper
    .findAll('.building-button')
    .find((button) => button.text().includes('Poké Arena'))
  await arena.trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/subjects')
  await chooseMathTopic('quiz')
  expect(router.currentRoute.value.path).toBe('/quiz-battle')
  expect(wrapper.find('.designed-arena').exists()).toBe(true)
  expect(wrapper.find('.study-screen').exists()).toBe(false)
  expect(wrapper.find('.card-front').exists()).toBe(false)

  await wrapper.get('a[href="/home"]').trigger('click')
  await flushPromises()
  const lab = wrapper
    .findAll('.building-button')
    .find((button) => button.text().includes('Poké Lab'))
  await lab.trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/subjects')
  await chooseMathTopic()
  expect(router.currentRoute.value.path).toBe('/study-decks')
  expect(wrapper.get('.study-overview h2').text()).toBe('Test Topic')
})

it('keeps Poké Lab and Arena available when the buddy is sleeping at night', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 24, 1, 0))
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const router = await open('/home')
  expect(wrapper.find('.buddy-zzz').exists()).toBe(true)
  for (const title of ['Poké Lab', 'Poké Arena']) {
    const building = wrapper
      .findAll('.building-button')
      .find((button) => button.text().includes(title))
    expect(building.attributes('disabled')).toBeUndefined()
  }
  const lab = wrapper
    .findAll('.building-button')
    .find((button) => button.text().includes('Poké Lab'))
  await lab.trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/subjects')
  expect(router.currentRoute.value.query.flow).toBe('study')
})

it.each(['/quiz', '/study-decks', '/trainer', '/account', '/dashboard', '/rewards'])(
  'returns directly from %s to Town with the shared home link',
  async (path) => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
    const router = await open(path)
    await vi.dynamicImportSettled()
    await flushPromises()
    const home = wrapper.get('a[href="/home"]')
    expect(home.attributes('href')).toBe('/home')
    await home.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/home')
    expect(wrapper.find('.world-page').exists()).toBe(true)
  },
)

it('pauses the running study timer when returning to Town with the shared link', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const router = await open('/study-decks?topic_id=topic-1')
  await wrapper.findAll('button').find((button) => button.text() === 'Start Study Session').trigger('click')
  expect(useTimer().state.status).toBe('running')
  await wrapper.get('a[href="/home"]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/home')
  expect(useTimer().state.status).toBe('paused')
})

it('keeps Town behind login when a signed-out visitor follows the shared link', async () => {
  const router = await open('/rewards')
  await wrapper.get('a[href="/home"]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('login')
  expect(wrapper.find('.world-page').exists()).toBe(false)
})

it('uses Go to Poké Arena for a covered topic and pauses the Lab timer on the way to Arena', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const completion = useTopicCompletion()
  completion.bindStudent(studentProfile.id, studentProfile.school_level_id)
  completion.markComplete('topic-1')
  const router = await open('/study-decks?topic_id=topic-1')
  expect(getStudyQuestions).not.toHaveBeenCalled()
  await wrapper.findAll('button').find((button) => button.text() === 'Start Study Session').trigger('click')
  await wrapper.findAll('button').find((button) => button.text() === 'Go to Poké Arena').trigger('click')
  expect(useArenaTransition().state.active).toBe(true)
  expect(useTimer().state.status).toBe('paused')
  expect(router.currentRoute.value.name).toBe('study-decks')
  await useArenaTransition().skip()
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('quiz')
  expect(router.currentRoute.value.query).toMatchObject({ subject: 'maths', topic_id: 'topic-1' })
  expect(useTimer().state.status).toBe('paused')
  expect(getStudyQuestions).toHaveBeenCalledWith('topic-1', 'quiz')
  await wrapper.get('a[href^="/study-decks"]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query).toMatchObject({ subject: 'maths', topic_id: 'topic-1', mode: 'flashcards' })
  expect(wrapper.find('.study-flashcards').exists()).toBe(true)
  expect(useTimer().state.status).toBe('paused')
})

it.each([
  ['mode=quiz', [['topic-1', 'quiz']]],
  ['mode=quiz&battle=boss', [['topic-1', 'boss_battle']]],
  ['mode=boss_battle', [['topic-1', 'boss_battle']]],
])('redirects the old Lab assessment URL %s into Arena', async (query, expectedQuestionCalls) => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null })
  const router = await open(`/study-decks?subject=maths&topic=topic-1&${query}`)
  expect(router.currentRoute.value.name).toBe('quiz')
  expect(router.currentRoute.value.query).toMatchObject({ subject: 'maths', topic_id: 'topic-1' })
  expect(getTopicLesson).not.toHaveBeenCalled()
  expect(getStudyQuestions.mock.calls).toEqual(expectedQuestionCalls)
  expect(wrapper.find('.study-question').exists()).toBe(false)
  expect(wrapper.find('.study-screen').exists()).toBe(false)
})

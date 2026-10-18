import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createAppRouter } from '../index'
import App from '../../App.vue'

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
  getCurrentProfile: vi.fn(async () => ({
    display_name: 'Ash',
    avatar_choice: 'female',
    school_level: { name: 'Primary 3' },
  })),
}))

let wrapper
beforeEach(() => {
  vi.resetAllMocks()
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
  wrapper?.unmount()
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
  expect(wrapper.get('.trainer-avatar').attributes('src')).toBe('/assets/female.png')
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

it.each(['/landing', '/home', '/account'])(
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
  for (const path of ['/home', '/account', '/landing']) {
    await router.push(path)
    expect(router.currentRoute.value.name).toBe('login')
  }
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

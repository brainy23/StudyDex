import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Landing from '../../components/landing/landing.vue'
import AvatarRoom from '../../components/characterdesign/characterdesign.vue'
import Starter from '../starterSelectionView.vue'
import {
  getOnboardingStatus,
  saveOnboardingAvatar,
  claimOnboardingStarter,
  onboardingDestination,
} from '../../services/onboardingService'

let saved
let accountCallback
const unsubscribe = vi.fn()
vi.mock('../../services/onboardingService', () => ({
  getOnboardingStatus: vi.fn(async () => structuredClone(saved)),
  saveOnboardingAvatar: vi.fn(async (choice) => {
    saved = {
      ...saved,
      avatar_choice: choice,
      avatar_confirmed: true,
      next_step: saved.starter_claimed ? 'town' : 'starter',
      onboarding_complete: saved.starter_claimed,
    }
    return structuredClone(saved)
  }),
  claimOnboardingStarter: vi.fn(async () => {
    saved = { ...saved, starter_claimed: true, onboarding_complete: true, next_step: 'town' }
    return structuredClone(saved)
  }),
  onboardingDestination: vi.fn((state, { tutorial = false } = {}) => ({
    name: {
      avatar: 'characterdesign',
      starter: 'starter',
      account: 'account',
      town: tutorial ? 'tutorial' : 'home',
    }[state.next_step],
  })),
  watchOnboardingAccount: (callback) => {
    accountCallback = callback
    return unsubscribe
  },
}))
vi.mock('../../services/profileService', () => ({
  getCurrentProfile: vi.fn(async () => ({
    id: saved.user_id,
    display_name: 'Fixture',
    school_level: { name: 'Primary 1' },
    avatar_choice: saved.avatar_choice,
  })),
}))
let wrapper
beforeEach(() => {
  vi.clearAllMocks()
  saved = {
    user_id: 'student-a',
    avatar_choice: 'prefer_not_to_say',
    school_level_id: 'level-1',
    avatar_confirmed: false,
    starter_claimed: false,
    onboarding_complete: false,
    next_step: 'avatar',
  }
  localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: false })),
  )
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
async function open(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/landing', name: 'landing', component: Landing },
      { path: '/characterdesign', name: 'characterdesign', component: AvatarRoom },
      { path: '/starter', name: 'starter', component: Starter },
      ...['home', 'tutorial', 'account', 'login'].map((name) => ({
        path: `/${name}`,
        name,
        component: { template: `<h1>${name}</h1>` },
      })),
    ],
  })
  await router.push(path)
  await router.isReady()
  wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  await flushPromises()
  return router
}
it('shows only the journey button until persisted onboarding is complete', async () => {
  const router = await open('/landing')
  expect(wrapper.findAll('.enter-btn').map((x) => x.text())).toEqual(['Start your journey'])
  await wrapper.get('.enter-btn').trigger('click')
  await vi.dynamicImportSettled()
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('characterdesign')
  expect(wrapper.findAll('.pick')).toHaveLength(10)
})
it('shows Start only for completed accounts and enters Town', async () => {
  saved = {
    ...saved,
    avatar_choice: 'male-1',
    avatar_confirmed: true,
    starter_claimed: true,
    onboarding_complete: true,
    next_step: 'town',
  }
  const router = await open('/landing')
  expect(wrapper.findAll('.enter-btn').map((x) => x.text())).toEqual(['Start'])
  await wrapper.get('.enter-btn').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('home')
})
it('keeps the chosen style on failed save and advances only after a successful retry', async () => {
  const router = await open('/characterdesign')
  await wrapper.get('[aria-label="Scholar boy"]').trigger('click')
  saveOnboardingAvatar.mockRejectedValueOnce(new Error('Fixture save failure'))
  await wrapper.get('.start-btn').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('characterdesign')
  expect(wrapper.get('[role="alert"]').text()).toContain('Fixture save failure')
  expect(wrapper.get('[aria-label="Scholar boy"]').attributes('aria-pressed')).toBe('true')
  expect(localStorage.getItem('studydex-trainer-profile')).toBeNull()
  await wrapper.get('.start-btn').trigger('click')
  await flushPromises()
  expect(saveOnboardingAvatar).toHaveBeenLastCalledWith('male-3', { expectedUserId: 'student-a' })
  expect(router.currentRoute.value.name).toBe('starter')
})
it('keeps an existing starter and proceeds from the avatar save to the tutorial', async () => {
  saved.starter_claimed = true
  const router = await open('/characterdesign')
  await wrapper.get('.start-btn').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('tutorial')
  expect(claimOnboardingStarter).not.toHaveBeenCalled()
})
it('resumes partial setup at Starter and confirms a numeric starter ID once', async () => {
  saved = { ...saved, avatar_choice: 'female-2', avatar_confirmed: true, next_step: 'starter' }
  const router = await open('/landing')
  await wrapper.get('.enter-btn').trigger('click')
  await flushPromises()
  await wrapper
    .findAll('.starter')
    .find((x) => x.text() === 'charmander')
    .trigger('click')
  let finish
  claimOnboardingStarter.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  await wrapper.get('.confirm-button').trigger('click')
  await wrapper.get('.confirm-button').trigger('click')
  expect(claimOnboardingStarter).toHaveBeenCalledTimes(1)
  expect(claimOnboardingStarter).toHaveBeenCalledWith(4, { expectedUserId: 'student-a' })
  saved = { ...saved, starter_claimed: true, onboarding_complete: true, next_step: 'town' }
  finish(structuredClone(saved))
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('tutorial')
})
it('recovers a starter saved before a lost response without making another claim', async () => {
  saved = { ...saved, avatar_confirmed: true, next_step: 'starter' }
  const router = await open('/starter')
  await wrapper.findAll('.starter')[0].trigger('click')
  claimOnboardingStarter.mockImplementationOnce(async () => {
    saved = { ...saved, starter_claimed: true, onboarding_complete: true, next_step: 'town' }
    throw new Error('Fixture dropped response')
  })
  await wrapper.get('.confirm-button').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('starter')
  await wrapper.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('tutorial')
  expect(claimOnboardingStarter).toHaveBeenCalledTimes(1)
})
it('returns an already-complete starter page to Landing without claiming again', async () => {
  saved = {
    ...saved,
    avatar_confirmed: true,
    starter_claimed: true,
    onboarding_complete: true,
    next_step: 'town',
  }
  const router = await open('/starter')
  expect(router.currentRoute.value.name).toBe('landing')
  expect(claimOnboardingStarter).not.toHaveBeenCalled()
})
it('shows retry and no entry button when setup cannot be verified', async () => {
  getOnboardingStatus.mockRejectedValueOnce(new Error('Fixture backend unavailable'))
  await open('/landing')
  expect(wrapper.findAll('a.enter-btn')).toHaveLength(0)
  expect(wrapper.get('[role="alert"]').text()).toContain('Fixture backend unavailable')
  await wrapper.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(wrapper.get('a.enter-btn').text()).toBe('Start your journey')
})
it('drops the previous account state before accepting a new account on Landing', async () => {
  await open('/landing')
  vi.useFakeTimers()
  saved = { ...saved, user_id: 'student-b' }
  accountCallback('student-b')
  await wrapper.vm.$nextTick()
  expect(wrapper.find('a.enter-btn').exists()).toBe(false)
  await vi.runOnlyPendingTimersAsync()
  await flushPromises()
  expect(wrapper.get('a.enter-btn').text()).toBe('Start your journey')
  expect(onboardingDestination).toHaveBeenLastCalledWith(
    expect.objectContaining({ user_id: 'student-b' }),
  )
})

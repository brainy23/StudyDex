import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import AccountView from '../AccountView.vue'

const {
  getAccountSettings,
  getCurrentEmailSettings,
  getSchoolLevels,
  requestEmailChange,
  resendEmailChange,
  updateCurrentProfile,
} = vi.hoisted(() => ({
  getAccountSettings: vi.fn(),
  getCurrentEmailSettings: vi.fn(),
  getSchoolLevels: vi.fn(),
  requestEmailChange: vi.fn(),
  resendEmailChange: vi.fn(),
  updateCurrentProfile: vi.fn(),
}))
vi.mock('../../services/accountService', () => ({
  getAccountSettings,
  getCurrentEmailSettings,
  getSchoolLevels,
  requestEmailChange,
  resendEmailChange,
  updateCurrentProfile,
}))

let wrapper
beforeEach(() => {
  vi.resetAllMocks()
  getAccountSettings.mockResolvedValue({
    profile: { display_name: 'Ash', school_level_id: 'level-1', avatar_choice: 'male' },
    email: 'old@example.com',
    pendingEmail: 'new@example.com',
  })
  getSchoolLevels.mockResolvedValue([{ id: 'level-1', name: 'Primary 1' }])
})
afterEach(() => wrapper?.unmount())

async function openAccount() {
  wrapper = mount(AccountView, { global: { stubs: { RouterLink: true } } })
  await flushPromises()
}

it('shows the current and pending email separately', async () => {
  await openAccount()
  expect(wrapper.get('[data-testid="current-email"]').text()).toBe('old@example.com')
  expect(wrapper.get('.pending').text()).toContain('new@example.com')
  expect(wrapper.get('.pending').text()).toContain('Keep using old@example.com')
})

it('refreshes email confirmation on return without discarding profile edits', async () => {
  await openAccount()
  await wrapper.get('#display-name').setValue('Unsaved name')
  getCurrentEmailSettings.mockResolvedValue({ email: 'new@example.com', pendingEmail: '' })
  window.dispatchEvent(new Event('focus'))
  await flushPromises()
  expect(wrapper.get('[data-testid="current-email"]').text()).toBe('new@example.com')
  expect(wrapper.find('.pending').exists()).toBe(false)
  expect(wrapper.text()).toContain('Your sign-in email has been updated.')
  expect(wrapper.get('#display-name').element.value).toBe('Unsaved name')
  expect(wrapper.get('#new-email').element.value).toBe('new@example.com')
})

it('preserves a newly typed email while refreshing the confirmed account email', async () => {
  await openAccount()
  await wrapper.get('#new-email').setValue('another@example.com')
  getCurrentEmailSettings.mockResolvedValue({ email: 'new@example.com', pendingEmail: '' })
  window.dispatchEvent(new Event('focus'))
  await flushPromises()
  expect(wrapper.get('#new-email').element.value).toBe('another@example.com')
})

it('allows only one resend at a time and reports an unsuccessful resend', async () => {
  let finishResend
  resendEmailChange.mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        finishResend = reject
      }),
  )
  await openAccount()
  const button = wrapper
    .findAll('button')
    .find((item) => item.text() === 'Resend confirmation emails')
  await button.trigger('click')
  expect(button.attributes('disabled')).toBeDefined()
  expect(resendEmailChange).toHaveBeenCalledTimes(1)
  finishResend(new Error('Email rate limit exceeded'))
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toBe('Email rate limit exceeded')
  expect(button.attributes('disabled')).toBeUndefined()
})

it('removes its focus listener when leaving account settings', async () => {
  await openAccount()
  wrapper.unmount()
  wrapper = null
  window.dispatchEvent(new Event('focus'))
  await flushPromises()
  expect(getCurrentEmailSettings).not.toHaveBeenCalled()
})

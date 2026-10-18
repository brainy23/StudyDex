import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import RegisterView from '../RegisterView.vue'

const { registerUser, replace, getUser } = vi.hoisted(() => ({
  registerUser: vi.fn(),
  replace: vi.fn(),
  getUser: vi.fn(),
}))
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => ({ replace }),
}))
vi.mock('../../services/registrationService', () => ({ registerUser }))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ auth: { getUser } }) }))

beforeEach(() => {
  registerUser.mockReset()
  replace.mockReset()
  getUser.mockReset()
  window.history.replaceState({}, '', '/')
})

async function fillRegistration(avatarChoice = 'male') {
  const wrapper = mount(RegisterView, { global: { stubs: { RouterLink: true } } })
  expect(wrapper.get('#nextButton').attributes('disabled')).toBeDefined()
  await wrapper.get('#email-input').setValue('learner@example.edu.sg')
  await wrapper.get('#nextButton').trigger('click')
  await wrapper.get('#username-input').setValue('Ash')
  await wrapper.get('#nextButton').trigger('click')
  // Going back must work even when the current step has not been completed.
  await wrapper.get('#prevButton').trigger('click')
  expect(wrapper.get('#username-input').element.value).toBe('Ash')
  await wrapper.get('#nextButton').trigger('click')
  await wrapper.get('#level-selector').setValue('p3')
  await wrapper.get('#nextButton').trigger('click')
  expect(wrapper.get('#nextButton').attributes('disabled')).toBeDefined()
  await wrapper.get(`input[name="avatar"][value="${avatarChoice}"]`).setValue(true)
  await wrapper.get('#nextButton').trigger('click')
  await wrapper.get('#password-input').setValue('Password123')
  await wrapper.get('#confirm-password-input').setValue('Password123')
  return wrapper
}

it('submits once while pending and shows email confirmation after signup', async () => {
  let resolveSignup
  registerUser.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveSignup = resolve
      }),
  )
  const wrapper = await fillRegistration()
  await wrapper.get('form').trigger('submit')
  await wrapper.get('form').trigger('submit')
  expect(registerUser).toHaveBeenCalledTimes(1)
  expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined()
  resolveSignup({ needsEmailConfirmation: true })
  await flushPromises()
  expect(wrapper.get('[role="status"]').text()).toContain('Check your email')
  expect(wrapper.find('form').exists()).toBe(false)
  wrapper.unmount()
})

it('keeps the form available for retry after an Auth error', async () => {
  registerUser.mockRejectedValue(new Error('Too many requests'))
  const wrapper = await fillRegistration()
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toBe('Too many requests')
  expect(wrapper.get('fieldset').attributes('disabled')).toBeUndefined()
  expect(wrapper.get('#nextButton').text()).toBe('Create account')
  wrapper.unmount()
})

it('sends an immediately authenticated signup to landing', async () => {
  registerUser.mockResolvedValue({ needsEmailConfirmation: false })
  const wrapper = await fillRegistration()
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(replace).toHaveBeenCalledWith({ name: 'landing' })
  wrapper.unmount()
})

it.each(['male', 'female', 'prefer_not_to_say'])(
  'submits the selected %s avatar',
  async (avatarChoice) => {
    registerUser.mockResolvedValue({ needsEmailConfirmation: true })
    const wrapper = await fillRegistration(avatarChoice)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(registerUser).toHaveBeenCalledWith(expect.objectContaining({ avatarChoice }))
    wrapper.unmount()
  },
)

it.each([
  '/register#message=Confirmation+link+accepted.+Please+proceed+to+confirm+the+other+link',
  '/register?message=Confirmation+link+accepted',
])('shows the next email-confirmation step instead of the signup form: %s', async (url) => {
  window.history.replaceState({}, '', url)
  const wrapper = mount(RegisterView, { global: { stubs: { RouterLink: true } } })
  await flushPromises()
  expect(wrapper.get('[role="status"]').text()).toContain('Check your other inbox')
  expect(wrapper.find('form').exists()).toBe(false)
  expect(getUser).not.toHaveBeenCalled()
  expect(replace).not.toHaveBeenCalled()
  wrapper.unmount()
})

it('returns a fully confirmed email change to account settings', async () => {
  window.location.hash = '#access_token=test&type=email_change'
  getUser.mockResolvedValue({ data: { user: { email: 'new@example.com' } }, error: null })
  const wrapper = mount(RegisterView, { global: { stubs: { RouterLink: true } } })
  await flushPromises()
  expect(replace).toHaveBeenCalledWith({ name: 'account' })
  wrapper.unmount()
})

it('does not treat a still-pending email change as completed', async () => {
  window.location.hash = '#access_token=test&type=email_change'
  getUser.mockResolvedValue({
    data: { user: { email: 'old@example.com', new_email: 'new@example.com' } },
    error: null,
  })
  const wrapper = mount(RegisterView, { global: { stubs: { RouterLink: true } } })
  await flushPromises()
  expect(wrapper.text()).toContain('Check your other inbox')
  expect(replace).not.toHaveBeenCalled()
  wrapper.unmount()
})

it('shows recovery steps for an expired link without clearing an existing session', async () => {
  window.location.hash = '#error=access_denied&error_code=otp_expired'
  const wrapper = mount(RegisterView, { global: { stubs: { RouterLink: true } } })
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('invalid or expired')
  expect(wrapper.find('form').exists()).toBe(false)
  expect(getUser).not.toHaveBeenCalled()
  wrapper.unmount()
})

it('requires Auth to validate the callback before opening a protected page', async () => {
  window.location.hash = '#access_token=test&type=email_change'
  getUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid session') })
  const wrapper = mount(RegisterView, { global: { stubs: { RouterLink: true } } })
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('Unable to confirm')
  expect(replace).not.toHaveBeenCalled()
  wrapper.unmount()
})

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import ProfileSummary from '../ProfileSummary.vue'
import { nextTick } from 'vue'

const { getCurrentProfile } = vi.hoisted(() => ({ getCurrentProfile: vi.fn() }))
vi.mock('../../../services/profileService', () => ({ getCurrentProfile }))
beforeEach(() => {
  getCurrentProfile.mockReset()
})

it('shows a loading state followed by the stored name and level', async () => {
  let finishLoading
  getCurrentProfile.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishLoading = resolve
      }),
  )
  const wrapper = mount(ProfileSummary)
  await nextTick()
  expect(wrapper.get('[role="status"]').text()).toBe('Loading your profile…')
  finishLoading({
    display_name: 'Ash',
    avatar_choice: 'female',
    school_level: { name: 'Primary 3' },
  })
  await flushPromises()
  expect(wrapper.text()).toContain('Welcome, Ash!')
  expect(wrapper.text()).toContain('Primary 3')
  expect(wrapper.get('img').attributes('src')).toBe('/avatars/female.png')
  wrapper.unmount()
})

it('allows retrying a failed profile request', async () => {
  getCurrentProfile
    .mockRejectedValueOnce(new Error('Network unavailable'))
    .mockResolvedValueOnce({ display_name: 'Misty', school_level: { name: 'Primary 4' } })
  const wrapper = mount(ProfileSummary)
  await flushPromises()
  expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('Welcome, Misty!')
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  wrapper.unmount()
})

it('uses Ditto for Prefer not to say', async () => {
  getCurrentProfile.mockResolvedValue({
    display_name: 'Ash',
    avatar_choice: 'prefer_not_to_say',
    school_level: { name: 'Primary 3' },
  })
  const wrapper = mount(ProfileSummary)
  await flushPromises()
  expect(wrapper.get('img').attributes('src')).toBe(
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png',
  )
  expect(wrapper.get('img').attributes('alt')).toBe('Ditto avatar')
  wrapper.unmount()
})

it('refreshes the saved avatar on focus and stops refreshing after unmounting', async () => {
  getCurrentProfile.mockResolvedValue({ display_name: 'Ash', avatar_choice: 'male' })
  const wrapper = mount(ProfileSummary)
  await flushPromises()
  expect(wrapper.get('img').attributes('src')).toBe('/avatars/male.png')
  getCurrentProfile.mockResolvedValue({ display_name: 'Ash', avatar_choice: 'female' })
  window.dispatchEvent(new Event('focus'))
  await flushPromises()
  expect(wrapper.get('img').attributes('src')).toBe('/avatars/female.png')
  wrapper.unmount()
  getCurrentProfile.mockClear()
  window.dispatchEvent(new Event('focus'))
  await flushPromises()
  expect(getCurrentProfile).not.toHaveBeenCalled()
})

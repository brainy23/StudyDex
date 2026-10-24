import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import TrainerView from '../TrainerView.vue'
import AccountView from '../AccountView.vue'
import ProfileSummary from '../../components/common/ProfileSummary.vue'
import { getCurrentProfile } from '../../services/profileService'
import { updateCurrentAvatar, updateCurrentProfile } from '../../services/accountService'
import { avatarOptions } from '../../data/avatarOptions'

// A mutable fixture stands in for the saved profile; no live database writes occur.
const { saved } = vi.hoisted(() => ({ saved: { profile: null } }))
vi.mock('../../services/profileService', () => ({
  getCurrentProfile: vi.fn(async () => structuredClone(saved.profile)),
}))
vi.mock('../../services/accountService', () => ({
  getAccountSettings: vi.fn(async () => ({ profile: structuredClone(saved.profile), email: 'ash@example.com', pendingEmail: '' })),
  getSchoolLevels: vi.fn(async () => [{ id: 'level-3', name: 'Primary 3' }, { id: 'level-4', name: 'Primary 4' }]),
  getCurrentEmailSettings: vi.fn(async () => ({ email: 'ash@example.com', pendingEmail: '' })),
  requestEmailChange: vi.fn(),
  resendEmailChange: vi.fn(),
  updateCurrentAvatar: vi.fn(async (avatar) => {
    saved.profile.avatar_choice = avatar
    return structuredClone(saved.profile)
  }),
  updateCurrentProfile: vi.fn(async (fields) => {
    saved.profile = { ...saved.profile, display_name: fields.displayName, school_level_id: fields.schoolLevelId, avatar_choice: fields.avatarChoice }
    return structuredClone(saved.profile)
  }),
}))

let wrapper
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  saved.profile = { id: 'student-ash', display_name: 'Ash', school_level_id: 'level-3', avatar_choice: 'male', school_level: { name: 'Primary 3' } }
})
afterEach(() => wrapper?.unmount())

async function open(path = '/trainer') {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/trainer', component: TrainerView },
    { path: '/account', component: AccountView },
    { path: '/landing', component: ProfileSummary },
  ] })
  await router.push(path)
  await router.isReady()
  wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  await flushPromises()
  return router
}
const button = (text) => wrapper.findAll('button').find((item) => item.text() === text)

async function equip(avatar) {
  await wrapper.get('.wardrobe-hotspot').trigger('click')
  await wrapper.findAll('.gender-options button').find((item) => item.text() === avatar.label).trigger('click')
  await wrapper.get('.variant-card').trigger('click')
  await flushPromises()
}

it('loads the saved profile avatar instead of the old browser wardrobe preference', async () => {
  localStorage.setItem('studydex-trainer-profile', JSON.stringify({ gender: 'female', variantId: 'female-classic' }))
  await open()
  expect(wrapper.get('.trainer-sprite').attributes('src')).toBe('/avatars/male.png')
  expect(updateCurrentAvatar).not.toHaveBeenCalled()
})

it.each(avatarOptions.filter((option) => option.value !== 'male'))('syncs a wardrobe $value save to Account Settings and the profile summary', async (avatar) => {
  const router = await open()
  await equip(avatar)
  expect(updateCurrentAvatar).toHaveBeenCalledWith(avatar.value)
  expect(wrapper.get('.trainer-sprite').attributes('src')).toBe(avatar.image)
  expect(wrapper.text()).toContain('Avatar saved to your profile')
  await router.push('/account')
  await flushPromises()
  expect(wrapper.get(`input[name="avatar"][value="${avatar.value}"]`).element.checked).toBe(true)
  await router.push('/landing')
  await flushPromises()
  expect(wrapper.get('.profile-avatar').attributes('src')).toBe(avatar.image)
})

it.each(avatarOptions.filter((option) => option.value !== 'male'))('syncs an Account Settings $value save to the room after navigation and a fresh mount', async (avatar) => {
  const router = await open('/account')
  await wrapper.get(`input[name="avatar"][value="${avatar.value}"]`).setValue()
  await wrapper.get('form[aria-labelledby="profile-heading"]').trigger('submit')
  await flushPromises()
  expect(updateCurrentProfile).toHaveBeenCalledWith(expect.objectContaining({ avatarChoice: avatar.value }))
  await router.push('/trainer')
  await flushPromises()
  expect(wrapper.get('.trainer-sprite').attributes('src')).toBe(avatar.image)
  wrapper.unmount()
  await open('/trainer')
  expect(wrapper.get('.trainer-sprite').attributes('src')).toBe(avatar.image)
})

it('keeps the equipped avatar until its save succeeds and prevents duplicate saves', async () => {
  let finishSave
  updateCurrentAvatar.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve }))
  await open()
  await equip(avatarOptions[1])
  expect(wrapper.get('.trainer-sprite').attributes('src')).toBe('/avatars/male.png')
  expect(wrapper.get('.variant-card').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('Saving avatar…')
  await wrapper.get('.variant-card').trigger('click')
  expect(updateCurrentAvatar).toHaveBeenCalledTimes(1)
  saved.profile.avatar_choice = 'female'
  finishSave(structuredClone(saved.profile))
  await flushPromises()
  expect(wrapper.get('.trainer-sprite').attributes('src')).toBe('/avatars/female.png')
  expect(wrapper.get('.variant-card').attributes('aria-pressed')).toBe('true')
})

it('keeps the previous avatar after a permission failure and allows retrying', async () => {
  updateCurrentAvatar.mockRejectedValueOnce(new Error('permission denied for table profiles'))
  await open()
  await equip(avatarOptions[1])
  expect(wrapper.get('[role="alert"]').text()).toContain('permission denied for table profiles')
  expect(wrapper.get('.trainer-sprite').attributes('src')).toBe('/avatars/male.png')
  expect(saved.profile.avatar_choice).toBe('male')
  expect(wrapper.get('.variant-card').attributes('disabled')).toBeUndefined()
  await wrapper.get('.variant-card').trigger('click')
  await flushPromises()
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  expect(wrapper.get('.trainer-sprite').attributes('src')).toBe('/avatars/female.png')
})

it('reports an initial profile load failure instead of inventing an equipped avatar', async () => {
  getCurrentProfile.mockRejectedValueOnce(new Error('Network unavailable'))
  await open()
  expect(wrapper.find('.trainer-sprite').exists()).toBe(false)
  await wrapper.get('.wardrobe-hotspot').trigger('click')
  expect(wrapper.get('[role="alert"]').text()).toContain('Network unavailable')
  await button('Try again').trigger('click')
  await flushPromises()
  expect(wrapper.get('.trainer-sprite').attributes('src')).toBe('/avatars/male.png')
})

it('refreshes an open room from the saved profile when its tab regains focus', async () => {
  await open()
  saved.profile.avatar_choice = 'female'
  window.dispatchEvent(new Event('focus'))
  await flushPromises()
  expect(wrapper.get('.trainer-sprite').attributes('src')).toBe('/avatars/female.png')
  wrapper.unmount()
  getCurrentProfile.mockClear()
  window.dispatchEvent(new Event('focus'))
  await flushPromises()
  expect(getCurrentProfile).not.toHaveBeenCalled()
  wrapper = null
})

it('refreshes Account’s avatar without discarding unsaved name/level edits', async () => {
  await open('/account')
  await wrapper.get('#display-name').setValue('Unsaved name')
  await wrapper.get('#school-level').setValue('level-4')
  saved.profile.avatar_choice = 'female'
  window.dispatchEvent(new Event('focus'))
  await flushPromises()
  expect(wrapper.get('input[name="avatar"][value="female"]').element.checked).toBe(true)
  expect(wrapper.get('#display-name').element.value).toBe('Unsaved name')
  expect(wrapper.get('#school-level').element.value).toBe('level-4')
})

it('preserves an explicitly unsaved avatar choice when another tab changes the saved avatar', async () => {
  await open('/account')
  await wrapper.get('input[name="avatar"][value="prefer_not_to_say"]').setValue()
  saved.profile.avatar_choice = 'female'
  window.dispatchEvent(new Event('focus'))
  await flushPromises()
  expect(wrapper.get('input[name="avatar"][value="prefer_not_to_say"]').element.checked).toBe(true)
  await wrapper.get('form[aria-labelledby="profile-heading"]').trigger('submit')
  await flushPromises()
  expect(saved.profile.avatar_choice).toBe('prefer_not_to_say')
})

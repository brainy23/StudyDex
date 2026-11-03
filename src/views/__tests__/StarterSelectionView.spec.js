import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import StarterSelection from '../starterSelectionView.vue'
import { getStarterStatus, claimStarter } from '../../services/rewardsService'
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ replace }) }))
vi.mock('../../services/rewardsService', () => ({ getStarterStatus: vi.fn(), claimStarter: vi.fn() }))
let wrapper
beforeEach(() => { vi.resetAllMocks(); getStarterStatus.mockResolvedValue({ claimed: false }); claimStarter.mockResolvedValue({ claimed: true }) })
afterEach(() => wrapper?.unmount())
it('confirms a selected starter once and continues only after server success', async () => {
  let resolve
  claimStarter.mockReturnValue(new Promise(r => { resolve = r }))
  wrapper = mount(StarterSelection); await flushPromises()
  await wrapper.get('button.starter').trigger('click')
  expect(wrapper.get('button.starter').attributes('aria-pressed')).toBe('true')
  await wrapper.get('.confirm-button').trigger('click')
  await wrapper.get('.confirm-button').trigger('click')
  expect(claimStarter).toHaveBeenCalledExactlyOnceWith(4)
  expect(replace).not.toHaveBeenCalled()
  resolve({ claimed: true }); await flushPromises()
  expect(replace).toHaveBeenCalledWith({ name: 'landing' })
})
it('does not offer a second claim to a student who already has a starter', async () => {
  getStarterStatus.mockResolvedValue({ claimed: true })
  wrapper = mount(StarterSelection); await flushPromises()
  expect(replace).toHaveBeenCalledWith({ name: 'landing' })
  expect(claimStarter).not.toHaveBeenCalled()
})
it('does not pretend that an unavailable backend granted a starter', async () => {
  getStarterStatus.mockRejectedValue(new Error('Rewards are not connected yet.'))
  wrapper = mount(StarterSelection); await flushPromises()
  await wrapper.get('button.starter').trigger('click')
  expect(wrapper.get('.confirm-button').attributes('disabled')).toBeDefined()
  expect(wrapper.get('[role="alert"]').text()).toContain('not connected')
  expect(claimStarter).not.toHaveBeenCalled()
})
it('shows a failed grant and allows a status check before retrying', async () => {
  claimStarter.mockRejectedValue(new Error('Please check again.'))
  wrapper = mount(StarterSelection); await flushPromises()
  await wrapper.get('button.starter').trigger('click')
  await wrapper.get('.confirm-button').trigger('click'); await flushPromises()
  expect(replace).not.toHaveBeenCalled()
  expect(wrapper.get('[role="alert"]').text()).toContain('check again')
  expect(wrapper.get('.confirm-button').attributes('disabled')).toBeDefined()
})

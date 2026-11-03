import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useRewardInventory } from '../useRewardInventory'
import { getRewardInventory, watchRewardAccount } from '../../services/rewardsService'
vi.mock('../../services/rewardsService', () => ({ getRewardInventory: vi.fn(), watchRewardAccount: vi.fn() }))
let wrappers = []
let state
let accountChanged
const unsubscribe = vi.fn()
function consumer() {
  const wrapper = mount({ setup() { state = useRewardInventory(); return state }, template: '<span>{{ count }}</span>' })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.resetAllMocks()
  getRewardInventory.mockResolvedValue({ userId: 'one', count: 2, packs: [{ id: 'pack' }] })
  watchRewardAccount.mockImplementation(callback => { accountChanged = callback; return { unsubscribe } })
})
afterEach(() => { wrappers.forEach(w => w.unmount()); wrappers = []; vi.useRealTimers() })
it('shares one verified count and one refresh subscription across consumers', async () => {
  consumer(); consumer(); await flushPromises()
  expect(state.count.value).toBe(2)
  expect(getRewardInventory).toHaveBeenCalledTimes(1)
  expect(watchRewardAccount).toHaveBeenCalledTimes(1)
})
it('refreshes on focus and announces newly earned unopened packs', async () => {
  consumer(); await flushPromises()
  getRewardInventory.mockResolvedValue({ userId: 'one', count: 4, packs: [{ id: 'pack' }] })
  window.dispatchEvent(new Event('focus')); await flushPromises()
  expect(state.count.value).toBe(4)
  expect(state.notice.value).toContain('4 unopened')
})
it('clears account data immediately on sign-out and ignores late responses', async () => {
  let resolve
  getRewardInventory.mockReturnValue(new Promise(r => { resolve = r }))
  consumer()
  accountChanged('SIGNED_OUT', null)
  resolve({ userId: 'one', count: 9, packs: [{ id: 'pack' }] })
  await flushPromises()
  expect(state.count.value).toBe(null)
  expect(state.packs.value).toEqual([])
})
it('clears old counts while loading a different account', async () => {
  consumer(); await flushPromises()
  accountChanged('SIGNED_IN', 'two')
  expect(state.count.value).toBe(null)
  getRewardInventory.mockResolvedValue({ userId: 'two', count: 1, packs: [{ id: 'two-pack' }] })
  await vi.advanceTimersByTimeAsync(0); await flushPromises()
  expect(state.count.value).toBe(1)
  expect(state.notice.value).toBe('')
})
it('treats refresh errors as unknown rather than showing a fake zero', async () => {
  consumer(); await flushPromises()
  getRewardInventory.mockRejectedValue(new Error('Rewards unavailable'))
  await state.refresh()
  expect(state.count.value).toBe(null)
  expect(state.error.value).toBe('Rewards unavailable')
})
it('polls while mounted and cleans up after the last consumer', async () => {
  const wrapper = consumer(); await flushPromises()
  await vi.advanceTimersByTimeAsync(30000)
  expect(getRewardInventory).toHaveBeenCalledTimes(2)
  wrapper.unmount(); wrappers = []
  window.dispatchEvent(new Event('focus'))
  await vi.advanceTimersByTimeAsync(30000)
  expect(getRewardInventory).toHaveBeenCalledTimes(2)
  expect(unsubscribe).toHaveBeenCalledOnce()
})

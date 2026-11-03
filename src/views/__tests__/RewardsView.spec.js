import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import RewardsView from '../rewardsView2.vue'
import { openRewardPack } from '../../services/rewardsService'
let inventory
vi.mock('../../services/rewardsService', () => ({ openRewardPack: vi.fn() }))
vi.mock('../../composables/useRewardInventory', () => ({ useRewardInventory: () => inventory }))
const packId = '11111111-1111-4111-8111-111111111111'
const result = { user_id: 'student', pack_id: packId, reward_type: 'pokemon', pokemon: { pokeapi_id: 4, name: 'charmander', sprite_url: null } }
let reduced = true
let wrapper
function render() { wrapper = mount(RewardsView, { global: { stubs: { BackToHome: true } } }); return wrapper }
async function ready() {
  await wrapper.get('.hero-pack').trigger('click')
  await wrapper.findAll('button').find(b => b.text() === 'Open').trigger('click')
  await vi.advanceTimersByTimeAsync(800)
  await flushPromises()
}
beforeEach(() => {
  vi.useFakeTimers(); vi.resetAllMocks(); reduced = true
  inventory = { count: ref(2), packs: ref([{ id: packId }]), error: ref(''), loading: ref(false), refresh: vi.fn() }
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Artwork offline')))
  openRewardPack.mockResolvedValue(result)
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers(); vi.unstubAllGlobals() })
it('provides a keyboard-accessible action and reveals the saved result even with artwork offline', async () => {
  render(); await ready()
  await wrapper.get('.hint button').trigger('click'); await flushPromises()
  expect(openRewardPack).toHaveBeenCalledExactlyOnceWith(packId)
  expect(wrapper.get('.card-name').text()).toBe('charmander')
  expect(inventory.refresh).toHaveBeenCalledOnce()
  expect(wrapper.get('.rc-art').attributes('src')).toContain('/4.png')
})
it('never invents packs when inventory is unavailable', () => {
  inventory.count.value = null; inventory.error.value = 'Rewards are not connected yet.'
  render()
  expect(wrapper.get('.hero-pack').attributes('disabled')).toBeDefined()
  expect(wrapper.get('.total').text()).toBe('—')
  expect(wrapper.get('[role="alert"]').text()).toContain('not connected')
})
it('cancelled pointer input does not open a pack', async () => {
  reduced = false; render(); await ready()
  wrapper.get('.pack-wrap').element.dispatchEvent(new MouseEvent('pointerdown', { clientX: 10, bubbles: true }))
  await wrapper.get('.pack-wrap').trigger('pointercancel')
  await vi.advanceTimersByTimeAsync(600)
  expect(openRewardPack).not.toHaveBeenCalled()
})
it('audio construction failure cannot prevent reaching the opening action', async () => {
  reduced = false
  vi.stubGlobal('AudioContext', function () { throw new Error('No audio') })
  render(); await ready()
  expect(wrapper.get('.hint button').text()).toBe('Open this pack')
  expect(openRewardPack).not.toHaveBeenCalled()
})
it('an uncertain opening retries the same pack and does not decrement inventory locally', async () => {
  openRewardPack.mockRejectedValueOnce(new Error('Please retry this same pack.')).mockResolvedValue(result)
  render(); await ready()
  await wrapper.get('.hint button').trigger('click'); await flushPromises()
  expect(inventory.count.value).toBe(2)
  expect(wrapper.get('[role="alert"]').text()).toContain('retry')
  await wrapper.get('.hint button').trigger('click'); await flushPromises()
  expect(openRewardPack.mock.calls).toEqual([[packId], [packId]])
})
it('shows only the XP returned by the server', async () => {
  openRewardPack.mockResolvedValue({ ...result, reward_type: 'xp', xp_awarded: 25 })
  render(); await ready(); await wrapper.get('.hint button').trigger('click'); await flushPromises()
  expect(wrapper.get('.chip-xp').text()).toBe('Duplicate: +25 XP')
})
it('ignores an opening response after unmount without scheduling artwork or timers', async () => {
  let resolve
  openRewardPack.mockReturnValue(new Promise(r => { resolve = r }))
  render(); await ready(); await wrapper.get('.hint button').trigger('click')
  wrapper.unmount(); wrapper = null
  resolve(result); await flushPromises()
  expect(fetch).not.toHaveBeenCalled()
  expect(inventory.refresh).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

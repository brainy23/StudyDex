import { beforeEach, expect, it, vi } from 'vitest'
import { getLocationPreference, setLocationPreference } from '../locationPreferenceService'
import { checkedRpc } from '../backendClient'
vi.mock('../backendClient', () => ({ checkedRpc: vi.fn() }))
beforeEach(() => vi.resetAllMocks())
it('reads the signed-in profile’s nullable preference', async () => {
  checkedRpc.mockResolvedValue({ user_id: 'ash', device_loc: null })
  expect(await getLocationPreference()).toEqual({ user_id: 'ash', device_loc: null })
  expect(checkedRpc).toHaveBeenCalledExactlyOnceWith('get_device_location_preference')
})
it.each([true, false])('saves %s with the verified owner pinned to the request', async value => {
  checkedRpc.mockResolvedValue({ user_id: 'ash', device_loc: value })
  await setLocationPreference(value, 'ash')
  expect(checkedRpc).toHaveBeenCalledExactlyOnceWith('set_device_location_preference', { p_device_loc: value }, 'ash')
})
it.each([null, undefined, 'false', 0])('rejects a non-boolean choice %s', value => {
  expect(() => setLocationPreference(value, 'ash')).toThrow('Choose whether')
  expect(checkedRpc).not.toHaveBeenCalled()
})

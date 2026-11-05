import { checkedRpc } from './backendClient'

export const getLocationPreference = () => checkedRpc('get_device_location_preference')

export function setLocationPreference(preference, userId) {
  if (typeof preference !== 'boolean') throw new Error('Choose whether to use device location.')
  return checkedRpc('set_device_location_preference', { p_device_loc: preference }, userId)
}

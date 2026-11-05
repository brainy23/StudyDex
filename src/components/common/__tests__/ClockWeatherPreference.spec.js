import { defineComponent, h, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ClockWeather from '../ClockWeather.vue'
import { provideWeatherLocation } from '../../../composables/useWeatherLocation'
import { getLocationPreference, setLocationPreference } from '../../../services/locationPreferenceService'
vi.mock('../../../services/locationPreferenceService', () => ({ getLocationPreference: vi.fn(), setLocationPreference: vi.fn() }))
vi.mock('axios', () => ({ default: { get: vi.fn(async () => ({ data: {
  current: { temperature_2m: 29, weather_code: 0, cloud_cover: 0, is_day: 1 },
  data: { stations: [], readings: [] },
} })) } }))
let wrapper, state, visible, preference, owner, geolocation
beforeEach(() => {
  vi.resetAllMocks()
  preference = null
  owner = 'ash'
  getLocationPreference.mockImplementation(async () => ({ user_id: owner, device_loc: preference }))
  setLocationPreference.mockImplementation(async value => {
    preference = value
    return { user_id: owner, device_loc: value }
  })
  geolocation = vi.fn(resolve => resolve({ coords: { latitude: 1.3, longitude: 103.8 } }))
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: geolocation } })
})
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals() })
async function open() {
  visible = ref(true)
  wrapper = mount(defineComponent({ setup() {
    state = provideWeatherLocation()
    return () => visible.value ? h(ClockWeather) : null
  } }))
  await flushPromises()
}
const dialogOpen = () => wrapper.get('dialog').element.open
const button = text => wrapper.findAll('button').find(button => button.text().includes(text))
it('asks only for null and persists Not Now across page changes and fresh app instances', async () => {
  await open()
  expect(dialogOpen()).toBe(true)
  expect(geolocation).not.toHaveBeenCalled()
  await button('Not Now').trigger('click')
  await flushPromises()
  expect(setLocationPreference).toHaveBeenCalledExactlyOnceWith(false, 'ash')
  expect(dialogOpen()).toBe(false)
  expect(state.deviceLocationPreference.value).toBe(false)
  visible.value = false
  await flushPromises()
  visible.value = true
  await flushPromises()
  expect(dialogOpen()).toBe(false)
  expect(getLocationPreference).toHaveBeenCalledTimes(1)
  wrapper.unmount()
  await open()
  expect(getLocationPreference).toHaveBeenCalledTimes(2)
  expect(dialogOpen()).toBe(false)
  expect(geolocation).not.toHaveBeenCalled()
})
it('restores true without showing the location modal and gets fresh device coordinates', async () => {
  preference = true
  await open()
  expect(dialogOpen()).toBe(false)
  expect(geolocation).toHaveBeenCalledTimes(1)
  expect(state.savedLocation.value).toMatchObject({ source: 'device', latitude: 1.3 })
})
it('saves consent before accessing the device location', async () => {
  await open()
  await button('Use My Location').trigger('click')
  await flushPromises()
  expect(preference).toBe(true)
  expect(setLocationPreference.mock.invocationCallOrder[0]).toBeLessThan(geolocation.mock.invocationCallOrder[0])
  expect(dialogOpen()).toBe(false)
  expect(state.savedLocation.value.source).toBe('device')
})
it('saves false when the unanswered modal is dismissed with Escape', async () => {
  await open()
  wrapper.get('dialog').element.dispatchEvent(new Event('cancel', { cancelable: true }))
  await flushPromises()
  expect(preference).toBe(false)
  expect(dialogOpen()).toBe(false)
})
it('keeps the unanswered modal open on a failed save and allows retry', async () => {
  setLocationPreference.mockRejectedValueOnce(Error('offline'))
  await open()
  await button('Use My Location').trigger('click')
  await flushPromises()
  expect(dialogOpen()).toBe(true)
  expect(wrapper.get('[role="alert"]').text()).toContain('could not be saved')
  expect(state.deviceLocationPreference.value).toBeNull()
  expect(geolocation).not.toHaveBeenCalled()
  await button('Not Now').trigger('click')
  await flushPromises()
  expect(dialogOpen()).toBe(false)
  expect(preference).toBe(false)
})
it('does not treat a failed preference read as a new unanswered user', async () => {
  getLocationPreference.mockRejectedValueOnce(Error('offline'))
  await open()
  expect(dialogOpen()).toBe(false)
  expect(state.savedLocation.value.source).toBe('default')
  expect(wrapper.get('.location-feedback').text()).toContain('could not load')
  expect(geolocation).not.toHaveBeenCalled()
})
it('allows a user to manually change an existing choice without automatically asking again', async () => {
  preference = false
  await open()
  expect(dialogOpen()).toBe(false)
  await wrapper.get('[aria-label="Change weather location"]').trigger('click')
  expect(dialogOpen()).toBe(true)
  await button('Use My Location').trigger('click')
  await flushPromises()
  expect(preference).toBe(true)
  expect(state.savedLocation.value.source).toBe('device')
})
it('ignores a late preference read from an account that has signed out', async () => {
  let resolve
  getLocationPreference.mockReturnValueOnce(new Promise(done => { resolve = done }))
  await open()
  state.resetLocationState()
  owner = 'misty'
  preference = false
  await state.loadLocationPreference()
  resolve({ user_id: 'ash', device_loc: true })
  await flushPromises()
  expect(state.deviceLocationPreference.value).toBe(false)
  expect(geolocation).not.toHaveBeenCalled()
  expect(dialogOpen()).toBe(false)
})
it('ignores an old account’s late geolocation result after a profile switch', async () => {
  let resolve
  geolocation.mockImplementationOnce(done => { resolve = done })
  preference = true
  await open()
  visible.value = false
  await flushPromises()
  state.resetLocationState()
  owner = 'misty'
  preference = false
  visible.value = true
  await flushPromises()
  resolve({ coords: { latitude: 50, longitude: 40 } })
  await flushPromises()
  expect(dialogOpen()).toBe(false)
  expect(state.savedLocation.value.source).toBe('default')
  expect(state.savedLocation.value.latitude).not.toBe(50)
})

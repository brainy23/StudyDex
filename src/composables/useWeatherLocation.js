import { inject, provide, ref } from 'vue'
import { getLocationPreference, setLocationPreference } from '../services/locationPreferenceService'

// Default location: Singapore.
export const DEFAULT_WEATHER_LOCATION = Object.freeze({
  latitude: 1.3521,
  longitude: 103.8198
})

const weatherLocationKey = Symbol('weatherLocation')

// Call once inside App.vue's <script setup>.
export function provideWeatherLocation() {
  // Coordinates are shared in memory. Consent is persisted on the user's profile.
  const savedLocation = ref(null)
  const locationBusy = ref(false)
  const locationNotice = ref('')
  const deviceLocationPreference = ref(null)
  const preferenceLoaded = ref(false)
  const preferenceBusy = ref(false)
  const preferenceError = ref('')
  let owner = null
  let preferenceVersion = 0
  let preferencePromise = null
  let savingPreference = false

  let locationRequest = 0

  // Start a new request or invalidate an unfinished request.
  function beginLocationRequest() {
    locationRequest += 1
    return locationRequest
  }

  // Prevent an older response from overwriting a newer choice.
  function isCurrentLocationRequest(request) {
    return request === locationRequest
  }

  async function loadLocationPreference() {
    if (preferenceLoaded.value) return deviceLocationPreference.value
    if (preferencePromise) return preferencePromise
    const version = preferenceVersion
    preferenceBusy.value = true
    preferenceError.value = ''
    preferencePromise = (async () => {
      try {
        const data = await getLocationPreference()
        if (version !== preferenceVersion) return
        if (!data?.user_id || ![null, true, false].includes(data.device_loc)) {
          throw new Error('Your saved location preference could not be read.')
        }
        owner = data.user_id
        deviceLocationPreference.value = data.device_loc
        preferenceLoaded.value = true
        return data.device_loc
      } catch (error) {
        if (version === preferenceVersion) preferenceError.value = 'Your saved location preference could not load. Please try again.'
        throw error
      } finally {
        if (version === preferenceVersion) {
          preferenceBusy.value = false
          preferencePromise = null
        }
      }
    })()
    return preferencePromise
  }

  async function saveLocationPreference(preference) {
    const version = preferenceVersion
    await loadLocationPreference()
    if (version !== preferenceVersion || savingPreference) return false
    savingPreference = true
    preferenceBusy.value = true
    preferenceError.value = ''
    try {
      const data = await setLocationPreference(preference, owner)
      if (version !== preferenceVersion) return false
      if (data?.user_id !== owner || data.device_loc !== preference) throw new Error('Location preference was not saved.')
      deviceLocationPreference.value = preference
      return true
    } catch (error) {
      if (version === preferenceVersion) preferenceError.value = 'Your location choice could not be saved. Please try again.'
      throw error
    } finally {
      if (version === preferenceVersion) {
        savingPreference = false
        preferenceBusy.value = false
      }
    }
  }

  function resetLocationState() {
    beginLocationRequest()
    preferenceVersion++
    preferencePromise = null
    savingPreference = false
    owner = null
    savedLocation.value = null
    locationBusy.value = false
    locationNotice.value = ''
    deviceLocationPreference.value = null
    preferenceLoaded.value = false
    preferenceBusy.value = false
    preferenceError.value = ''
  }

  const state = {
    savedLocation,
    locationBusy,
    locationNotice,
    deviceLocationPreference,
    preferenceLoaded,
    preferenceBusy,
    preferenceError,
    loadLocationPreference,
    saveLocationPreference,
    resetLocationState,
    beginLocationRequest,
    isCurrentLocationRequest
  }

  provide(weatherLocationKey, state)

  return state
}

// Call inside ClockWeather.vue's <script setup>.
export function useWeatherLocation() {
  const state = inject(weatherLocationKey)

  if (!state) {
    throw new Error(
      'Call provideWeatherLocation() once in App.vue setup before using ClockWeather.'
    )
  }

  return state
}

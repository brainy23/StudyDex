import { inject, provide, ref } from 'vue'

// Default location: Singapore.
export const DEFAULT_WEATHER_LOCATION = Object.freeze({
  latitude: 1.3521,
  longitude: 103.8198
})

const weatherLocationKey = Symbol('weatherLocation')

// Call once inside App.vue's <script setup>.
export function provideWeatherLocation() {
  // Shared across pages; resets when the app is refreshed.
  const savedLocation = ref(null)
  const locationBusy = ref(false)
  const locationNotice = ref('')

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

  const state = {
    savedLocation,
    locationBusy,
    locationNotice,
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

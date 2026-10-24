import { inject, provide } from 'vue'

export const DEFAULT_WEATHER_LOCATION = Object.freeze({ latitude: 1.3521, longitude: 103.8198 })
const weatherLocationKey = Symbol('weatherLocation')

function requestDeviceLocation() {
  return new Promise((resolve) => {
    const geolocation = globalThis.navigator?.geolocation
    if (!geolocation) {
      resolve(DEFAULT_WEATHER_LOCATION)
      return
    }

    try {
      geolocation.getCurrentPosition(
        ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
        () => resolve(DEFAULT_WEATHER_LOCATION),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      )
    } catch {
      resolve(DEFAULT_WEATHER_LOCATION)
    }
  })
}

export function provideWeatherLocation() {
  // This belongs to the running app: route changes keep it, a page reload resets it.
  let selectedLocation = null
  provide(weatherLocationKey, {
    getSavedLocation: () => selectedLocation,
    selectLocation(useDeviceLocation) {
      // Share the pending request too, if Town is left before the browser responds.
      selectedLocation ??= useDeviceLocation
        ? requestDeviceLocation()
        : Promise.resolve(DEFAULT_WEATHER_LOCATION)
      return selectedLocation
    },
  })
}

export function useWeatherLocation() {
  return inject(weatherLocationKey)
}

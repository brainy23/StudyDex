<script setup>
import axios from 'axios'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  DEFAULT_WEATHER_LOCATION,
  useWeatherLocation
} from '@/composables/useWeatherLocation'

const props = defineProps({

  // If no shared location exists:
  // true = request device location
  // false = use Singapore
  useDeviceLocation: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['rain-change'])

const { getSavedLocation, selectLocation } = useWeatherLocation()

const assetBase = import.meta.env.BASE_URL

// =====================================================
// CLOCK
// =====================================================

const now = ref(new Date())

const currentHour = computed(() => {
  if (props.hour !== null && Number.isFinite(props.hour)) {
    return ((props.hour % 24) + 24) % 24
  }

  return now.value.getHours() + now.value.getMinutes() / 60
})

const displayTime = computed(() => {
  const minutes = Math.floor(currentHour.value * 60)

  const hoursText = String(Math.floor(minutes / 60)).padStart(2, '0')
  const minutesText = String(minutes % 60).padStart(2, '0')

  return `${hoursText}:${minutesText}`
})

const displayPeriod = computed(() => {
  if (props.period) return props.period

  const hour = currentHour.value

  if (hour < 6) return 'Night'
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  if (hour < 19) return 'Sunset'
  if (hour < 20) return 'Dusk'
  if (hour < 22) return 'Evening'

  return 'Night'
})

// =====================================================
// WEATHER STATE
// =====================================================

const weatherReady = ref(false)
const cloudCover = ref(0)
const isDay = ref(true)
const isRaining = ref(false)
const loading = ref(true)
const weatherError = ref('')

const weatherDescription = computed(() => {
  if (props.rainPreview || isRaining.value) return 'Rainy'
  if (!weatherReady.value) return 'Weather unavailable'
  if (!isDay.value) return 'Night'
  if (cloudCover.value >= 70) return 'Cloudy'
  if (cloudCover.value >= 20) return 'Partly cloudy'

  return 'Sunny'
})

const weatherImage = computed(() => {
  if (props.rainPreview || isRaining.value) {
    return `${assetBase}assets/rain.png`
  }

  if (!weatherReady.value) return ''

  if (!isDay.value) {
    return `${assetBase}assets/moon.png`
  }

  if (cloudCover.value >= 70) {
    return `${assetBase}assets/cloud.png`
  }

  if (cloudCover.value >= 20) {
    return `${assetBase}assets/suncloud.png`
  }

  return `${assetBase}assets/sun.png`
})

function updateRain(value) {
  isRaining.value = value
  emit('rain-change', value)
}

// =====================================================
// DISTANCE TO RAINFALL STATION
// =====================================================

function getDistance(lat1, lon1, lat2, lon2) {
  const radians = degrees => degrees * Math.PI / 180

  const value =
    Math.sin(radians(lat2 - lat1) / 2) ** 2 +
    Math.cos(radians(lat1)) *
    Math.cos(radians(lat2)) *
    Math.sin(radians(lon2 - lon1) / 2) ** 2

  return 6371 * 2 * Math.asin(
    Math.sqrt(Math.min(1, Math.max(0, value)))
  )
}

// =====================================================
// LIFECYCLE AND LOCATION
// =====================================================

let clockInterval
let stopLocationWatcher

onMounted(() => {
  now.value = new Date()

  clockInterval = setInterval(() => {
    if (props.hour === null || !Number.isFinite(props.hour)) {
      now.value = new Date()
    }
  }, 1000)

  stopLocationWatcher = watch(
    [
      () => props.location?.latitude,
      () => props.location?.longitude,
      () => props.useDeviceLocation
    ],
    async (_, previous, onCleanup) => {
      const controller = new AbortController()

      let cancelled = false
      let weatherInterval
      let rainInterval
      let weatherBusy = false
      let rainBusy = false

      onCleanup(() => {
        cancelled = true
        controller.abort()
        clearInterval(weatherInterval)
        clearInterval(rainInterval)
      })

      loading.value = true
      weatherReady.value = false
      weatherError.value = ''
      updateRain(false)

      let selectedLocation

      try {
        // Explicit coordinates take priority.
        if (
          Number.isFinite(props.location?.latitude) &&
          Number.isFinite(props.location?.longitude)
        ) {
          selectedLocation = props.location
        } else {
          // Reuse the app's selected location.
          // Otherwise choose device location or Singapore.
          selectedLocation = await (
            getSavedLocation() ||
            selectLocation(props.useDeviceLocation)
          )
        }
      } catch {
        selectedLocation = DEFAULT_WEATHER_LOCATION
      }

      if (cancelled) return

      const latitude =
        selectedLocation?.latitude ?? DEFAULT_WEATHER_LOCATION.latitude

      const longitude =
        selectedLocation?.longitude ?? DEFAULT_WEATHER_LOCATION.longitude

      // -------------------------------------------------
      // Open-Meteo: cloud cover and day/night
      // -------------------------------------------------

      async function fetchWeather() {
        if (cancelled || weatherBusy) return

        weatherBusy = true

        try {
          const response = await axios.get(
            'https://api.open-meteo.com/v1/forecast',
            {
              params: {
                latitude,
                longitude,
                current: 'cloud_cover,is_day',
                timezone: 'auto'
              },
              signal: controller.signal
            }
          )

          if (cancelled) return

          const current = response.data.current

          if (
            !Number.isFinite(current?.cloud_cover) ||
            ![0, 1].includes(current?.is_day)
          ) {
            throw new Error('Invalid weather data')
          }

          cloudCover.value = current.cloud_cover
          isDay.value = current.is_day === 1
          weatherReady.value = true
          weatherError.value = ''
        } catch (error) {
          if (!cancelled) {
            weatherReady.value = false
            weatherError.value = 'Weather could not load.'
            console.log('error',error)
          }
        } finally {
          weatherBusy = false

          if (!cancelled) loading.value = false
        }
      }

      // -------------------------------------------------
      // NEA: recent rainfall within 2.5 km
      // -------------------------------------------------

      async function fetchRain() {
        if (cancelled || rainBusy) return

        rainBusy = true

        try {
          const response = await axios.get(
            'https://api-open.data.gov.sg/v2/real-time/api/rainfall',
            { signal: controller.signal }
          )

          if (cancelled) return

          const { stations = [], readings = [] } =
            response.data.data ?? {}

          const latest = readings[0]
          const ageMinutes =
            (Date.now() - Date.parse(latest?.timestamp)) / 60000

          if (
            !Array.isArray(latest?.data) ||
            !Number.isFinite(ageMinutes) ||
            ageMinutes < 0 ||
            ageMinutes > 12
          ) {
            updateRain(false)
            return
          }

          const rainfall = new Map(
            latest.data.map(item => [item.stationId, item.value])
          )

          const nearestStation = stations
            .filter(station =>
              Number.isFinite(station.location?.latitude) &&
              Number.isFinite(station.location?.longitude) &&
              Number.isFinite(rainfall.get(station.id))
            )
            .map(station => ({
              distance: getDistance(
                latitude,
                longitude,
                station.location.latitude,
                station.location.longitude
              ),
              rainfall: rainfall.get(station.id)
            }))
            .filter(station => station.distance <= 2.5)
            .sort((a, b) => a.distance - b.distance)[0]

          updateRain(
            nearestStation ? nearestStation.rainfall > 0 : false
          )
        } catch {
          if (!cancelled) updateRain(false)
        } finally {
          rainBusy = false
        }
      }

      fetchWeather()
      fetchRain()

      weatherInterval = setInterval(fetchWeather, 600000)
      rainInterval = setInterval(fetchRain, 300000)
    },
    { immediate: true }
  )
})

onUnmounted(() => {
  clearInterval(clockInterval)
  stopLocationWatcher?.()
})
</script>

<template>
  <div
    class="clock-weather"
    :title="loading ? 'Loading weather…' : weatherError || weatherDescription"
    :aria-label="`${displayTime}, ${displayPeriod}, ${weatherDescription}`"
  >
    <img
      v-if="weatherImage"
      :src="weatherImage"
      class="weather-icon"
      alt=""
      draggable="false"
    />

    <span v-else class="weather-placeholder" aria-hidden="true">
      {{ loading ? '…' : '—' }}
    </span>

    <span class="clock-time">
      {{ displayTime }}
    </span>

    <span class="clock-divider" aria-hidden="true"></span>

    <span class="clock-period">
      {{ displayPeriod }}
    </span>
  </div>
</template>

<style scoped>
.clock-weather {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;

  padding: 12px 20px;
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 999px;

  background: rgb(15 36 70 / 38%);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);

  color: #fff;
  font-family: inherit;
  white-space: nowrap;

  box-shadow:
    0 4px 12px rgb(7 20 44 / 18%),
    inset 0 1px 0 rgb(255 255 255 / 20%);
}

.weather-icon,
.weather-placeholder {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
}

.weather-icon {
  display: block;
  object-fit: contain;
  image-rendering: pixelated;
}

.weather-placeholder {
  display: grid;
  place-items: center;
  font-size: 22px;
}

.clock-time {
  font-size: 23px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.clock-divider {
  flex-shrink: 0;
  width: 1px;
  height: 24px;
  background: rgb(255 255 255 / 40%);
}

.clock-period {
  color: #eef6ff;
  font-size: 16px;
  font-weight: 700;
}

@media (max-width: 600px) {
  .clock-weather {
    gap: 8px;
    padding: 9px 13px;
  }

  .weather-icon,
  .weather-placeholder {
    width: 32px;
    height: 32px;
  }

  .clock-time {
    font-size: 19px;
  }

  .clock-period {
    font-size: 12px;
  }

  .clock-divider {
    height: 20px;
  }
}
</style>

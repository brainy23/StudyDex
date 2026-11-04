<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useTimeOfDay } from '@/composables/useTimeOfDay'
import {
  DEFAULT_WEATHER_LOCATION,
  useWeatherLocation
} from '@/composables/useWeatherLocation'

const {
  savedLocation,
  locationBusy,
  locationNotice,
  beginLocationRequest,
  isCurrentLocationRequest
} = useWeatherLocation()

// =====================================================
// PROPS AND EMITS
// =====================================================

const props = defineProps({
  // true: offer the location chooser on the first visit.
  // false: use Singapore without asking on the first visit.
  useDeviceLocation: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'rain-change',
  'rain-status-change'
])

const assetBase = import.meta.env.BASE_URL

// =====================================================
// TIME AND LIGHTING
// =====================================================

// The composable supplies the live clock and the accessible time-of-day label.
// Keep this import path matched to the actual composable filename, including case.
const { currentTime, lighting } = useTimeOfDay()

const displayTime = computed(() =>
  currentTime.value.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
)

const displayPeriod = computed(() => lighting.value.name)

// =====================================================
// LOCATION STATE
// =====================================================

const locationDialog = ref(null)
const locationButton = ref(null)

const locationLabel = computed(() => {
  if (locationBusy.value) {
    return 'Finding location…'
  }

  if (savedLocation.value?.source === 'device') {
    return 'Current location'
  }

  if (savedLocation.value) {
    return 'Singapore (default)'
  }

  return 'Choose location'
})

// =====================================================
// LOCATION SELECTION
// =====================================================

function useSingaporeLocation(message = '') {
  // Ignore any unfinished device request after choosing Singapore.
  beginLocationRequest()

  locationBusy.value = false
  locationNotice.value = message

  savedLocation.value = {
    ...DEFAULT_WEATHER_LOCATION,
    source: 'default'
  }
}

async function useDeviceLoc() {
  if (locationBusy.value) return

  const request = beginLocationRequest()

  locationBusy.value = true
  locationNotice.value = ''

  try {
    const coords = await new Promise((resolve, reject) => {
      const geolocation = globalThis.navigator?.geolocation

      if (!geolocation) {
        reject(new Error('Device location is unavailable.'))
        return
      }

      geolocation.getCurrentPosition(
        position => resolve(position.coords),
        reject,
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000
        }
      )
    })

    if (!isCurrentLocationRequest(request)) return

    if (
      !Number.isFinite(coords.latitude) ||
      !Number.isFinite(coords.longitude)
    ) {
      throw new Error('Invalid device coordinates.')
    }

    savedLocation.value = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      source: 'device'
    }
  } catch (error) {
    if (!isCurrentLocationRequest(request)) return

    locationNotice.value =
      error.code === 1
        ? 'Location permission was denied. Using Singapore instead.'
        : 'Your location could not be found. Using Singapore instead.'

    savedLocation.value = {
      ...DEFAULT_WEATHER_LOCATION,
      source: 'default'
    }
  } finally {
    if (isCurrentLocationRequest(request)) {
      locationBusy.value = false
    }
  }
}

// =====================================================
// LOCATION MODAL
// =====================================================

function openLocationDialog() {
  const dialog = locationDialog.value

  if (dialog && !dialog.open) {
    dialog.showModal()
  }
}

function closeLocationDialog() {
  locationDialog.value?.close()
}

async function chooseDevice() {
  await useDeviceLoc()
  closeLocationDialog()
}

function chooseSingapore() {
  useSingaporeLocation()
  closeLocationDialog()
}

function cancelLocationDialog(event) {
  event.preventDefault()

  // Escape means Not Now on the first visit.
  // Later it keeps the current choice.
  if (!savedLocation.value) {
    useSingaporeLocation()
  }

  closeLocationDialog()
}

function restoreLocationFocus() {
  locationButton.value?.focus()
}

// =====================================================
// WEATHER STATE
// =====================================================

const weatherReady = ref(false)
const cloudCover = ref(0)
const isDay = ref(true)

const loading = ref(false)
const weatherError = ref('')

const rainStatus = ref('unknown')
const rainMessage = ref('Choose a location to check rainfall.')

const isRaining = computed(() =>
  rainStatus.value === 'raining'
)

// =====================================================
// WEATHER DISPLAY
// =====================================================

const weatherDescription = computed(() => {
  if (isRaining.value) {
    return 'Rainy'
  }

  if (!weatherReady.value) {
    return 'Weather unavailable'
  }

  if (!isDay.value) {
    return 'Night'
  }

  if (cloudCover.value >= 70) {
    return 'Cloudy'
  }

  if (cloudCover.value >= 20) {
    return 'Partly cloudy'
  }

  return 'Sunny'
})

const weatherImage = computed(() => {
  if (isRaining.value) {
    return `${assetBase}assets/rain.png`
  }

  if (!weatherReady.value) {
    return ''
  }

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

const weatherTitle = computed(() =>
  [
    locationLabel.value,
    loading.value
      ? 'Loading weather…'
      : weatherError.value || weatherDescription.value,
    rainMessage.value,
    locationNotice.value
  ]
    .filter(Boolean)
    .join(' · ')
)

// =====================================================
// RAIN STATUS
// =====================================================

function updateRain(status, message) {
  rainStatus.value = status
  rainMessage.value = message

  // Unknown disables the visual rain effect
  // without claiming confirmed dry weather.
  emit('rain-change', status === 'raining')
  emit('rain-status-change', status)
}

// =====================================================
// DISTANCE CALCULATION
// =====================================================

function getDistance(lat1, lon1, lat2, lon2) {
  const radians = degrees => degrees * Math.PI / 180

  const value =
    Math.sin(radians(lat2 - lat1) / 2) ** 2 +
    Math.cos(radians(lat1)) *
    Math.cos(radians(lat2)) *
    Math.sin(radians(lon2 - lon1) / 2) ** 2

  return (
    6371 *
    2 *
    Math.asin(
      Math.sqrt(
        Math.min(1, Math.max(0, value))
      )
    )
  )
}

// =====================================================
// WEATHER AND RAINFALL FETCHING
// =====================================================

let stopLocationWatcher

onMounted(() => {
  stopLocationWatcher = watch(
    savedLocation,
    (location, previous, onCleanup) => {
      const controller = new AbortController()

      let cancelled = false
      let weatherInterval
      let rainInterval
      let weatherBusy = false
      let rainBusy = false

      // -----------------------------------------------
      // REFRESH WHEN TAB BECOMES VISIBLE
      // -----------------------------------------------

      function refreshOnReturn() {
        if (!document.hidden) {
          fetchWeather()
          fetchRain()
        }
      }

      // -----------------------------------------------
      // CLEAN UP PREVIOUS LOCATION REQUESTS
      // -----------------------------------------------

      onCleanup(() => {
        cancelled = true

        controller.abort()

        clearInterval(weatherInterval)
        clearInterval(rainInterval)

        document.removeEventListener(
          'visibilitychange',
          refreshOnReturn
        )
      })

      // -----------------------------------------------
      // RESET WEATHER STATE
      // -----------------------------------------------

      weatherReady.value = false
      weatherError.value = ''
      loading.value = Boolean(location)

      updateRain(
        'unknown',
        location
          ? 'Checking local rainfall…'
          : 'Choose a location to check rainfall.'
      )

      if (!location) return

      const { latitude, longitude } = location

      // -----------------------------------------------
      // FETCH WEATHER FROM OPEN-METEO
      // -----------------------------------------------

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
              signal: controller.signal,
              timeout: 15000
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
        } catch {
          if (!cancelled) {
            weatherReady.value = false
            weatherError.value = 'Weather could not load.'
          }
        } finally {
          weatherBusy = false

          if (!cancelled) {
            loading.value = false
          }
        }
      }

      // -----------------------------------------------
      // FETCH RAINFALL FROM NEA
      // -----------------------------------------------

      async function fetchRain() {
        if (cancelled || rainBusy) return

        rainBusy = true

        try {
          const response = await axios.get(
            'https://api-open.data.gov.sg/v2/real-time/api/rainfall',
            {
              signal: controller.signal,
              timeout: 15000
            }
          )

          if (cancelled) return

          const { stations, readings } =
            response.data.data ?? {}

          if (
            !Array.isArray(stations) ||
            !Array.isArray(readings)
          ) {
            throw new Error('Invalid rainfall data')
          }

          // Find the newest timestamp rather than
          // assuming the API array order.
          const latest = readings
            .filter(item =>
              Number.isFinite(Date.parse(item.timestamp))
            )
            .reduce(
              (newest, item) =>
                !newest ||
                Date.parse(item.timestamp) >
                  Date.parse(newest.timestamp)
                  ? item
                  : newest,
              null
            )

          const ageMinutes =
            (Date.now() - Date.parse(latest?.timestamp)) / 60000

          if (
            !Array.isArray(latest?.data) ||
            !Number.isFinite(ageMinutes) ||
            ageMinutes < 0 ||
            ageMinutes > 12
          ) {
            updateRain(
              'unknown',
              'Recent rainfall readings are unavailable.'
            )
            return
          }

          // Match station IDs with their rainfall readings.
          const rainfall = new Map(
            latest.data.map(item => [
              item.stationId,
              item.value
            ])
          )

          // Find the nearest valid station within 2.5 km.
          const nearest = stations
            .filter(station =>
              Number.isFinite(station.location?.latitude) &&
              Number.isFinite(station.location?.longitude) &&
              Number.isFinite(rainfall.get(station.id)) &&
              rainfall.get(station.id) >= 0
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
            .filter(station =>
              station.distance <= 2.5
            )
            .sort((a, b) =>
              a.distance - b.distance
            )[0]

          if (!nearest) {
            updateRain(
              'unknown',
              'No Singapore rainfall station within 2.5 km.'
            )
            return
          }

          updateRain(
            nearest.rainfall > 0 ? 'raining' : 'dry',
            nearest.rainfall > 0
              ? 'Rain measured at a nearby station.'
              : 'No rain measured at the nearby station.'
          )
        } catch {
          if (!cancelled) {
            updateRain(
              'unknown',
              'Local rainfall could not be checked.'
            )
          }
        } finally {
          rainBusy = false
        }
      }

      // -----------------------------------------------
      // INITIAL FETCH AND REFRESH INTERVALS
      // -----------------------------------------------

      fetchWeather()
      fetchRain()

      // Weather refresh: every 10 minutes
      weatherInterval = setInterval(
        fetchWeather,
        600000
      )

      // Rainfall refresh: every 5 minutes
      rainInterval = setInterval(
        fetchRain,
        300000
      )

      document.addEventListener(
        'visibilitychange',
        refreshOnReturn
      )
    },
    { immediate: true }
  )

  // -----------------------------------------------
  // INITIAL LOCATION CHOICE
  // -----------------------------------------------

  if (!savedLocation.value && !locationBusy.value) {
    if (props.useDeviceLocation) {
      openLocationDialog()
    } else {
      useSingaporeLocation()
    }
  }
})

// =====================================================
// CLEANUP
// =====================================================

onUnmounted(() => {
  stopLocationWatcher?.()
  closeLocationDialog()
})
</script>

<template>
  <div class="clock-weather-widget">
    <div class="clock-weather" :title="weatherTitle"
      :aria-label="`${displayTime}, ${displayPeriod}, ${weatherDescription}, ${rainMessage}`">
      <img v-if="weatherImage" :src="weatherImage" class="weather-icon" alt="" draggable="false" />
      <span v-else class="weather-placeholder" aria-hidden="true">{{ loading ? '…' : '—' }}</span>
      <span class="clock-time">{{ displayTime }}</span>
    </div>

    <!-- One badge, aligned with the clock, with its edit control inside. -->
    <div class="weather-location-badge">
      <span class="location-badge-status" role="status">
        <span class="location-badge-icon" aria-hidden="true">{{ locationBusy ? '🧭' : '📍' }}</span>
        <span class="location-badge-label">
          {{ locationLabel }}
        </span>
      </span>
      <button
        ref="locationButton"
        type="button"
        class="location-change-button"
        title="Change location"
        aria-label="Change weather location"
        aria-haspopup="dialog"
        @click.stop="openLocationDialog"
      >

        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3.2 20.8 5 15.2 16.7 3.5a1.8 1.8 0 0 1 2.5 0l1.3 1.3a1.8 1.8 0 0 1 0 2.5L8.8 19Z" />
          <path d="m5 15.2 3.8 3.8" />
          <path d="m15.7 4.5 3.8 3.8" />
          <path d="m3.2 20.8 3.5-1.1-2.4-2.4Z" fill="currentColor" stroke="none" />
        </svg>

      </button>
    </div>
    <p v-if="locationNotice" class="location-feedback" role="status">{{ locationNotice }}</p>

    <!-- Native dialog handles focus, Escape and stacking without Teleport.
         Bootstrap's existing classes style the modal content and buttons. -->
    <dialog ref="locationDialog" class="location-dialog" aria-label="Choose weather location"
      @cancel="cancelLocationDialog" @close="restoreLocationFocus">
      <div class="modal-content p-4">
        <div class="location-header">STUDYDEX / TOWN SETUP</div>
        <div class="modal-body text-center px-0 pb-0">
          <div class="location-icon d-flex align-items-center justify-content-center mx-auto mb-3" aria-hidden="true">🗺️</div>
          <h2 class="mb-3">Find Your Town!</h2>
          <p class="location-description">Let your Pokémon experience the same weather as you!</p>
          <div class="d-flex justify-content-center gap-3 my-3 fs-4" aria-hidden="true">☀️ 🌤️ 🌧️</div>
          <p class="location-notice p-3">Use your device location for nearby weather, or use Singapore’s default location.</p>
          <p v-if="savedLocation" class="small-note">Currently using: {{ locationLabel }}</p>
          <p v-if="locationBusy" class="small-note" role="status">Finding your location… Please respond to your browser’s permission prompt.</p>
          <!-- LOCATION ACTION BUTTONS -->
          <div class="location-actions">

            <!-- Primary action -->
            <button
              type="button"
              class="location-action location-allow"
              :disabled="locationBusy"
              @click="chooseDevice"
            >
              <span class="location-action-icon">📍</span>
              <span>
                {{ locationBusy ? 'Locating…' : 'Use My Location' }}
              </span>
            </button>

            <!-- Secondary action -->
            <button
              type="button"
              class="location-action location-skip"
              @click="chooseSingapore"
            >
              {{ savedLocation ? 'Use Singapore' : 'Not Now' }}
            </button>

          </div>
          <p class="text-muted small-note mt-2 mb-0">If location access fails, Singapore’s default location will be used.</p>
          <p class="text-muted small-note mt-2 mb-0">Rainfall readings cover Singapore only.</p>
        </div>
      </div>
    </dialog>
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

/* Scale smoothly below Bootstrap's lg breakpoint (992px). */
@media (max-width: 991.98px) {
  .clock-weather {
    gap: clamp(6px, calc(3.143px + 0.893vw), 12px);
    padding: clamp(6px, calc(3.143px + 0.893vw), 12px)
      clamp(10px, calc(5.238px + 1.488vw), 20px);
  }

  .weather-icon,
  .weather-placeholder {
    width: clamp(26px, calc(19.333px + 2.083vw), 40px);
    height: clamp(26px, calc(19.333px + 2.083vw), 40px);
  }

  .weather-placeholder {
    font-size: clamp(16px, calc(13.143px + 0.893vw), 22px);
  }

  .clock-time {
    font-size: clamp(16px, calc(12.667px + 1.042vw), 23px);
  }

}

.location-feedback { max-width: 380px; margin: 6px 0 0; padding: 7px 10px; border-radius: 8px; background: #fff9e8; color: #293c60; font-size: 12px; }

/* =========================================
   STUDYDEX LOCATION MODAL
   ========================================= */

.location-dialog {
  width: min(460px, calc(100vw - 32px));
  max-width: 460px;
  max-height: calc(100dvh - 32px);

  margin: auto;
  padding: 0;

  border: 3px solid #344967;
  border-radius: 24px;

  background: #fff9e8;
  color: #293c60;

  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(10, 23, 48, 0.35);
}

.location-dialog::backdrop {
  background: rgba(10, 23, 48, 0.75);
  backdrop-filter: blur(5px);
}

/* Modal content */
.location-dialog .modal-content {
  padding: 28px !important;
  background: #fff9e8;
  border: none;
  color: #293c60;
}

/* Header */
.location-header {
  font-family: 'Silkscreen', monospace;
  font-size: 10px;
  letter-spacing: 1px;
  color: #8f7440;
}

/* Map icon */
.location-icon {
  width: 82px;
  height: 82px;

  background: #ffe68c;
  border-radius: 22px;

  font-size: 40px;
}

/* Title */
.location-dialog h2 {
  font-family: 'Silkscreen', monospace;
  font-size: clamp(18px, 4vw, 23px);
  line-height: 1.4;
  color: #293c60;
}

/* Description */
.location-description {
  margin-bottom: 16px;
  color: #687791;
  font-size: 14px;
  line-height: 1.6;
}

/* Information box */
.location-notice {
  margin: 20px 0 24px;
  padding: 16px !important;

  background: #f5ecd4;
  border-radius: 14px;

  color: #6c6046;
  font-size: 13px;
  line-height: 1.6;
}

/* =========================================
   LOCATION BUTTONS
   ========================================= */

.location-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);

  gap: 14px;
  width: 100%;

  margin: 24px 0 18px;
}

/* Shared button styling */
.location-dialog .location-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  gap: 7px;
  min-width: 0;
  min-height: 58px;

  padding: 12px 10px;

  border: 2px solid transparent;
  border-radius: 14px;

  font-size: 13px;
  font-weight: 900;
  line-height: 1.3;
  text-align: center;

  cursor: pointer;

  transition:
    transform 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease;
}

/* PRIMARY: Use My Location */
.location-dialog .location-allow {
  background: #ffde59;
  color: #293c60;
  border-color: #d6b73a;

  box-shadow:
    0 4px 0 #c49b2d,
    0 7px 12px rgba(70, 55, 20, 0.12);
}

.location-dialog .location-allow:hover:not(:disabled) {
  background: #ffe780;
  transform: translateY(-2px);

  box-shadow:
    0 6px 0 #c49b2d,
    0 9px 14px rgba(70, 55, 20, 0.16);
}

.location-dialog .location-allow:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #c49b2d;
}

.location-action-icon {
  flex-shrink: 0;
  font-size: 17px;
}

/* SECONDARY: Not Now */
.location-dialog .location-skip {
  background: #fffdf5;
  color: #62718b;
  border-color: #d7cdb5;

  box-shadow: 0 4px 0 #e1d8c4;
}

.location-dialog .location-skip:hover {
  background: #f5ecd4;
  border-color: #b6a889;
  color: #293c60;

  transform: translateY(-2px);
}

.location-dialog .location-skip:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #e1d8c4;
}

/* Disabled state */
.location-dialog .location-action:disabled {
  opacity: 0.55;
  cursor: wait;
  transform: none;
}

/* Footer text */
.location-dialog .small-note {
  color: #7c8290;
  font-size: 11px;
  line-height: 1.5;
}

/* =========================================
   MOBILE RESPONSIVENESS
   ========================================= */

@media (max-width: 420px) {
  .location-dialog {
    width: calc(100vw - 24px);
  }

  .location-dialog .modal-content {
    padding: 20px !important;
  }

  .location-actions {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-top: 20px;
  }

  .location-dialog .location-action {
    min-height: 52px;
    font-size: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .location-dialog .location-action {
    transition: none;
  }
}
/* Both pills share the same left edge, regardless of their widths. */
.clock-weather-widget {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 100%;
  padding: 0;
}
.clock-weather-widget > .clock-weather {
  align-self: flex-start;
  margin: 0;
  box-sizing: border-box;
}
.weather-location-badge {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 8px;
  max-width: 100%;
  box-sizing: border-box;
  margin: 8px 0 0;
  padding: 4px 5px 4px 11px;
  border: 1px solid #eadbb6;
  border-radius: 999px;
  background: #fff9e8;
  color: #665536;
  box-shadow: 0 3px 0 rgb(75 58 29 / 12%);
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}
.location-badge-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.location-badge-icon { flex-shrink: 0; font-size: 15px; }
.location-badge-label { overflow-wrap: anywhere; }
.location-change-button {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #745b2b;
  box-shadow: none;
  font-family: inherit;
  line-height: 1;
  cursor: pointer;
  transition: background-color 150ms ease;
}
.location-change-button:hover { background: #ffedb5; }
.location-change-button:active { background: #ffe28b; }
@media (max-width: 991.98px) {
  .weather-location-badge {
    gap: clamp(4px, calc(2.095px + 0.595vw), 8px);
    margin-top: clamp(5px, calc(3.571px + 0.446vw), 8px);
    padding: clamp(2px, calc(1.048px + 0.298vw), 4px)
      clamp(3px, calc(2.048px + 0.298vw), 5px)
      clamp(2px, calc(1.048px + 0.298vw), 4px)
      clamp(7px, calc(5.095px + 0.595vw), 11px);
    font-size: clamp(9px, calc(8.048px + 0.298vw), 11px);
  }

  .location-badge-status {
    gap: clamp(3px, calc(1.571px + 0.446vw), 6px);
  }

  .location-badge-icon {
    font-size: clamp(12px, calc(10.571px + 0.446vw), 15px);
  }

  .location-change-button {
    width: clamp(24px, calc(20.19px + 1.19vw), 32px);
    height: clamp(24px, calc(20.19px + 1.19vw), 32px);
  }

  .location-change-button svg {
    width: clamp(14px, calc(12.095px + 0.595vw), 18px);
    height: clamp(14px, calc(12.095px + 0.595vw), 18px);
  }
}
</style>

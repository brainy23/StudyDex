import {
  ref,
  computed,
  unref,
  onMounted,
  onUnmounted
} from 'vue'

// Visual lighting presets—not astronomical sunrise/sunset times.
const frames = [
  {
    hour: 0, name: 'Night',
    top: '#03091c', horizon: '#142744',
    brightness: 0.5, saturation: 0.8,
    cloud: 0.3, stars: 1, lights: 1, fireflies: 0.75,
  },
  {
    hour: 5.5, name: 'Night',
    top: '#081229', horizon: '#354564',
    brightness: 0.38, saturation: 0.7,
    cloud: 0.38, stars: 0.8, lights: 1, fireflies: 0.5,
  },
  {
    hour: 8, name: 'Day',
    top: '#258be0', horizon: '#c7eeff',
    brightness: 1, saturation: 1.06,
    cloud: 1, stars: 0, lights: 0, fireflies: 0,
  },
  {
    hour: 12, name: 'Day',
    top: '#1685df', horizon: '#c4efff',
    brightness: 1.04, saturation: 1.1,
    cloud: 1, stars: 0, lights: 0, fireflies: 0,
  },
  {
    hour: 15.5, name: 'Afternoon',
    top: '#579bd5', horizon: '#ffe0ad',
    brightness: 1.02, saturation: 1.08,
    cloud: 0.95, stars: 0, lights: 0, fireflies: 0,
  },
  {
    hour: 18.5, name: 'Sunset',
    top: '#67518e', horizon: '#ffad7b',
    brightness: 0.82, saturation: 1.05,
    cloud: 0.78, stars: 0.03, lights: 0.15, fireflies: 0.05,
  },
  {
    hour: 19.25, name: 'Dusk',
    top: '#30345f', horizon: '#a77b9d',
    brightness: 0.58, saturation: 0.85,
    cloud: 0.58, stars: 0.35, lights: 0.55, fireflies: 0.35,
  },
  {
    hour: 20.5, name: 'Evening',
    top: '#101f43', horizon: '#405477',
    brightness: 0.43, saturation: 0.75,
    cloud: 0.4, stars: 0.75, lights: 0.9, fireflies: 0.65,
  },
  {
    hour: 22, name: 'Night',
    top: '#03091c', horizon: '#142744',
    brightness: 0.5, saturation: 0.8,
    cloud: 0.3, stars: 1, lights: 1, fireflies: 0.75,
  },
]

// Add midnight's endpoint without modifying the original frames.
const interpolationFrames = [
  ...frames,
  { ...frames[0], hour: 24 }
]

const numericalProperties = [
  'brightness',
  'saturation',
  'cloud',
  'stars',
  'lights',
  'fireflies'
]

function lerp(a, b, t) {
  return a + (b - a) * t
}

function mixColor(firstHex, secondHex, t) {
  const toRgb = hex =>
    hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16))

  const first = toRgb(firstHex)
  const second = toRgb(secondHex)

  const result = first.map((value, index) =>
    Math.round(lerp(value, second[index], t))
  )

  return `rgb(${result.join(',')})`
}

// Shared across every component using this file.
const globalPreviewHour = ref(null)

export function useTimePreview() {
  function setPreviewHour(value) {
    if (value === '' || value === null || value === undefined) return

    const number = Number(value)
    if (!Number.isFinite(number)) return

    const clamped = Math.max(0, Math.min(24, number))
    globalPreviewHour.value = clamped === 24 ? 0 : clamped
  }

  function resetPreview() {
    globalPreviewHour.value = null
  }

  return {
    previewHour: computed(() => globalPreviewHour.value),
    isPreview: computed(() => globalPreviewHour.value !== null),
    setPreviewHour,
    resetPreview,
  }
}

export function useTimeOfDay({
  live = true,
  previewHour = 12,
} = {}) {
  const realTime = ref(new Date())
  let clockInterval

  function refreshClock() {
    realTime.value = new Date()
  }

  function refreshOnVisibilityChange() {
    if (document.visibilityState === 'visible') refreshClock()
  }

  const effectivePreviewHour = computed(() => {
    // Global testing controls take priority over local page previews.
    if (globalPreviewHour.value !== null) {
      return globalPreviewHour.value
    }

    // Preserve existing per-page preview support.
    if (!unref(live)) {
      const value = Number(unref(previewHour))

      if (Number.isFinite(value)) {
        const clamped = Math.max(0, Math.min(24, value))
        return clamped === 24 ? 0 : clamped
      }
    }

    return null
  })

  const currentTime = computed(() => {
    const preview = effectivePreviewHour.value
    if (preview === null) return realTime.value

    const date = new Date(realTime.value)
    const totalSeconds = Math.floor(preview * 3600)

    date.setHours(
      Math.floor(totalSeconds / 3600),
      Math.floor((totalSeconds % 3600) / 60),
      totalSeconds % 60,
      0,
    )

    return date
  })

  const hour = computed(() => {
    if (effectivePreviewHour.value !== null) {
      return effectivePreviewHour.value
    }

    const now = realTime.value

    return (
      now.getHours() +
      now.getMinutes() / 60 +
      now.getSeconds() / 3600
    )
  })

  const lighting = computed(() => {
    const index = interpolationFrames.findIndex((frame, i) =>
      i < interpolationFrames.length - 1 &&
      hour.value >= frame.hour &&
      hour.value < interpolationFrames[i + 1].hour
    )

    const safeIndex = Math.max(0, index)
    const a = interpolationFrames[safeIndex]
    const b = interpolationFrames[safeIndex + 1]

    const progress = Math.max(
      0,
      Math.min(1, (hour.value - a.hour) / (b.hour - a.hour)),
    )

    const t = progress * progress * (3 - 2 * progress)

    const result = {
      name: t < 0.5 ? a.name : b.name,
      top: mixColor(a.top, b.top, t),
      horizon: mixColor(a.horizon, b.horizon, t),
    }

    for (const property of numericalProperties) {
      result[property] = lerp(a[property], b[property], t)
    }

    return result
  })

  onMounted(() => {
    refreshClock()
    clockInterval = setInterval(refreshClock, 1000)

    document.addEventListener(
      'visibilitychange',
      refreshOnVisibilityChange,
    )
    window.addEventListener('focus', refreshClock)
  })

  onUnmounted(() => {
    clearInterval(clockInterval)

    document.removeEventListener(
      'visibilitychange',
      refreshOnVisibilityChange,
    )
    window.removeEventListener('focus', refreshClock)
  })

  return {
    currentTime,
    hour,
    lighting,
  }
}
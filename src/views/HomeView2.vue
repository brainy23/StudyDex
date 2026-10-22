<script setup>
// =====================================================
// STUDYDEX HOME — STATE, API CALLS, AND INTERACTIONS
// =====================================================
import axios from 'axios'
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

// VUE TYPERR
import VueTyper from 'vue3-typer'
import 'vue3-typer/dist/vue-typer.css'



const router = useRouter()

const asset = '/town/'

const POKE_API_URL = import.meta.env.VITE_POKE_API_URL

// to be updated to match user
const MAX_XP = 200

// Sample profile matching your profile schema.
// These UUIDs are examples, not existing database records.
const user = ref({
  id: '11111111-1111-4111-8111-111111111111',
  display_name: 'Jake',
  school_level_id: null,
  created_at: '2026-10-22T06:00:00Z',
  avatar_choice: 'male',
})

// Temporary Pokémon lookup.
// Adapt these fields to your actual Pokémon table later.
// pokemon_id in user_pokemon refers to one of these UUIDs.
const pokemonCatalog = {
  '22222222-2222-4222-8222-222222222222': {
    pokeapi_id: 25,
    name: 'Pikachu',
  },
  '33333333-3333-4333-8333-333333333333': {
    pokeapi_id: 133,
    name: 'Eevee',
  },
  '44444444-4444-4444-8444-444444444444': {
    pokeapi_id: 4,
    name: 'Charmander',
  },
}

// Separate object containing the user's Pokémon records.
// Every entry matches the user_pokemon columns shown.
const userPokemon = ref({
  pokemons: [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      user_id: user.value.id,
      pokemon_id: '22222222-2222-4222-8222-222222222222',
      xp: 90,
      level: 1,
      is_selected: true,
      is_defeated: false,
      obtained_at: '2026-10-22T06:00:00Z',
    },
    {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      user_id: user.value.id,
      pokemon_id: '33333333-3333-4333-8333-333333333333',
      xp: 45,
      level: 1,
      is_selected: false,
      is_defeated: false,
      obtained_at: '2026-10-22T06:05:00Z',
    },
    {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      user_id: user.value.id,
      pokemon_id: '44444444-4444-4444-8444-444444444444',
      xp: 60,
      level: 1,
      is_selected: false,
      is_defeated: false,
      obtained_at: '2026-10-22T06:10:00Z',
    },
  ],
})

const ownedPokemon = computed(() =>
  userPokemon.value.pokemons
    .filter(record => record.user_id === user.value.id)
    .map(record => {
      const details = pokemonCatalog[record.pokemon_id]

      return {
        ownedId: record.id,
        id: details?.pokeapi_id ?? null,
        name: details?.name ?? 'Unknown Pokémon',
        xp: record.xp,
        level: record.level,
        is_selected: record.is_selected,
        is_defeated: record.is_defeated,
      }
    })
)

const activeBuddy = computed(() =>
  ownedPokemon.value.find(pokemon => pokemon.is_selected) ?? {
    ownedId: null,
    id: null,
    name: 'No buddy selected',
    xp: 0,
    level: 1,
    is_defeated: false,
  }
)

const buildingButtons = [
  {
    id: 'arena',
    title: 'Poké Arena',
    subtitle: 'Take a Quiz',
    icon: asset+ 'poke_arena.png',
    left: '21%',
    top: '55%',
    path: '/quiz',
  },
  {
    id: 'laboratory',
    title: 'Poké Lab',
    subtitle: 'Study Your Decks',
    icon: asset+ 'poke_study.png',
    left: '54.5%',
    top: '53%',
    path: '/study-decks',
  },
  {
    id: 'trainer',
    title: 'Trainer House',
    subtitle: 'View Your Progress',
    icon: asset+ 'poke_home.png',
    left: '83%',
    top: '67%',
    path: '/trainer',
  },
]

function selectBuilding(building) {
  router.push(building.path)
}

const live = ref(true)
const previewHour = ref(12)
const currentTime = ref(new Date())

let clockInterval

// AUTO PREVIEWW
const autoPreview = ref(false)

let previewInterval

// Real seconds needed to preview one full day
const cycleDuration = 60

function stopAutoPreview() {
  clearInterval(previewInterval)
  previewInterval = undefined
  autoPreview.value = false
}

function startAutoPreview() {
  stopAutoPreview()

  live.value = false
  autoPreview.value = true
  previewHour.value = 6 // Start at 6 AM

  const startTime = performance.now()
  const startHour = previewHour.value

  previewInterval = setInterval(() => {
    const elapsedSeconds = (performance.now() - startTime) / 1000

    previewHour.value =
      (startHour + (elapsedSeconds / cycleDuration) * 24) % 24
  }, 50)
}

function toggleAutoPreview() {
  if (autoPreview.value) {
    stopAutoPreview()
  } else {
    startAutoPreview()
  }
}

// ==========================================
// 1. WEATHER DATA
// ==========================================
const temperature = ref(null)
const weatherCode = ref(null)
const cloudCover = ref(null)
const isDay = ref(true)

const isRaining = ref(false)
const rainDataAvailable = ref(false)

// Default: Singapore (fallback location)
const latitude = ref(1.3521)
const longitude = ref(103.8198)

let weatherInterval
let rainInterval

// ==========================================
// 2. GET USER'S DEVICE LOCATION
// ==========================================
function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported')
      resolve()
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        latitude.value = position.coords.latitude
        longitude.value = position.coords.longitude

        console.log('Device location:', latitude.value, longitude.value)
        resolve()
      },
      (error) => {
        console.warn('Using default Singapore location:', error.message)
        resolve()
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  })
}

const showLocationModal = ref(false)

let weatherStarted = false
let weatherPageActive = false


async function chooseLocation(useDeviceLocation) {
  console.log('hai in choose location')
  if (weatherStarted) return

  weatherStarted = true

  // Close location modal
  showLocationModal.value = false

  // Request device location if user agrees
  if (useDeviceLocation) {
    await getUserLocation()
  }

  if (!weatherPageActive) return

  // Fetch weather using selected location
  fetchWeather()
  fetchActualRain()

  // Update weather every 10 minutes
  weatherInterval = setInterval(fetchWeather, 600000)

  // Update rainfall every 5 minutes
  rainInterval = setInterval(fetchActualRain, 300000)
}



// ==========================================
// 3. FETCH WEATHER FROM OPEN-METEO
// ==========================================
async function fetchWeather() {
  try {
    const response = await axios.get(
      'https://api.open-meteo.com/v1/forecast',
      {
        params: {
          latitude: latitude.value,
          longitude: longitude.value,
          current: 'temperature_2m,weather_code,cloud_cover,is_day',
          timezone: 'auto'
        }
      }
    )

    const current = response.data.current

    temperature.value = current.temperature_2m
    weatherCode.value = current.weather_code
    cloudCover.value = current.cloud_cover
    isDay.value = current.is_day === 1

    console.log('Open-Meteo weather:', current)

  } catch (error) {
    console.error('Error fetching weather:', error)
  }
}

// ==========================================
// 4. CALCULATE DISTANCE BETWEEN LOCATIONS
// ==========================================
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = deg => deg * Math.PI / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2

  return 2 * R * Math.asin(Math.sqrt(a))
}

// ==========================================
// 5. CHECK ACTUAL RAINFALL USING NEA
// ==========================================
async function fetchActualRain() {
  try {
    const response = await axios.get(
      'https://api-open.data.gov.sg/v2/real-time/api/rainfall'
    )

    const { stations, readings } = response.data.data

    const latest = readings?.[0]

    if (!latest) {
      rainDataAvailable.value = false
      isRaining.value = false
      return
    }

    // Only use recent rainfall measurements
    const ageMinutes =
      (Date.now() - new Date(latest.timestamp).getTime()) / 60000

    if (
      !Number.isFinite(ageMinutes) ||
      ageMinutes < 0 ||
      ageMinutes > 12
    ) {
      rainDataAvailable.value = false
      isRaining.value = false
      return
    }

    // Match each station with its rainfall reading
    const rainValues = new Map(
      latest.data.map(item => [
        item.stationId,
        item.value
      ])
    )

    // Find nearest station with a valid reading
    const nearestStation = stations
      .filter(station =>
        station.location &&
        Number.isFinite(rainValues.get(station.id))
      )
      .map(station => ({
        name: station.name,
        distance: getDistance(
          latitude.value,
          longitude.value,
          station.location.latitude,
          station.location.longitude
        ),
        rainfall: rainValues.get(station.id)
      }))
      .filter(station => station.distance <= 2.5)
      .sort((a, b) => a.distance - b.distance)[0]

    // No sufficiently nearby station
    if (!nearestStation) {
      rainDataAvailable.value = false
      isRaining.value = false
      return
    }

    rainDataAvailable.value = true

    // Rain only when nearby station measured rainfall
    isRaining.value = nearestStation.rainfall > 0

    console.log('Nearest station:', nearestStation.name)
    console.log('Distance (km):', nearestStation.distance)
    console.log('Rainfall (mm):', nearestStation.rainfall)
    console.log('Is raining:', isRaining.value)

  } catch (error) {
    console.error('Error fetching NEA rainfall:', error)
    rainDataAvailable.value = false
    isRaining.value = false
  }
}

// ==========================================
// 6. DETERMINE WEATHER IMAGE
// ==========================================
const weatherImg = computed(() => {
  if (rainActive.value) {
    return '/assets/rain.png'
  }

  if (weatherCode.value === null) return null

  if (!isDay.value) {
    return '/assets/moon.png'
  }

  if (cloudCover.value >= 70) {
    return '/assets/cloud.png'
  }

  if (cloudCover.value >= 20) {
    return '/assets/suncloud.png'
  }

  return '/assets/sun.png'
})


const hour = computed(() => {
  if (!live.value) return Number(previewHour.value)

  const now = currentTime.value
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
})

/*
  Each row is a lighting keyframe.
  Values smoothly transition between neighbouring keyframes.

  Times are visual presets, not astronomical sunrise/sunset times.
*/
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

frames.push({ ...frames[0], hour: 24 })

const lerp = (a, b, t) => a + (b - a) * t

function mixColor(a, b, t) {
  const rgb = hex => hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v, 16))
  const first = rgb(a)
  const second = rgb(b)

  return `rgb(${first.map((v, i) =>
    Math.round(lerp(v, second[i], t))
  ).join(',')})`
}

const lighting = computed(() => {
  const h = hour.value
  const index = frames.findIndex((frame, i) =>
    i < frames.length - 1 &&
    h >= frame.hour &&
    h < frames[i + 1].hour
  )

  const a = frames[Math.max(0, index)]
  const b = frames[Math.max(0, index) + 1]
  const progress = (h - a.hour) / (b.hour - a.hour)

  // Smooth easing between lighting keyframes
  const t = progress * progress * (3 - 2 * progress)

  const result = {
    name: t < 0.5 ? a.name : b.name,
    top: mixColor(a.top, b.top, t),
    horizon: mixColor(a.horizon, b.horizon, t),
  }

  for (const key of [
    'brightness', 'saturation', 'cloud',
    'stars', 'lights', 'fireflies',
  ]) {
    result[key] = lerp(a[key], b[key], t)
  }

  return result
})

const worldStyle = computed(() => ({
  filter: `brightness(${lighting.value.brightness})
           saturate(${lighting.value.saturation})`,
}))

// Sun crosses the sky between 06:00 and 19:00.
// Moon crosses between 19:00 and 06:00.
function celestialStyle(isMoon) {
  const h = hour.value
  const progress = isMoon
    ? ((h - 19 + 24) % 24) / 11
    : (h - 6) / 13

  const visible =
  progress > 0 &&
  progress < 1 &&
  !rainActive.value
  const p = Math.max(0, Math.min(1, progress))

  return {
    left: `${12 + p * 76}%`,
    top: `${25 - Math.sin(p * Math.PI) * 19}%`,
    opacity: visible
      ? Math.min(1, p * 10, (1 - p) * 10)
      : 0,
  }
}

const displayTime = computed(() => {
  const minutes = Math.floor(hour.value * 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
    minutes % 60
  ).padStart(2, '0')}`
})

// ==========================================
// RAIN + UMBRELLA
// ==========================================

// Set true to test. Set false to use actual weather.
const rainPreview = ref(false)


const rainActive = computed(() =>
  rainPreview.value || isRaining.value
)

const rainCanvas = ref(null)
const umbrellaImage = ref(null)

const umbrellaReady = ref(false)
const umbrellaFailed = ref(false)

const showUmbrella = computed(() =>
  rainActive.value &&
  !!townBuddyImage.value &&
  !buddyError.value &&
  !umbrellaFailed.value
)

let rainContext
let rainObserver
let rainMotionQuery

let rainFrame = 0
let rainLastTime = 0
let rainWidth = 0
let rainHeight = 0

let rainParticles = []
let rainSplashes = []
let canopyProfile = []

// Read the umbrella's top outline from the transparent PNG.
// Only scan the upper 65% so the handle is excluded.
function prepareUmbrella(event) {
  const image = event.target

  const sample = document.createElement('canvas')
  sample.width = 128
  sample.height = 86

  const context = sample.getContext('2d', {
    willReadFrequently: true
  })

  if (!context) return

  context.drawImage(
    image,
    0,
    0,
    sample.width,
    sample.height
  )

  try {
    const pixels = context.getImageData(
      0,
      0,
      sample.width,
      sample.height
    ).data

    canopyProfile = []

    for (let x = 0; x < sample.width; x++) {
      for (let y = 0; y < sample.height * 0.65; y++) {
        const alphaIndex =
          (y * sample.width + x) * 4 + 3

        if (pixels[alphaIndex] >= 160) {
          canopyProfile.push({
            x: x / sample.width,
            y: y / sample.height
          })

          break
        }
      }
    }
  } catch {
    // Fallback dome if a remotely hosted image cannot be sampled.
    canopyProfile = Array.from(
      { length: 65 },
      (_, index) => {
        const progress = index / 64

        return {
          x: 0.07 + progress * 0.86,
          y: 0.08 + 0.47 * (2 * progress - 1) ** 2
        }
      }
    )
  }

  umbrellaReady.value = canopyProfile.length > 1
}

// Convert the umbrella outline into canvas coordinates.
// Reading its position each frame keeps the shield aligned.
function getRainCanopy() {
  if (
    !showUmbrella.value ||
    !umbrellaReady.value ||
    !umbrellaImage.value ||
    !rainCanvas.value
  ) {
    return null
  }

  const canvasBox =
    rainCanvas.value.getBoundingClientRect()

  const imageBox =
    umbrellaImage.value.getBoundingClientRect()

  if (!canvasBox.width || !canvasBox.height) {
    return null
  }

  const scaleX = rainWidth / canvasBox.width
  const scaleY = rainHeight / canvasBox.height

  return canopyProfile.map(point => ({
    x: (
      imageBox.left -
      canvasBox.left +
      point.x * imageBox.width
    ) * scaleX,

    y: (
      imageBox.top -
      canvasBox.top +
      point.y * imageBox.height
    ) * scaleY
  }))
}

// Find the canopy height directly underneath a raindrop.
function roofHeight(points, x) {
  if (
    !points ||
    x < points[0].x ||
    x > points[points.length - 1].x
  ) {
    return null
  }

  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]
    const current = points[index]

    if (x <= current.x) {
      const progress =
        (x - previous.x) /
        (current.x - previous.x)

      return previous.y +
        (current.y - previous.y) * progress
    }
  }

  return null
}

function makeRainDrop(seed = false) {
  return {
    x: Math.random() * rainWidth,

    y: seed
      ? Math.random() * rainHeight
      : -40 - Math.random() * 80,

    speed: 650 + Math.random() * 400,
    length: 14 + Math.random() * 18,
    opacity: 0.22 + Math.random() * 0.35
  }
}

function resizeRain() {
  const canvas = rainCanvas.value

  if (!canvas || !rainContext) return

  rainWidth = canvas.clientWidth
  rainHeight = canvas.clientHeight

  const pixelRatio = Math.min(
    window.devicePixelRatio || 1,
    2
  )

  canvas.width = Math.round(rainWidth * pixelRatio)
  canvas.height = Math.round(rainHeight * pixelRatio)

  rainContext.setTransform(
    pixelRatio,
    0,
    0,
    pixelRatio,
    0,
    0
  )

  const count = Math.max(
    35,
    Math.min(
      150,
      Math.round(rainWidth * rainHeight / 12000)
    )
  )

  rainParticles = Array.from(
    { length: count },
    () => makeRainDrop(true)
  )

  rainSplashes = []
}

function animateRain(time) {
  const deltaTime = rainLastTime
    ? Math.min((time - rainLastTime) / 1000, 0.035)
    : 0

  rainLastTime = time

  const context = rainContext
  const canopy = getRainCanopy()

  context.clearRect(0, 0, rainWidth, rainHeight)

  context.save()

  // Draw rain everywhere except the area below the canopy.
  // This also hides drops initially spawned inside the sheltered area.
  context.beginPath()
  context.rect(0, 0, rainWidth, rainHeight)

  if (canopy) {
    context.moveTo(
      canopy[0].x,
      rainHeight + 100
    )

    canopy.forEach(point => {
      context.lineTo(point.x, point.y)
    })

    context.lineTo(
      canopy[canopy.length - 1].x,
      rainHeight + 100
    )

    context.closePath()
  }

  context.clip('evenodd')
  context.lineWidth = 1
  context.lineCap = 'round'

  for (let index = 0; index < rainParticles.length; index++) {
    const drop = rainParticles[index]
    const previousY = drop.y

    drop.y += drop.speed * deltaTime

    const roof = roofHeight(canopy, drop.x)

    // Drop hits the umbrella.
    if (roof !== null && drop.y >= roof) {
      if (
        previousY < roof &&
        rainSplashes.length < 60
      ) {
        for (const direction of [-1, 1]) {
          rainSplashes.push({
            x: drop.x,
            y: roof - 2,
            vx: direction * (25 + Math.random() * 35),
            vy: -45 - Math.random() * 35,
            life: 0.22,
            maxLife: 0.22
          })
        }
      }

      // Start a new drop above the screen.
      rainParticles[index] = makeRainDrop()
      continue
    }

    // Drop leaves the screen.
    if (drop.y - drop.length > rainHeight) {
      rainParticles[index] = makeRainDrop()
      continue
    }

    context.strokeStyle =
      `rgba(210, 230, 255, ${drop.opacity})`

    context.beginPath()

    context.moveTo(
      drop.x,
      drop.y - drop.length
    )

    context.lineTo(drop.x, drop.y)
    context.stroke()
  }

  // Small splash particles bounce away from the canopy.
  rainSplashes = rainSplashes.filter(
    splash => splash.life > 0
  )

  for (const splash of rainSplashes) {
    splash.life -= deltaTime

    splash.x += splash.vx * deltaTime
    splash.y += splash.vy * deltaTime
    splash.vy += 300 * deltaTime

    const opacity = Math.max(
      0,
      splash.life / splash.maxLife
    ) * 0.8

    context.fillStyle =
      `rgba(220, 240, 255, ${opacity})`

    context.fillRect(
      splash.x,
      splash.y,
      2,
      2
    )
  }

  context.restore()

  rainFrame = requestAnimationFrame(animateRain)
}

function syncRainAnimation() {
  cancelAnimationFrame(rainFrame)

  rainFrame = 0
  rainLastTime = 0

  if (!rainContext) return

  rainContext.clearRect(
    0,
    0,
    rainWidth,
    rainHeight
  )

  if (
    rainActive.value &&
    !document.hidden &&
    !rainMotionQuery?.matches
  ) {
    rainFrame = requestAnimationFrame(animateRain)
  } else {
    rainParticles = rainParticles.map(
      () => makeRainDrop(true)
    )

    rainSplashes = []
  }
}

watch(rainActive, syncRainAnimation, {
  flush: 'post'
})

// These can coexist with your existing lifecycle hooks.
onMounted(() => {
  rainContext = rainCanvas.value?.getContext('2d')

  if (!rainContext) return

  rainMotionQuery = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  )

  rainMotionQuery.addEventListener(
    'change',
    syncRainAnimation
  )

  document.addEventListener(
    'visibilitychange',
    syncRainAnimation
  )

  rainObserver = new ResizeObserver(resizeRain)
  rainObserver.observe(rainCanvas.value)

  resizeRain()
  syncRainAnimation()
})

onUnmounted(() => {
  cancelAnimationFrame(rainFrame)

  rainObserver?.disconnect()

  rainMotionQuery?.removeEventListener(
    'change',
    syncRainAnimation
  )

  document.removeEventListener(
    'visibilitychange',
    syncRainAnimation
  )
})

 // TODAY'S STUDY GOALS
const goalsOpen = ref(false)
const questReady = ref(false)
let questBootTimer

watch(goalsOpen, (isOpen) => {
  clearTimeout(questBootTimer)
  questReady.value = false

  if (isOpen) {
    questBootTimer = setTimeout(() => {
      questReady.value = true
    }, 2100)
  }
})

// TO-DOS — shared by the notepad and the quest screen.
// Completion dates follow the device's local calendar, not the town preview clock.
const TODO_STORAGE_KEY = 'studydex-todos-v1'
const todos = ref([])
const todoDialog = ref(null)
const todoInput = ref(null)
const newTodoTitle = ref('')
const editingTodoId = ref(null)
const editTodoTitle = ref('')
const todoStorageNotice = ref('')
let todoMidnightTimer


const remainingTodoCount = computed(() => todos.value.filter(todo => !todo.completedAt).length)
const completedTodoCount = computed(() => todos.value.length - remainingTodoCount.value)
const orderedTodos = computed(() => [
  ...todos.value.filter(todo => !todo.completedAt),
  ...todos.value.filter(todo => todo.completedAt),
])
const remainingTodoLabel = computed(() =>
  `${remainingTodoCount.value} to-do${remainingTodoCount.value === 1 ? '' : 's'} remaining`
)

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function removePastCompletedTodos() {
  const today = localDateKey()
  const kept = todos.value.filter(todo => !todo.completedAt || todo.completedAt >= today)
  if (kept.length !== todos.value.length) todos.value = kept
}

function saveTodos() {
  try {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos.value))
    todoStorageNotice.value = ''
  } catch {
    todoStorageNotice.value = 'Browser storage is unavailable. Changes will only last for this visit.'
  }
}

function loadTodos() {
  try {
    const saved = JSON.parse(localStorage.getItem(TODO_STORAGE_KEY) || '[]')
    if (!Array.isArray(saved)) throw new Error('Invalid saved to-dos')
    todos.value = saved.filter(todo =>
      todo && typeof todo.id === 'string' && typeof todo.title === 'string' &&
      todo.title.trim() && (todo.completedAt === null ||
        (typeof todo.completedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todo.completedAt)))
    )
    removePastCompletedTodos()
  } catch {
    todoStorageNotice.value = 'Saved to-dos could not be loaded in this browser.'
  }
}

watch(todos, saveTodos, { deep: true })

function scheduleTodoCleanup() {
  clearTimeout(todoMidnightTimer)
  removePastCompletedTodos()
  const now = new Date()
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  todoMidnightTimer = setTimeout(scheduleTodoCleanup, midnight - now + 100)
}

function refreshTodosOnReturn() {
  if (!document.hidden) scheduleTodoCleanup()
}

function addTodo() {
  const title = newTodoTitle.value.trim()
  if (!title) return
  removePastCompletedTodos()
  todos.value.push({ id: crypto.randomUUID(), title, completedAt: null })
  newTodoTitle.value = ''
  todoInput.value?.focus()
}

function toggleTodo(todo) {
  removePastCompletedTodos()
  if (!todos.value.some(item => item.id === todo.id)) return
  todo.completedAt = todo.completedAt ? null : localDateKey()
}

async function startEditingTodo(todo) {
  editingTodoId.value = todo.id
  editTodoTitle.value = todo.title
  await nextTick()
  const input = todoDialog.value?.querySelector('.todo-edit-input')
  input?.focus()
  input?.select()
}

function saveTodoEdit(todo) {
  const title = editTodoTitle.value.trim()
  if (!title) return
  todo.title = title
  editingTodoId.value = null
}

function deleteTodo(todo) {
  todos.value = todos.value.filter(item => item.id !== todo.id)
  if (editingTodoId.value === todo.id) editingTodoId.value = null
}


onMounted(() => {
  weatherPageActive = true
  // Show location modal
  showLocationModal.value = true
  console.log('Page mounted — location modal:', showLocationModal.value)

  // Existing to-do setup
  loadTodos()
  scheduleTodoCleanup()
  document.addEventListener('visibilitychange', refreshTodosOnReturn)
  window.addEventListener('focus', refreshTodosOnReturn)

  // Update clock every second
  clockInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)

  // Retrieve Pokeball
  getPokeBall()


})

onUnmounted(() => {
  weatherPageActive = false

  clearTimeout(todoMidnightTimer)
  document.removeEventListener('visibilitychange', refreshTodosOnReturn)
  window.removeEventListener('focus', refreshTodosOnReturn)

  clearInterval(clockInterval)
  clearInterval(weatherInterval)
  clearInterval(rainInterval)

  stopAutoPreview()
  clearTimeout(questBootTimer)
})


function closeGoals() {
  goalsOpen.value = false
}

// const defaultBuddy = {
//   id: 25,
//   name: 'Pikachu',
// }

// function loadActiveBuddy() {
//   try {
//     const saved = JSON.parse(
//       localStorage.getItem('studydex-active-buddy')
//     )

//     if (
//       saved &&
//       Number.isInteger(saved.id) &&
//       saved.id > 0 &&
//       typeof saved.name === 'string' &&
//       saved.name.trim()
//     ) {
//       return {
//         id: saved.id,
//         name: saved.name,
//       }
//     }
//   } catch {
//     // Use Pikachu if saved data is missing or unreadable.
//   }

//   return { ...defaultBuddy }
// }

// const activeBuddy = ref(loadActiveBuddy())

// POKÉAPI BUDDY DATA
const buddyData = ref(null)
const buddyLoading = ref(false)
const buddyError = ref('')

// Cache responses during this visit.
const pokemonCache = new Map()

const activeBuddyImage = computed(() => {
  const sprites = buddyData.value?.sprites

  if (!sprites) return ''

  return (
    sprites.versions?.['generation-v']?.['black-white']
      ?.animated?.front_default ||
    sprites.front_default ||
    sprites.other?.['official-artwork']?.front_default ||
    ''
  )
})

// Reload whenever the selected buddy changes.
watch(
  () => activeBuddy.value.id,
  async (pokemonId, previousId, onCleanup) => {
    if (!pokemonId) {
      buddyData.value = null
      buddyLoading.value = false
      buddyError.value = ''
      return
    }
    const controller = new AbortController()
    let cancelled = false

    // Prevent an older request replacing a newly selected buddy.
    onCleanup(() => {
      cancelled = true
      controller.abort()
    })

    buddyLoading.value = true
    buddyError.value = ''
    buddyData.value = null

    try {
      let data = pokemonCache.get(pokemonId)

      if (!data) {
        const response = await fetch(
          `${POKE_API_URL}/pokemon/${pokemonId}/`,
          { signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error('Unable to load Pokémon')
        }

        data = await response.json()
        pokemonCache.set(pokemonId, data)
      }

      if (!cancelled) {
        buddyData.value = data
      }
    } catch (error) {
      if (!cancelled && error.name !== 'AbortError') {
        buddyError.value = 'Your buddy could not load. Try again shortly.'
      }
    } finally {
      if (!cancelled) {
        buddyLoading.value = false
      }
    }
  },
  { immediate: true }
)

const pokeball = ref(null)
async function getPokeBall() {
  try {
    const response = await axios.get(
      `${POKE_API_URL}/item/poke-ball/`
    )

    pokeball.value = response.data.sprites.default
  } catch (error) {
    console.error('Unable to load Poké Ball:', error)
  }
}


// Call this when a Pokémon is selected as the active buddy.
function setActiveBuddy(pokemon) {
  const selectedRecord = userPokemon.value.pokemons.find(
    record =>
      record.id === pokemon.ownedId &&
      record.user_id === user.value.id
  )

  if (!selectedRecord) return

  userPokemon.value.pokemons.forEach(record => {
    if (record.user_id === user.value.id) {
      record.is_selected = record.id === selectedRecord.id
    }
  })
}
// Sleep from 10 PM until 6 AM.
// Uses your existing clock, including the time preview.
const buddySleeping = computed(() =>
  hour.value >= 24 || hour.value < 6
)

const ballShaking = ref(false)

function shakePokeball() {
  if (!buddySleeping.value || !pokeball.value) return

  ballShaking.value = true
}

const townBuddyImage = computed(() => {
  const sprites = buddyData.value?.sprites

  if (buddySleeping.value) {
    return pokeball.value || sprites?.front_default || ''
  }

  return activeBuddyImage.value
})
// Sample count — connect this to the user's inventory later.
const unopenedPackCount = ref(3)

const unopenedPackLabel = computed(() =>
  unopenedPackCount.value > 99
    ? '99+'
    : String(unopenedPackCount.value)
)

// TRAINER PROFILE based on data
const trainerProfile = computed(() => ({
  name: user.value.display_name,
  avatar: user.value.avatar_choice,
}))

const profileMenuOpen = ref(false)

// const trainerAvatarImage = computed(() =>
//   `${asset}trainer-${trainerProfile.value.avatar}.png`
// )

// Sample progress per Pokémon.
// // Later, use the user's owned Pokémon ID if they can own duplicates.
// const buddyTraining = ref({
//   25: { level: 5, exp: 120, expToNextLevel: 200 },
//   133: { level: 3, exp: 45, expToNextLevel: 100 },
//   1: { level: 2, exp: 30, expToNextLevel: 80 },
//   4: { level: 4, exp: 90, expToNextLevel: 150 },
// })

// const activeBuddyTraining = computed(() =>
//   buddyTraining.value[activeBuddy.value.id] ?? {
//     level: 1,
//     exp: 0,
//     expToNextLevel: 100,
//   }
// )


const activeBuddyTraining = computed(() => ({
  level: activeBuddy.value.level,
  exp: activeBuddy.value.xp,
  expToNextLevel: MAX_XP,
}))

const buddyExpTarget = computed(() =>
  Math.max(1, activeBuddyTraining.value.expToNextLevel)
)

const buddyExpValue = computed(() =>
  Math.min(
    Math.max(0, activeBuddyTraining.value.exp),
    buddyExpTarget.value
  )
)

// Static sprite for the small profile icon.
// The API data is already fetched by your existing buddy code.
const profileBuddyIcon = computed(() =>
  buddyData.value?.sprites?.front_default ||
  buddyData.value?.sprites?.other?.['official-artwork']
    ?.front_default ||
  ''
)

const profileTrigger = ref(null)

function closeProfileMenu(restoreFocus = false) {
  profileMenuOpen.value = false

  if (restoreFocus) {
    profileTrigger.value?.focus()
  }
}

// These actions can be connected to dialogs/pages later.
const profileNotice = ref('')

function selectProfileAction(action) {
  closeProfileMenu(true)

  const messages = {
    name: 'Edit name will be connected to your profile editor.',
    avatar: 'Change avatar will open your trainer selection.',
    progress: 'My Progress will open your progress page.',
    settings: 'Settings will include sound and accessibility options.',
    logout: 'Log out will be connected to your sign-in system.',
  }

  profileNotice.value = messages[action] || ''
}

// QUEST DEVICE TABS
const questTab = ref('todos')

// Sample owned Pokémon — replace with the user's inventory later.

function pokemonSprite(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

function chooseQuestBuddy(pokemon) {
  setActiveBuddy(pokemon)
}


// ==========================================
// DRAGGABLE UMBRELLA
// ==========================================

const buddyCharacter = ref(null)

const umbrellaOffset = ref({ x: 0, y: 0 })
const umbrellaDragging = ref(false)
const buddySheltered = ref(true)

const umbrellaPosition = computed(() => ({
  '--umbrella-x': `${umbrellaOffset.value.x}px`,
  '--umbrella-y': `${umbrellaOffset.value.y}px`
}))

const buddyGettingWet = computed(() =>
  showUmbrella.value &&
  umbrellaReady.value &&
  !buddySheltered.value
)

let umbrellaDrag = null
let umbrellaTrackingFrame = 0

function startUmbrellaDrag(event) {
  if (
    !showUmbrella.value ||
    !umbrellaReady.value ||
    !event.isPrimary ||
    event.button !== 0
  ) return

  event.preventDefault()

  umbrellaDragging.value = true

  umbrellaDrag = {
    pointerId: event.pointerId,
    element: event.currentTarget,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: umbrellaOffset.value.x,
    offsetY: umbrellaOffset.value.y
  }

  // Continue dragging even when the pointer leaves the umbrella.
  event.currentTarget.setPointerCapture(event.pointerId)
}

// Keep the complete umbrella inside the town.
function moveUmbrellaTo(x, y) {
  const image = umbrellaImage.value
  const scene = rainCanvas.value

  if (!image || !scene) return

  const imageBox = image.getBoundingClientRect()
  const sceneBox = scene.getBoundingClientRect()

  const current = umbrellaOffset.value

  const minX = current.x + sceneBox.left - imageBox.left
  const maxX = current.x + sceneBox.right - imageBox.right

  // Allow a little space for its floating animation.
  const minY = current.y + sceneBox.top - imageBox.top + 8
  const maxY = current.y + sceneBox.bottom - imageBox.bottom - 8

  umbrellaOffset.value = {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y))
  }
}

function moveUmbrellaDrag(event) {
  if (
    !umbrellaDrag ||
    event.pointerId !== umbrellaDrag.pointerId
  ) return

  moveUmbrellaTo(
    umbrellaDrag.offsetX +
      event.clientX -
      umbrellaDrag.startX,

    umbrellaDrag.offsetY +
      event.clientY -
      umbrellaDrag.startY
  )
}

function stopUmbrellaDrag(event) {
  if (
    !umbrellaDrag ||
    (event && event.pointerId !== umbrellaDrag.pointerId)
  ) return

  const { element, pointerId } = umbrellaDrag

  umbrellaDrag = null
  umbrellaDragging.value = false

  if (element.hasPointerCapture(pointerId)) {
    element.releasePointerCapture(pointerId)
  }
}

function resetUmbrellaPosition() {
  stopUmbrellaDrag()

  umbrellaOffset.value = { x: 0, y: 0 }
  buddySheltered.value = true
}

// Optional keyboard controls:
// Arrow keys move it; Home returns it to the Pokémon.
function handleUmbrellaKey(event) {
  if (!showUmbrella.value || !umbrellaReady.value) return

  if (event.key === 'Home') {
    event.preventDefault()
    resetUmbrellaPosition()
    return
  }

  const directions = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1]
  }

  const direction = directions[event.key]

  if (!direction) return

  event.preventDefault()

  const step = event.shiftKey ? 30 : 10

  moveUmbrellaTo(
    umbrellaOffset.value.x + direction[0] * step,
    umbrellaOffset.value.y + direction[1] * step
  )
}

// Check whether the canopy still covers the Pokémon.
// Uses the central part of the sprite box to allow for transparent margins.
function updateBuddyShelter() {
  const canopy = getRainCanopy()
  const character = buddyCharacter.value
  const canvas = rainCanvas.value

  if (!canopy || !character || !canvas) {
    buddySheltered.value = true
    return
  }

  const buddyBox = character.getBoundingClientRect()
  const canvasBox = canvas.getBoundingClientRect()

  if (!canvasBox.width || !canvasBox.height) return

  const scaleX = rainWidth / canvasBox.width
  const scaleY = rainHeight / canvasBox.height

  const headY = (
    buddyBox.top -
    canvasBox.top +
    buddyBox.height * 0.3
  ) * scaleY

  // Check the left, middle and right of the Pokémon's central area.
  buddySheltered.value = [0.25, 0.5, 0.75].every(position => {
    const x = (
      buddyBox.left -
      canvasBox.left +
      buddyBox.width * position
    ) * scaleX

    const roofY = roofHeight(canopy, x)

    return roofY !== null && roofY < headY
  })
}

// Separate from the rain animation so dragging still updates the
// dialogue when reduced-motion preferences disable falling rain.
function trackUmbrellaShelter() {
  updateBuddyShelter()

  umbrellaTrackingFrame =
    requestAnimationFrame(trackUmbrellaShelter)
}

function syncUmbrellaTracking() {
  cancelAnimationFrame(umbrellaTrackingFrame)
  umbrellaTrackingFrame = 0

  if (
    showUmbrella.value &&
    umbrellaReady.value &&
    !document.hidden
  ) {
    umbrellaTrackingFrame =
      requestAnimationFrame(trackUmbrellaShelter)
  }
}

watch(
  [showUmbrella, umbrellaReady],
  () => {
    if (!showUmbrella.value) {
      resetUmbrellaPosition()
    }

    syncUmbrellaTracking()
  },
  { flush: 'post' }
)

function handleUmbrellaVisibility() {
  if (document.hidden) {
    stopUmbrellaDrag()
  }

  syncUmbrellaTracking()
}

onMounted(() => {
  document.addEventListener(
    'visibilitychange',
    handleUmbrellaVisibility
  )

  // Return it to the Pokémon after a screen-size change.
  window.addEventListener('resize', resetUmbrellaPosition)

  syncUmbrellaTracking()
})

onUnmounted(() => {
  stopUmbrellaDrag()
  cancelAnimationFrame(umbrellaTrackingFrame)

  document.removeEventListener(
    'visibilitychange',
    handleUmbrellaVisibility
  )

  window.removeEventListener(
    'resize',
    resetUmbrellaPosition
  )
})

// Messages
const buddyMessage = ref('What are we going to do today?')
const hoveredBuilding = ref(null)

const buildingMessages = {
  trainer: 'Hmmm go see your home?',
  laboratory: 'Wanna go hit some decks?',
  arena: 'Wanna go destroy some quizzes?'
}

watch(
  [
    buddyLoading,
    buddyError,
    buddyGettingWet,
    buddySleeping,
    showUmbrella,
    umbrellaReady,
    hoveredBuilding
  ],
  () => {
    if (buddyLoading.value) {
      buddyMessage.value = 'Your buddy is on the way…'
    } else if (buddyError.value) {
      buddyMessage.value = buddyError.value
    } else if (buddyGettingWet.value) {
      buddyMessage.value = 'HEY! Put the umbrella back! 🌧️'
    } else if (buddySleeping.value) {
      buddyMessage.value = 'Zzz… Time to recharge.'
    } else if (hoveredBuilding.value) {
      buddyMessage.value = buildingMessages[hoveredBuilding.value]
    } else if (showUmbrella.value && umbrellaReady.value) {
      buddyMessage.value = 'Ahh… nice and dry! ☂️'
    } else {
      buddyMessage.value = 'What are we going to do today?'
    }
  },
  { immediate: true }
)

</script>

<template>
  <!-- =================================================
       STUDYDEX HOME — VISIBLE PAGE AND WORLD LAYERS
       ================================================= -->
  <div class="world-page">

    <!-- STUDYDEX LOGO AND CLOCK -->
  <header class="sd-hud">
    <img
      class="sd-logo"
      :src="asset + 'studydex-logo.png'"
      alt="StudyDex"
    />

    <div class="sd-clock" aria-label="Town time">
      <img v-if="weatherImg" :src="weatherImg" alt="" style="width:40px;">

      <span class="sd-clock-time">{{ displayTime }}</span>

      <span class="sd-clock-divider" aria-hidden="true"></span>

      <span class="sd-clock-period">{{ lighting.name }}</span>
    </div>
  </header>

  <!-- Click outside to dismiss the profile menu -->
  <div
    v-if="profileMenuOpen"
    class="trainer-menu-backdrop"
    aria-hidden="true"
    @click="closeProfileMenu()"
  ></div>

  <!-- TOP-RIGHT TRAINER PROFILE -->
  <aside
    class="trainer-hud"
    aria-label="Trainer profile and active Pokémon"
    @keydown.esc.stop.prevent="closeProfileMenu(true)"
  >
    <div class="trainer-profile-card">
      <!-- CLICKABLE TRAINER HEADER -->
      <button
        ref="profileTrigger"
        type="button"
        class="trainer-profile-trigger"
        :aria-expanded="profileMenuOpen"
        aria-controls="trainer-profile-actions"
        @click="
          profileMenuOpen = !profileMenuOpen;
          profileNotice = ''
        "
      >
        <span class="trainer-avatar-frame">
          <img
            :src="`/avatars/${user.avatar_choice}.png`"
            alt=""
            class="trainer-avatar"
          />
        </span>

        <span class="trainer-identity">
          <span class="trainer-caption">TRAINER PROFILE</span>
          <span class="trainer-name">{{ trainerProfile.name }}</span>
        </span>

        <svg
          class="trainer-chevron"
          :class="{ 'is-open': profileMenuOpen }"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path d="m5 8 5 5 5-5" />
        </svg>
      </button>

      <!-- ACTIVE POKÉMON -->
      <div class="trainer-buddy-row">
        <div class="trainer-buddy-icon" aria-hidden="true">
          <img
            v-if="profileBuddyIcon"
            :src="profileBuddyIcon"
            alt=""
          />
          <span v-else>●</span>
        </div>

        <div class="trainer-buddy-details">
          <div class="trainer-buddy-heading">
            <span class="trainer-buddy-name">
              {{ activeBuddy.name }}
            </span>

            <span class="trainer-buddy-level">
              Lv. {{ activeBuddyTraining.level }}
            </span>
          </div>

          <progress
            class="trainer-exp-bar"
            :value="buddyExpValue"
            :max="buddyExpTarget"
            :aria-label="`${activeBuddy.name} experience toward next level`"
          ></progress>

          <div class="trainer-exp-caption">
            <span>EXP</span>
            <span>{{ buddyExpValue }} / {{ buddyExpTarget }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- PROFILE OPTIONS -->
    <Transition name="trainer-menu">
      <div
        v-if="profileMenuOpen"
        id="trainer-profile-actions"
        class="trainer-dropdown"
      >
        <span class="trainer-dropdown-title">YOUR TRAINER</span>

        <button type="button" @click="selectProfileAction('name')">
          <span>Edit name</span>
          <span aria-hidden="true">›</span>
        </button>

        <button type="button" @click="selectProfileAction('avatar')">
          <span>Change avatar</span>
          <span aria-hidden="true">›</span>
        </button>

        <button type="button" @click="selectProfileAction('progress')">
          <span>My Progress</span>
          <span aria-hidden="true">›</span>
        </button>

        <button type="button" @click="selectProfileAction('settings')">
          <span>Settings</span>
          <span aria-hidden="true">›</span>
        </button>

        <div class="trainer-menu-divider"></div>

        <button
          type="button"
          class="trainer-logout"
          @click="selectProfileAction('logout')"
        >
          <span>Log out</span>
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </Transition>

    <p v-if="profileNotice" class="trainer-notice" role="status">
      {{ profileNotice }}
      <button
        type="button"
        aria-label="Dismiss message"
        @click="profileNotice = ''"
      >
        ×
      </button>
    </p>
  </aside>

  <!-- COLLAPSIBLE POKÉDEX STUDY GOALS -->
  <aside
    class="quest-dock"
    aria-label="To-dos and Pokémon collection"
    @keydown.esc.stop.prevent="closeGoals"
  >
    <Transition name="quest-slide" type="transition">
      <section
        v-if="goalsOpen"
        id="daily-goals-panel"
        class="quest-phone"
        aria-labelledby="daily-goals-title"
      >

        <img
            class="quest-device-image"
            :src="asset + 'pokedex-goals.png'"
            alt=""
            aria-hidden="true"
            draggable="false"
          />

        <!-- RED POKÉDEX FRAME -->
        <div class="quest-device-top" aria-hidden="true">
          <span class="quest-camera"></span>

          <span class="quest-device-name">STUDYDEX</span>

          <span class="quest-device-lights">
            <i></i>
            <i></i>
            <i></i>
          </span>
        </div>

        <!-- PHONE SCREEN -->
        <div class="quest-screen">

        <!-- EXISTING LOADING ANIMATION -->
        <div class="quest-boot" aria-hidden="true">
          <span class="quest-boot-title">STUDYDEX OS</span>

          <p class="quest-loading-text">
            Loading<span class="quest-dots"><span>.</span><span>.</span><span>.</span></span>
          </p>
        </div>

        <!-- CONTENT APPEARS AFTER LOADING -->
        <div v-if="questReady" class="quest-content">


          <header class="quest-device-heading">

            <span class="quest-eyebrow">
              <VueTyper
                text="YOUR DAILY ADVENTURE"
                :repeat="0"
                :type-delay="25"
              />
            </span>

            <h2 id="daily-goals-title">
              <VueTyper
                text="Trainer Hub"
                :repeat="0"
                :type-delay="60"
                :pre-type-delay="300"
              />
            </h2>

          </header>


          <!-- SECTION BUTTONS -->
          <nav class="quest-tabs" aria-label="Trainer hub sections">
            <button
              type="button"
              :class="{ 'is-selected': questTab === 'todos' }"
              :aria-pressed="questTab === 'todos'"
              @click="questTab = 'todos'"
            >
              To-Dos
            </button>

            <button
              type="button"
              :class="{ 'is-selected': questTab === 'pokedex' }"
              :aria-pressed="questTab === 'pokedex'"
              @click="questTab = 'pokedex'"
            >
              Pokédex
              <span class="quest-tab-count">{{ ownedPokemon.length }}</span>
            </button>
          </nav>

          <!-- =====================================
              TO-DOS
          ====================================== -->
          <section v-if="questTab === 'todos'" class="quest-tab-panel">
            <header class="quest-heading">

              <h3 class="quest-section-title">
                <VueTyper
                  text="My To-Dos"
                  :repeat="0"
                  :type-delay="50"
                  :pre-type-delay="100"
                />
              </h3>

              <p>{{ remainingTodoLabel }}</p>

            </header>

            <button class="quest-manage-todos" type="button" data-bs-toggle="modal" data-bs-target="#todoModal">
              + Add / edit to-dos
            </button>
            <p v-if="todoStorageNotice" class="todo-storage-note" role="status">{{ todoStorageNotice }}</p>

            <ul v-if="orderedTodos.length" class="quest-todo-list">
              <li v-for="todo in orderedTodos" :key="todo.id"
                  class="quest-todo-item" :class="{ 'is-done': todo.completedAt }">
                <button type="button" class="todo-check"
                        :aria-label="`Mark ${todo.title} as ${todo.completedAt ? 'incomplete' : 'done'}`"
                        :aria-pressed="!!todo.completedAt" @click="toggleTodo(todo)">
                  <svg v-if="todo.completedAt" viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8" /></svg>
                </button>
                <span class="quest-todo-title">{{ todo.title }}</span>
              </li>
            </ul>
            <p v-else class="quest-empty">A fresh page! Add your first to-do.</p>
            <footer class="quest-footer">Unfinished tasks carry over. Completed tasks clear tomorrow.</footer>
          </section>

          <!-- POKÉDEX -->
          <section v-else class="quest-tab-panel">


            <header class="quest-heading">

              <h3 class="quest-section-title">
                <VueTyper
                  text="Your Pokémon"
                  :repeat="0"
                  :type-delay="50"
                  :pre-type-delay="100"
                />
              </h3>

              <p>
                <VueTyper
                  text="Select a Pokémon to make it your town buddy."
                  :repeat="0"
                  :type-delay="30"
                  :pre-type-delay="500"
                />
              </p>

            </header>


            <!-- CURRENT SELECTION -->
            <div class="pokedex-active" role="status">
              <span class="pokedex-active-dot" aria-hidden="true"></span>
              <span>Town buddy: <strong>{{ activeBuddy.name }}</strong></span>
            </div>

            <!-- OWNED POKÉMON -->
            <div v-if="ownedPokemon.length" class="pokedex-grid">
              <button
                v-for="pokemon in ownedPokemon"
                :key="pokemon.ownedId"
                type="button"
                class="pokedex-card"
                :class="{ 'is-active': activeBuddy.ownedId === pokemon.ownedId }"
                :aria-pressed="activeBuddy.ownedId === pokemon.ownedId"
                :aria-label="`Choose ${pokemon.name} as your town buddy`"
                @click="chooseQuestBuddy(pokemon)"
              >
                <span class="pokedex-number">
                  #{{ String(pokemon.id).padStart(3, '0') }}
                </span>

                <img
                  :src="pokemonSprite(pokemon.id)"
                  alt=""
                  class="pokedex-sprite"
                  loading="lazy"
                />

                <span class="pokedex-name">{{ pokemon.name }}</span>
                <div class="small" style="font-size: 10px;">
                  Lv. {{ pokemon.level }}
                  <br/>
                  {{ pokemon.xp }} / {{ MAX_XP }} XP
                </div>

                <span class="pokedex-card-caption">
                  {{ activeBuddy.ownedId === pokemon.ownedId
                    ? '✓ Active buddy'
                    : 'Select buddy'
                  }}
                </span>
              </button>
            </div>

            <p v-else class="quest-empty">
              No Pokémon yet. Open a pack to meet your first buddy!
            </p>

            <footer class="quest-footer">
              {{ ownedPokemon.length }} Pokémon collected
            </footer>
          </section>

        </div>
      </div>

        <div class="quest-home-indicator" aria-hidden="true"></div>
      </section>
    </Transition>

    <!-- ALWAYS-VISIBLE OPEN / CLOSE BUTTON -->
    <button
      type="button"
      class="quest-toggle"
      :class="{ 'quest-toggle-open': goalsOpen }"
      :aria-expanded="goalsOpen"
      aria-controls="daily-goals-panel"
      @click="goalsOpen = !goalsOpen"
    >
      <svg
        class="quest-toggle-icon"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect x="5" y="2" width="14" height="20" rx="4" />
        <path d="M10 5h4M9 10h6M9 14h6M11 19h2" />
      </svg>

      <span>{{ goalsOpen ? 'Close Hub' : 'Trainer Hub' }}</span>

      <span class="quest-toggle-count">
        {{ remainingTodoLabel }}
      </span>

      <svg
        class="quest-toggle-chevron"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path d="m5 12 5-5 5 5" />
      </svg>
    </button>
  </aside>

      <div class="world-scene">
        <!-- Sky colour changes continuously -->
        <div
          class="layer sky"
          :style="{
            background: `linear-gradient(
              to bottom,
              ${lighting.top} 0%,
              ${lighting.horizon} 30%
            )`,
          }"
        ></div>

        <img
          class="celestial sun"
          :src="asset + 'bg_sun.png'"
          :style="celestialStyle(false)"
          alt=""
        />

        <img
          class="celestial moon"
          :src="asset + 'bg_moon.png'"
          :style="celestialStyle(true)"
          alt=""
        />

        <div
          class="layer"
          :style="{ opacity: rainActive ? 0 : lighting.stars }"
        >
          <img
            class="layer stars"
            :src="asset + 'bg_stars.png'"
            alt=""
          />
        </div>

        <div
          class="layer"
          :style="{
            opacity: lighting.cloud,
            filter: `brightness(${lighting.brightness})`,
          }"
        >
          <img class="layer clouds" :src="asset + 'bg_clouds.png'" alt="" />
        </div>

        <!-- One fixed world prevents geometry shifting -->
        <img
          class="layer"
          :src="asset + 'building_img.png'"
          :style="worldStyle"
          alt="StudyDex world with an arena, laboratory and trainer house"
        />

        <!-- Building lights -->
        <img
          class="layer building-lights"
          :src="asset + 'bg_buildinglights.png'"
          :style="{ opacity: buddySleeping ? 0 : lighting.lights * 0.45 }"
          alt=""
        />



        <div
          class="layer"
          :style="{ opacity: rainActive ? 0 : lighting.fireflies }"
        >
          <img
            class="layer fireflies"
            :src="asset + 'bg_firefly.png'"
            alt=""
          />
        </div>

        <!-- Darken the town while raining -->
        <div
          class="layer rain-shade"
          :class="{ 'rain-active': rainActive }"
        ></div>

        <!-- Rain with umbrella collision detection -->
        <canvas
          ref="rainCanvas"
          class="layer rain-overlay"
          :class="{ 'rain-active': rainActive }"
          aria-hidden="true"
        ></canvas>

        <!-- ACTIVE BUDDY -->
        <div
          class="town-buddy"
          :class="{
            'is-sleeping': buddySleeping,
            'has-umbrella': showUmbrella && umbrellaReady
          }"
        >
          <div
            class="buddy-speech"
            :class="{ 'is-getting-wet': buddyGettingWet }"
          >
            <span class="buddy-speaker">
              {{ activeBuddy.name }}
            </span>

            <p aria-live="polite">
              {{ buddyMessage }}
            </p>
          </div>

          <div ref="buddyCharacter" class="buddy-character">
            <!-- Preloaded, then shown when rain starts -->
            <div
              class="umbrella-drag"
              :class="{
                'is-visible': showUmbrella && umbrellaReady,
                'is-dragging': umbrellaDragging
              }"
              :style="umbrellaPosition"
              role="button"
              :tabindex="showUmbrella && umbrellaReady ? 0 : -1"
              :aria-hidden="!(showUmbrella && umbrellaReady)"
              aria-label="Move umbrella. Drag or use arrow keys. Press Home to return it."
              @pointerdown="startUmbrellaDrag"
              @pointermove="moveUmbrellaDrag"
              @pointerup="stopUmbrellaDrag"
              @pointercancel="stopUmbrellaDrag"
              @lostpointercapture="stopUmbrellaDrag"
              @keydown="handleUmbrellaKey"
            >
              <img
                ref="umbrellaImage"
                class="buddy-umbrella"
                src="/assets/umbrella.png"
                alt=""
                draggable="false"
                @load="prepareUmbrella"
                @error="umbrellaFailed = true; umbrellaReady = false"
              />
            </div>

            <template v-if="townBuddyImage && !buddyError">
              <span
                class="buddy-ground-shadow"
                aria-hidden="true"
              ></span>

              <Transition
                name="buddy-swap"
                mode="out-in"
                type="transition"
              >
                <img
                  :key="townBuddyImage"
                  class="buddy-image"
                  :class="{ 'is-shaking': ballShaking }"
                  :src="townBuddyImage"
                  :alt="`${activeBuddy.name}, ${
                    buddySleeping
                      ? 'resting'
                      : 'your active study buddy'
                  }`"
                  draggable="false"
                  @click="shakePokeball"
                  @animationend="ballShaking = false"
                  @error="buddyError = 'Your buddy’s image could not load.'"
                />
              </Transition>

              <div
                v-if="buddySleeping"
                class="buddy-zzz"
                aria-hidden="true"
              >
                <span>z</span>
                <span>z</span>
                <span>Z</span>
              </div>
            </template>
          </div>
        </div>



        <!-- Building navigation -->
        <div class="building-navigation">
          <button
            v-for="building in buildingButtons"
            :key="building.id"
            type="button"
            class="building-button"
            :style="{
              left: building.left,
              top: building.top,
            }"

            :disabled="buddySleeping && building.id !== 'trainer'"
            @click="selectBuilding(building)"
            @mouseenter="hoveredBuilding = building.id"
            @mouseleave="hoveredBuilding = null"
          >

          <span class="building-button-icon">
            <img
              :src="building.icon"
              :alt="building.title"
              class="building-icon-img"
            />
          </span>

            <span class="building-button-text">
              <span class="building-button-title">
                {{ building.title }}
              </span>

              <span class="building-button-subtitle">
                {{ building.subtitle }}
              </span>
            </span>
          </button>
        </div>
      </div>

        <!-- TRAINER NAVBAR -->
  <nav class="sd-navbar" aria-label="Main navigation">

    <!-- STUDY -->
    <button type="button" class="sd-nav-button" :disabled="buddySleeping">
      <span class="sd-icon-tile sd-icon-study">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="M16 8C12 5 7 5 3 7v19c4-2 9-2 13 1
              4-3 9-3 13-1V7c-4-2-9-2-13 1Z"
            fill="#fff9e8"
          />
          <path d="M16 8v19M7 11l5 1M7 16l5 1M20 12l5-1M20 17l5-1" />
        </svg>
      </span>
      <span class="sd-nav-label">Study</span>
    </button>

    <!-- QUIZ -->
    <button type="button" class="sd-nav-button" :disabled="buddySleeping">
      <span class="sd-icon-tile sd-icon-quiz">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="m7 3 5 2 13 17-4 4L7 9Z"
            fill="#fff9e8"
          />
          <path
            d="m25 3-5 2L7 22l4 4L25 9Z"
            fill="#fff9e8"
          />
          <path d="m4 20 8 8M20 28l8-8M5 28l3-3M24 25l3 3" />
        </svg>
      </span>
      <span class="sd-nav-label">Quiz</span>
    </button>

    <!-- TOWN: ACTIVE ON HOMEVIEW2 -->
    <button
      type="button"
      class="sd-nav-button sd-town-button is-active"
      aria-current="page"
    >
      <span class="sd-pokeball" aria-hidden="true"></span>
      <span class="sd-nav-label">Town</span>
    </button>

    <!-- TO-DO LIST — available even while the buddy sleeps -->
    <button
      type="button"
      class="sd-nav-button"
      data-bs-toggle="modal"
      data-bs-target="#todoModal"
    >
      <span class="sd-icon-tile sd-icon-todos">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <rect x="6" y="4" width="21" height="25" rx="3" fill="#fff9e8" />
          <path d="M11 2v5M22 2v5M16 13h7M16 19h7M16 25h7" />
          <path d="m9 12 2 2 3-4m-5 8 2 2 3-4" />
          <circle cx="11" cy="25" r="1" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span class="sd-nav-label">To-Do List</span>
    </button>

    <!-- BAG -->
    <!-- BAG WITH UNOPENED PACK COUNT -->
    <button
      type="button"
      class="sd-nav-button"
      :aria-label="
        unopenedPackCount > 0
          ? `Bag, ${unopenedPackCount} unopened packs`
          : 'Bag, no unopened packs'
      "

      :disabled="buddySleeping"
    >
      <span class="sd-icon-tile sd-icon-bag">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M12 7V5a4 4 0 0 1 8 0v2" />

          <rect
            x="6"
            y="7"
            width="20"
            height="22"
            rx="6"
            fill="#ffcf65"
          />

          <path d="M6 15h20" />

          <rect
            x="10"
            y="18"
            width="12"
            height="7"
            rx="2"
            fill="#fff0bb"
          />

          <path d="M16 13v4" />
        </svg>

        <Transition name="pack-badge">
          <span
            v-if="unopenedPackCount > 0"
            :key="unopenedPackLabel"
            class="sd-pack-badge"
            aria-hidden="true"
          >
            {{ unopenedPackLabel }}
          </span>
        </Transition>
      </span>

      <span class="sd-nav-label">Bag</span>
    </button>

  </nav>

      <!-- TO-DO MODAL -->
      <div
        id="todoModal"
        ref="todoDialog"
        class="modal fade todo-notepad"
        tabindex="-1"
        aria-labelledby="todo-modal-title"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content">

            <!-- HEADER -->
            <div class="modal-header todo-modal-header">
              <div>
                <span class="todo-kicker">STUDYDEX / MY NOTES</span>
                <h2 id="todo-modal-title">My To-Do List</h2>
                <p aria-live="polite">{{ remainingTodoLabel }}</p>
              </div>

              <button
                type="button"
                class="todo-close flex-shrink-0"
                data-bs-dismiss="modal"
                aria-label="Close to-do list"
              >
                ×
              </button>
            </div>

            <!-- BODY -->
            <div class="modal-body">
              <form class="todo-add-form" @submit.prevent="addTodo">
                <label class="visually-hidden" for="new-todo-title">
                  New to-do
                </label>

                <input
                  id="new-todo-title"
                  ref="todoInput"
                  v-model="newTodoTitle"
                  maxlength="180"
                  placeholder="What would you like to get done?"
                  autocomplete="off"
                />

                <button type="submit" :disabled="!newTodoTitle.trim()">
                  + Add
                </button>
              </form>

              <p
                v-if="todoStorageNotice"
                class="todo-storage-note"
                role="status"
              >
                {{ todoStorageNotice }}
              </p>

              <ul v-if="orderedTodos.length" class="todo-notepad-list">
                <li
                  v-for="todo in orderedTodos"
                  :key="todo.id"
                  class="todo-notepad-row"
                  :class="{ 'is-done': todo.completedAt }"
                >
                  <button
                    type="button"
                    class="todo-check"
                    :aria-pressed="!!todo.completedAt"
                    :aria-label="`Mark ${todo.title} as ${todo.completedAt ? 'incomplete' : 'done'}`"
                    @click="toggleTodo(todo)"
                  >
                    <svg
                      v-if="todo.completedAt"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="m4 10 4 4 8-8" />
                    </svg>
                  </button>

                  <form
                    v-if="editingTodoId === todo.id"
                    class="todo-edit-form"
                    @submit.prevent="saveTodoEdit(todo)"
                  >
                    <input
                      v-model="editTodoTitle"
                      class="todo-edit-input"
                      aria-label="Edit to-do title"
                      maxlength="180"
                      @keydown.esc.stop.prevent="editingTodoId = null"
                    />

                    <div class="todo-row-actions">
                      <button type="submit" :disabled="!editTodoTitle.trim()">
                        Save
                      </button>

                      <button type="button" @click="editingTodoId = null">
                        Cancel
                      </button>
                    </div>
                  </form>

                  <template v-else>
                    <button
                      type="button"
                      class="todo-title-button"
                      :aria-label="`Edit ${todo.title}`"
                      @click="startEditingTodo(todo)"
                    >
                      {{ todo.title }}
                    </button>

                    <div class="todo-row-actions">
                      <button
                        type="button"
                        :aria-label="`Edit ${todo.title}`"
                        @click="startEditingTodo(todo)"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        class="todo-delete"
                        :aria-label="`Delete ${todo.title}`"
                        @click="deleteTodo(todo)"
                      >
                        Delete
                      </button>
                    </div>
                  </template>
                </li>
              </ul>

              <div v-else class="todo-notepad-empty">
                <span aria-hidden="true">✓</span>
                <h3>A fresh page, a fresh start.</h3>
                <p>Add a study task or a little reminder above.</p>
              </div>
            </div>

            <!-- FOOTER -->
            <div class="modal-footer todo-modal-footer">
              <span>{{ completedTodoCount }} completed today</span>
              <p>Completed items clear after midnight. Unfinished items stay.</p>

              <button
                type="button"
                class="btn btn-warning fw-bold mt-2"
                data-bs-dismiss="modal"
              >
                Done!
              </button>
            </div>

          </div>
        </div>
      </div>
      <!-- LOCATION MODAL -->
      <div
        v-if="showLocationModal"
        class="modal show d-block location-modal"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="locationModalTitle"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content p-4">

            <div class="location-header d-flex justify-content-between align-items-center">
              <span>STUDYDEX / TOWN SETUP</span>
            </div>

            <div class="modal-body text-center px-0 pb-0">

              <div
                class="location-icon d-flex align-items-center justify-content-center mx-auto mb-3"
              >
                🗺️
              </div>

              <h2 id="locationModalTitle" class="mb-3">
                Find Your Town!
              </h2>

              <p class="location-description">
                Let your Pokémon experience the same weather as you!
              </p>

              <div class="d-flex justify-content-center gap-3 my-3 fs-4">
                <span>☀️</span>
                <span>🌤️</span>
                <span>🌧️</span>
              </div>

              <p class="location-notice p-3">
                Allow location access to experience
                your local weather in Pokémon Town.
              </p>

              <div class="d-flex gap-3 mt-2">
                <button
                  type="button"
                  class="btn location-allow w-50 py-3"
                  @click="chooseLocation(true)"
                >
                  📍 Use My Location
                </button>

                <button
                  type="button"
                  class="btn location-skip w-50 py-3"
                  @click="chooseLocation(false)"
                >
                  Not Now
                </button>
              </div>

              <p class="text-muted small-note mt-2 mb-0">
                Without location access, Singapore's default weather will be used.
              </p>

            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<style scoped>

@import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Nunito:ital,wght@0,200..1000;1,200..1000&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Raleway:ital,wght@0,100..900;1,100..900&family=Silkscreen:wght@400;700&display=swap');

/* =====================================================
   01. WORLD SCENE — BASE, LIGHTING, SKY, CLOUDS
   ===================================================== */
.world-page {
  position: relative;
  width: 100%;
  background: #071024;
}

.world-scene {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  isolation: isolate;
}

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

img.layer {
  object-fit: fill;
}

.building-lights {
  filter: saturate(0.65);
}

.celestial {
  position: absolute;
  width: 10%;
  height: auto;
  transform: translate(-50%, -50%);
  pointer-events: none;

  transition: opacity 1.5s ease;
}

.moon {
  width: 7%;
}

.clouds {
  inset: auto;
  top: 0;
  left: -5%;
  width: 110%;
  height: 100%;
  max-width: none;
  object-fit: fill;

  animation: cloud-drift 80s ease-in-out infinite alternate;
}

.stars {
  animation: twinkle 5s ease-in-out infinite alternate;
}

.fireflies {
  animation: firefly-float 5s ease-in-out infinite alternate;
}

.preview-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px;
  color: white;
  font: 14px system-ui, sans-serif;
}

.preview-controls input[type="range"] {
  width: min(360px, 70vw);
}

@media (prefers-reduced-motion: reduce) {
  .clouds,
  .stars,
  .fireflies {
    animation: none;
  }
}

@keyframes cloud-drift {
  from { transform: translateX(-2%); }
  to { transform: translateX(2%); }
}
@keyframes twinkle {
  from { opacity: 0.65; }
  to { opacity: 1; }
}

@keyframes firefly-float {
  from { transform: translateY(0); opacity: 0.55; }
  to { transform: translateY(-0.8%); opacity: 1; }
}


/* =========================================
   02. BUILDING NAVIGATION — BUTTONS + RESPONSIVE
   ========================================= */
.building-navigation {
  position: absolute;
  inset: 0;
  z-index: 20;

  pointer-events: none;
}

.building-button {
 font-family: 'Luckiest Guy', cursive;
  pointer-events: auto;

  position: absolute;
  transform: translate(-50%, -100%);

  display: flex;
  align-items: center;
  gap: 10px;

  padding: 10px 14px 10px 10px;
  border: 2px solid white;
  border-radius: 20px;

  background: rgba(255, 253, 247, 0.97);
  color: #26365b;
  box-shadow:
    0 6px 18px rgba(15, 27, 48, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);

  text-align: left;
  white-space: nowrap;
  cursor: pointer;

  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease;
}

.building-button-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  width: 40px;
  height: 40px;

  background: linear-gradient(135deg, #ffe98a, #ffdb59);
  border-radius: 13px;

  overflow: hidden;
}

.building-icon-img {
  width: 30px;
  height: 30px;

  object-fit: contain;
  display: block;
}

.building-button-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.building-button-title {
  font-size: 14px;
  font-weight: 800;
  line-height: 1.2;
}

.building-button-subtitle {
  color: #647394;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
}

.building-button:not(:disabled):hover {
  transform: translate(-50%, calc(-100% - 5px));
  background: #fff;
  box-shadow: 0 0 12px 3px rgba(255, 213, 45, 0.7);
}

.building-button:active {
  transform: translate(-50%, -100%) scale(0.97);
}

.building-button:focus-visible {
  outline: 3px solid #ffdc5e;
  outline-offset: 4px;
}
.building-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

@media (max-width: 600px) {
  .building-button {
    gap: 5px;
    padding: 6px;
    border-radius: 13px;
  }

  .building-button-icon {
    width: 28px;
    height: 28px;
    border-radius: 9px;
    font-size: 17px;
  }

  .building-button-title {
    font-size: 10px;
  }

  .building-button-subtitle {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .building-button {
    transition: none;
  }
}


/* =========================================
   03. RAIN — OVERLAY + ANIMATION
   ========================================= */
.rain-shade {
  z-index: 6;
  background: rgba(27, 40, 61, 0.3);
  opacity: 0;
  transition: opacity 2s ease;
}

.rain-overlay {
  z-index: 7;
  overflow: hidden;
  container-type: size;
  opacity: 0;
  transition: opacity 1s ease;
}

.rain-shade.rain-active,
.rain-overlay.rain-active {
  opacity: 1;
}

/* =========================================
   RAIN + UMBRELLA
   ========================================= */

.rain-shade {
  z-index: 6;
  background: rgba(27, 40, 61, 0.3);
  opacity: 0;
  transition: opacity 2s ease;
}

.rain-overlay {
  z-index: 14;
  opacity: 0;
  pointer-events: none;
}

.rain-shade.rain-active,
.rain-overlay.rain-active {
  opacity: 1;
}

/* The shaft sits behind the Pokémon.
   The canopy is positioned above its head. */
/* Position and drag the umbrella */
.umbrella-drag {
  position: absolute;

  left: 50%;
  top: -78%;

  width: 165%;

  transform:
    translateX(-50%)
    translate(
      var(--umbrella-x, 0px),
      var(--umbrella-y, 0px)
    );

  z-index: 3;

  opacity: 0;
  visibility: hidden;
  pointer-events: none;

  touch-action: none;
  user-select: none;
  -webkit-user-select: none;

  cursor: grab;
}

.umbrella-drag.is-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.umbrella-drag.is-dragging {
  cursor: grabbing;
}

.umbrella-drag:focus-visible {
  outline: 2px dashed #ffde59;
  outline-offset: 4px;
  border-radius: 12px;
}

/* Float the image inside the draggable wrapper */
.buddy-umbrella {
  display: block;

  width: 100%;
  max-width: none;
  height: auto;

  pointer-events: none;
  image-rendering: pixelated;

  animation: umbrella-float 3s ease-in-out infinite;
  animation-play-state: paused;
  z-index: -1;
}

.umbrella-drag.is-visible .buddy-umbrella {
  animation-play-state: running;
}

/* Freeze at its current float position while dragging.
   Resume smoothly when released. */
.umbrella-drag.is-dragging .buddy-umbrella {
  animation-play-state: paused;
}

@keyframes umbrella-float {
  0%, 100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-6px);
  }
}

/* Keep the dialogue above the umbrella */
.buddy-speech {
  z-index: 4;
}

.town-buddy.has-umbrella .buddy-speech {
  bottom: calc(178% + 12px);
}

/* Complaint colours */
.buddy-speech.is-getting-wet {
  background: #fff0e8;
  border-color: #cf6549;
  color: #963b2b;
}

.buddy-speech.is-getting-wet::after {
  background: #fff0e8;
  border-color: #cf6549;
}

@media (prefers-reduced-motion: reduce) {
  .buddy-umbrella {
    animation: none;
  }
}
/* Raise the speech bubble above the umbrella */
.town-buddy.has-umbrella .buddy-speech {
  bottom: calc(178% + 12px);
}

@media (prefers-reduced-motion: reduce) {
  .rain-shade {
    transition: none;
  }
}


/* =========================================
   STUDYDEX GAME UI — HUD AND NAVBAR
   ========================================= */

.sd-hud,
.sd-navbar {
  font-family: ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif;
  box-sizing: border-box;
}

.sd-hud *,
.sd-navbar * {
  box-sizing: border-box;
}

.sd-nav-button:disabled {
  opacity: 0.45;
  filter: grayscale(100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* LOGO AND CLOCK */

.sd-hud {
  position: absolute;
  top: 20px;
  left: 24px;
  z-index: 100;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  pointer-events: none;
}

.sd-logo {
  display: block;
  width: clamp(150px, 17vw, 210px);
  height: auto;

  filter: drop-shadow(0 4px 3px rgba(8, 25, 60, 0.3));
}

.sd-clock {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  padding: 9px 15px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 999px;

  background: rgba(15, 36, 70, 0.38);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);

  color: #fff;
  box-shadow:
    0 4px 12px rgba(7, 20, 44, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.sd-clock-icon {
  width: 20px;
  height: 20px;
  color: #ffe17a;
  flex-shrink: 0;
}

.sd-clock-time {
  font-size: 19px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
}

.sd-clock-divider {
  width: 1px;
  height: 17px;
  background: rgba(255, 255, 255, 0.35);
}

.sd-clock-period {
  font-size: 12px;
  font-weight: 700;
  color: #eef6ff;
}

/* NAVBAR GLASS PANEL */

.sd-navbar {
  position: fixed;
  left: 50%;
  bottom: calc(22px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 100;

  display: grid;
  grid-template-columns: 1fr 1fr 1.1fr 1fr 1fr;
  align-items: center;
  gap: 8px;

  width: min(480px, calc(100% - 24px));
  height: 94px;
  padding: 10px 14px;

  border: 2px solid rgba(207, 234, 255, 0.78);
  border-radius: 30px;
  font-size: 20px;

  background: linear-gradient(
    180deg,
    rgba(81, 125, 179, 0.62),
    rgba(22, 48, 87, 0.78)
  );

  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);

  box-shadow:
    0 12px 28px rgba(6, 19, 44, 0.3),
    0 4px 0 rgba(15, 36, 70, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

/* REGULAR NAV BUTTONS */

.sd-nav-button {
  position: relative;
  min-width: 0;
  width: 100%;
  height: 70px;
  padding: 5px 2px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;

  border: 1px solid transparent;
  border-radius: 19px;
  background: transparent;

  color: #fff;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  transition:
    transform 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}

.sd-nav-label {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
  text-shadow: 0 2px 3px rgba(5, 20, 45, 0.6);
}

.sd-icon-tile {
  display: grid;
  place-items: center;
  width: 40px;
  height: 38px;
  border-radius: 12px;

  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow:
    0 3px 0 rgba(7, 23, 49, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.sd-icon-tile svg {
  width: 29px;
  height: 29px;
  fill: none;
  stroke: #263d63;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sd-icon-study {
  background: linear-gradient(#a2edda, #54c5ac);
}

.sd-icon-quiz {
  background: linear-gradient(#ffcf92, #f6a95e);
}

.sd-icon-pokemon {
  background: linear-gradient(#b6dfff, #7eb2ee);
}

.sd-icon-bag {
  background: linear-gradient(#e0cbff, #b496e7);
}

/* RAISED TOWN BUTTON */

.sd-town-button {
  justify-self: center;
  align-self: center;

  width: 88px;
  height: 88px;
  margin-top: -22px;
  gap: 4px;

  border: 3px solid #fff0ae;
  border-radius: 50%;

  background: linear-gradient(160deg, #fff3b0, #ffd15a);
  color: #243c68;

  box-shadow:
    0 5px 0 #b77d2c,
    0 9px 18px rgba(7, 20, 45, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.8);
}

.sd-town-button .sd-nav-label {
  color: #243c68;
  text-shadow: none;
}

.sd-pokeball {
  position: relative;
  display: block;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  overflow: hidden;

  border: 3px solid #263d63;
  border-radius: 50%;

  background: linear-gradient(
    to bottom,
    #ff626c 0%,
    #ed3d50 44%,
    #263d63 44%,
    #263d63 56%,
    #fff 56%,
    #e5edf9 100%
  );

  box-shadow: inset -3px -3px 0 rgba(25, 45, 75, 0.12);
}

.sd-pokeball::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  width: 14px;
  height: 14px;
  border: 3px solid #263d63;
  border-radius: 50%;
  background: #fff;
}

/* ACTIVE STATE FOR FUTURE PAGES */

.sd-nav-button.is-active:not(.sd-town-button) {
  background: rgba(255, 221, 112, 0.2);
  border-color: rgba(255, 226, 137, 0.7);
}

.sd-nav-button.is-active::after {
  content: "";
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);

  width: 16px;
  height: 4px;
  border-radius: 999px;
  background: #ffe17a;
}

.sd-town-button.is-active::after {
  bottom: -12px;
}

/* INTERACTION */

  .sd-nav-button:not(:disabled):hover {
    transform: translateY(-3px);
    background-color: rgba(255, 255, 255, 0.14);
  }

  .sd-town-button:hover {
    transform: translateY(-3px);
    box-shadow:
      0 6px 0 #b77d2c,
      0 12px 22px rgba(7, 20, 45, 0.3),
      0 0 16px rgba(255, 219, 103, 0.35);
  }


.sd-nav-button:active {
  transform: translateY(2px) scale(0.96);
}

.sd-nav-button:focus-visible {
  outline: 3px solid #fff0a8;
  outline-offset: 5px;
}

/* MOBILE */

@media (max-width: 600px) {
  .sd-hud {
    top: 12px;
    left: 12px;
    gap: 6px;
  }

  .sd-logo {
    width: 145px;
  }

  .sd-clock {
    gap: 7px;
    padding: 7px 11px;
  }

  .sd-clock-time {
    font-size: 16px;
  }

  .sd-clock-icon {
    width: 17px;
    height: 17px;
  }

  .sd-clock-period {
    font-size: 10px;
  }

  .sd-navbar {
    height: 80px;
    padding: 8px;
    gap: 3px;
    border-radius: 24px;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }

  .sd-nav-button {
    height: 60px;
    gap: 4px;
    border-radius: 14px;
  }

  .sd-nav-label {
    font-size: 11px;
  }

  .sd-icon-tile {
    width: 33px;
    height: 32px;
    border-radius: 10px;
  }

  .sd-icon-tile svg {
    width: 25px;
    height: 25px;
  }

  .sd-town-button {
    width: 68px;
    height: 68px;
    margin-top: -18px;
    border-radius: 50%;
    gap: 3px;
  }

  .sd-pokeball {
    width: 33px;
    height: 33px;
  }

  .sd-pokeball::after {
    width: 12px;
    height: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sd-nav-button {
    transition: none;
  }
}

/* =========================================
   DAILY GOALS — MODERN POKÉDEX PHONE
   ========================================= */

.quest-dock {
  position: fixed;
  right: 24px;
  bottom: calc(22px + env(safe-area-inset-bottom, 0px));
  z-index: 120;

  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;

  font-family:
    ui-rounded,
    "Arial Rounded MT Bold",
    system-ui,
    sans-serif;

}

.quest-dock,
.quest-dock * {
  box-sizing: border-box;
}

.quest-device-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

  height: 34px;
  padding: 0 10px 7px;
}

.quest-camera {
  width: 22px;
  height: 22px;

  border: 3px solid #eefaff;
  border-radius: 50%;

  background: radial-gradient(
    circle at 32% 28%,
    #fff 0%,
    #b9f6ff 15%,
    #4ccde9 40%,
    #2473ac 100%
  );

  box-shadow: 0 2px 3px rgba(71, 24, 42, 0.35);
}

.quest-device-name {
  color: #fff5f6;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 2.5px;
}

.quest-device-lights {
  display: flex;
  gap: 5px;
}

.quest-device-lights i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffb4b8;
  box-shadow: inset 0 1px 1px rgba(80, 20, 30, 0.2);
}

.quest-device-lights i:nth-child(2) {
  background: #ffe389;
}

.quest-device-lights i:nth-child(3) {
  background: #a6e6c3;
}

/* LARGE PHONE SCREEN */

.quest-screen {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;

  padding: 10px 15px 16px;
  border: 2px solid #23334d;
  border-radius: 25px;

  background: linear-gradient(160deg, #f8fbff, #eef3fa);
  color: #263955;
  font-family: 'Silkscreen', monospace;
}

.quest-screen-top {
  display: flex;
  justify-content: center;
  margin-bottom: 15px;
}

.quest-speaker {
  width: 58px;
  height: 6px;
  border-radius: 999px;
  background: #23334d;
}

.quest-heading {
  margin-bottom: 16px;
}

.quest-eyebrow {
  color: #8d5d72;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.quest-heading h2 {
  margin: 5px 0;
  color: #253956;
  font-size: 25px;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.8px;
}

.quest-heading p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

/* SUMMARY */

.quest-summary {
  margin-bottom: 14px;
  padding: 12px;

  border: 1px solid #d8e4f3;
  border-radius: 16px;
  background: #e8f0fb;
}

.quest-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;

  margin-bottom: 9px;
  font-size: 11px;
  color: #526581;
}

.quest-summary-row strong {
  color: #315b95;
  font-weight: 900;
}

.quest-summary-caption {
  display: block;
  margin-top: 6px;
  color: #657995;
  font-size: 10px;
}

/* NATIVE, ACCESSIBLE PROGRESS BARS */

.quest-progress {
  display: block;
  width: 100%;
  height: 6px;
  overflow: hidden;

  appearance: none;
  -webkit-appearance: none;

  border: 0;
  border-radius: 999px;
  background: #e9eef5;
  color: var(--quest-accent, #6489ed);
}

.quest-progress::-webkit-progress-bar {
  background: #e9eef5;
  border-radius: 999px;
}

.quest-progress::-webkit-progress-value {
  background: var(--quest-accent, #6489ed);
  border-radius: 999px;
}

.quest-progress::-moz-progress-bar {
  background: var(--quest-accent, #6489ed);
  border-radius: 999px;
}

.quest-overall-progress {
  height: 8px;
  --quest-accent: #6489ed;
}

/* FOUR GOAL CARDS */

.quest-list {
  display: flex;
  flex-direction: column;
  gap: 9px;

  margin: 0;
  padding: 0;
  list-style: none;
}

.quest-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;

  padding: 11px 10px;
  border: 1px solid #e1e7f0;
  border-radius: 15px;

  background: #fff;
  box-shadow: 0 3px 7px rgba(37, 57, 86, 0.035);
}

.quest-number {
  display: grid;
  place-items: center;
  flex-shrink: 0;

  width: 29px;
  height: 31px;
  border-radius: 10px;

  background: #f0f4fa;
  color: var(--quest-accent);
  font-size: 12px;
  font-weight: 900;
}

.quest-number svg {
  width: 19px;
  height: 19px;
  stroke: #27876b;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.quest-card-content {
  flex: 1;
  min-width: 0;
}

.quest-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.quest-subject {
  color: #65748b;
  font-size: 10px;
  font-weight: 700;
}

.quest-card h3 {
  margin: 4px 0 8px;
  color: #2a3d59;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.quest-card-progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quest-card-progress-row .quest-progress {
  flex: 1;
  min-width: 0;
}

.quest-card-count {
  flex-shrink: 0;
  color: #65748b;
  font-size: 10px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.quest-card-status {
  display: block;
  margin-top: 5px;
  color: #748196;
  font-size: 10px;
  line-height: 1.3;
}

.quest-card-done {
  border-color: #cce7db;
  background: #f5fcf8;
}

.quest-card-done .quest-number {
  background: #dcf2e7;
}

.quest-done-label {
  padding: 2px 6px;
  border-radius: 999px;
  background: #dff3e8;
  color: #287b5f;
  font-size: 9px;
  font-weight: 800;
}

/* FOOTER AND DEVICE HANDLE */

.quest-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  margin-top: 15px;
  color: #718097;
  font-size: 10px;
  line-height: 1.4;
  text-align: center;
}

.quest-footer-dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #e5b85b;
}

.quest-home-indicator {
  width: 70px;
  height: 4px;
  flex-shrink: 0;
  margin: 8px auto 0;
  border-radius: 999px;
  background: rgba(105, 20, 43, 0.4);
}

.quest-empty {
  padding: 20px 5px;
  color: #65748b;
  font-size: 13px;
  text-align: center;
}

/* OPEN / CLOSE BUTTON */

.quest-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;

  min-height: 48px;
  padding: 10px 14px;

  border: 1.5px solid #ffc0c7;
  border-radius: 17px;
  background: linear-gradient(160deg, #f57583, #d8435b);

  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  box-shadow:
    0 4px 0 #9e3047,
    0 8px 18px rgba(28, 35, 60, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);

  transition: transform 180ms ease;
}

.quest-toggle-icon {
  width: 20px;
  height: 24px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.quest-toggle-count {
  padding: 4px 7px;
  border-radius: 8px;
  background: rgba(112, 24, 45, 0.25);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.quest-toggle-chevron {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 220ms ease;
}

.quest-toggle-open .quest-toggle-chevron {
  transform: rotate(180deg);
}

.quest-toggle:active {
  transform: translateY(2px);
}

.quest-toggle:focus-visible {
  outline: 3px solid #ffe59a;
  outline-offset: 5px;
}

/* SLIDE OPEN / CLOSED */

.quest-slide-enter-active,
.quest-slide-leave-active {
  transition:
    opacity 220ms ease,
    transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
  transform-origin: bottom right;
}

.quest-slide-enter-from,
.quest-slide-leave-to {
  opacity: 0;
  transform: translateY(24px) scale(0.96);
}

/* KEEP CLEAR OF THE CENTRAL NAVBAR */

@media (max-width: 1240px) {
  .quest-dock {
    right: 14px;
    bottom: calc(136px + env(safe-area-inset-bottom, 0px));
  }

  .quest-phone {
    max-height: calc(
      100dvh - 220px - env(safe-area-inset-bottom, 0px)
    );
  }
}

@media (max-width: 600px) {
  .quest-dock {
    right: 12px;
    bottom: calc(110px + env(safe-area-inset-bottom, 0px));
    gap: 10px;
  }

  .quest-phone {
    max-height: calc(
      100dvh - 186px - env(safe-area-inset-bottom, 0px)
    );
  }

  .quest-toggle {
    min-height: 44px;
    padding: 8px 11px;
    font-size: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .quest-slide-enter-active,
  .quest-slide-leave-active,
  .quest-toggle,
  .quest-toggle-chevron {
    transition: none;
  }
}


/* =========================================
   POKÉDEX — IMAGE FRAME + ON-SCREEN LAYOUT
   ========================================= */

.quest-phone {
  position: relative;
  display: block;
  flex-shrink: 0;

  /* Fit the device into the available screen height */
  width: min(
    400px,
    calc(100vw - 24px),
    calc((100dvh - 110px - env(safe-area-inset-bottom, 0px)) * 0.666667)
  );

  aspect-ratio: 2 / 3;
  height: auto;
  max-height: none;

  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

/* Full device artwork */

.quest-device-image {
  position: absolute;
  inset: 0;

  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;

  pointer-events: none;
  user-select: none;

  filter: drop-shadow(0 10px 12px rgba(10, 24, 45, 0.25));
}

/* Hide the old CSS-drawn hardware */

.quest-device-top,
.quest-screen-top,
.quest-home-indicator {
  display: none;
}

/* Live content positioned inside the illustrated screen */

.quest-screen {
  position: absolute;
  z-index: 1;

  left: 16.5%;
  top: 21.6%;
  width: 71.5%;
  height: 59.2%;

  min-height: 0;
  padding: 12px;

  border: 0;
  border-radius: 14px;

  background: #fcfaed;
  color: #263955;

  overflow-y: auto;
  overscroll-behavior: contain;

  scrollbar-width: thin;
  scrollbar-color: #b9c5cf transparent;
}

/* Slightly tighter layout for the device screen */

.quest-heading {
  margin-bottom: 10px;
}

.quest-heading h2 {
  font-size: 23px;
}

.quest-heading p {
  font-size: 11px;
}

.quest-eyebrow {
  font-size: 8px;
  letter-spacing: 1px;
}

.quest-summary {
  padding: 10px;
  margin-bottom: 10px;
}

.quest-summary-row {
  flex-wrap: wrap;
}

.quest-list {
  gap: 7px;
}

.quest-card {
  gap: 8px;
  padding: 9px 8px;
  border-radius: 12px;
}

.quest-card h3 {
  font-size: 12px;
  margin: 3px 0 6px;
}

.quest-number {
  width: 25px;
  height: 28px;
  font-size: 11px;
}

.quest-footer {
  margin-top: 10px;
}

/* Match the earlier dock position above the navbar */

@media (max-width: 1240px) {
  .quest-phone {
    width: min(
      400px,
      calc(100vw - 24px),
      calc((100dvh - 220px - env(safe-area-inset-bottom, 0px)) * 0.666667)
    );

    max-height: none;
  }
}

@media (max-width: 600px) {
  .quest-phone {
    width: min(
      360px,
      calc(100vw - 24px),
      calc((100dvh - 186px - env(safe-area-inset-bottom, 0px)) * 0.666667)
    );
  }

  .quest-screen {
    padding: 9px;
    border-radius: 10px;
  }

  .quest-heading h2 {
    font-size: 20px;
  }
}

/* =========================================
   POKÉMON BUDDY — POSITION IN THE WORLD
   ========================================= */

.town-buddy {
  position: absolute;

  /* Position of the Pokémon's feet */
  left: 52%;
  top: 81%;

  transform: translate(-50%, -100%);
  z-index: 15;

  width: clamp(115px, 4vw, 150px);

  pointer-events: none;
  user-select: none;


  font-family:
    ui-rounded,
    "Arial Rounded MT Bold",
    system-ui,
    sans-serif;
}

/* =========================================
   POKÉMON BUDDY — SPEECH, SPRITE, SHADOW
   ========================================= */

/* Speech bubble */
.buddy-speech {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);

  width: 220px;
  padding: 11px 15px;

  border: 2px solid #344f78;
  border-radius: 18px;

  background: #fffdf3;
  color: #2b4162;
  text-align: center;

  box-shadow:
    0 4px 0 rgba(35, 57, 90, 0.18),
    0 8px 18px rgba(22, 42, 65, 0.14);
}

/* Bubble tail */

.buddy-speech::after {
  content: "";

  position: absolute;
  left: 50%;
  bottom: -8px;

  width: 13px;
  height: 13px;

  background: #fffdf3;
  border-right: 2px solid #344f78;
  border-bottom: 2px solid #344f78;

  transform: translateX(-50%) rotate(45deg);
}

.buddy-speaker {
  display: block;
  margin-bottom: 4px;

  color: #886317;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.buddy-speech p {
  margin: 0;

  font-size: 13px;
  font-weight: 800;
  line-height: 1.4;
}

/* CHARACTER */

.buddy-character {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
}

.buddy-image {
  position: relative;
  z-index: 1;

  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;

  /* Static sprite while awake; sleeping animation is defined below */
  image-rendering: pixelated;
  transform-origin: 50% 90%;
  animation: none;
}

/* Ground shadow helps the Pokémon sit in the scene */

.buddy-ground-shadow {
  position: absolute;
  left: 50%;
  bottom: 3%;

  width: 62%;
  height: 12%;

  transform: translateX(-50%);
  border-radius: 50%;

  background: rgba(25, 48, 28, 0.28);
  filter: blur(3px);
}

@media (max-width: 600px) {
  .town-buddy {
    width: clamp(44px, 12vw, 70px);
  }

  .buddy-speech {
    width: 155px;
    padding: 7px 9px;
    border-radius: 13px;
  }

  .buddy-speaker {
    font-size: 7px;
    margin-bottom: 2px;
  }

  .buddy-speech p {
    font-size: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .buddy-image {
    animation: none;
  }
}


/* -----------------------------------------------------
   BUDDY — SLEEPING POKÉ BALL + CLICK-TO-SHAKE
   The sway plays while asleep. Clicking briefly replaces
   it with the stronger shake, then resumes the sway.
   ----------------------------------------------------- */
.town-buddy.is-sleeping .buddy-image {
  pointer-events: auto;
  cursor: pointer;
  transform-origin: 50% 80%;
  animation: pokeball-sway 2.4s ease-in-out infinite;
}

.town-buddy.is-sleeping .buddy-image.is-shaking {
  animation: pokeball-shake 0.6s ease-in-out;
}

/* Floating sleeping letters */
.buddy-zzz {
  position: absolute;
  top: 15%;
  right: 12%;
  z-index: 2;
  pointer-events: none;
}

.buddy-zzz span {
  position: absolute;
  color: #e3edff;
  font-size: 20px;
  font-weight: 900;
  text-shadow: 1px 2px 2px #344f78;
  opacity: 0;
  animation: sleep-zzz 3s linear infinite;
}

.buddy-zzz span:nth-child(2) { animation-delay: 1s; }
.buddy-zzz span:nth-child(3) { animation-delay: 2s; }

/* Image fade when the Pokémon becomes a Poké Ball */
.buddy-swap-enter-active,
.buddy-swap-leave-active {
  transition: opacity 0.15s ease;
}

.buddy-swap-enter-from,
.buddy-swap-leave-to {
  opacity: 0;
}

/* Responsive and accessibility rules live with this feature */
@media (prefers-reduced-motion: reduce) {
  .town-buddy.is-sleeping .buddy-image,
  .town-buddy.is-sleeping .buddy-image.is-shaking,
  .buddy-zzz span {
    animation: none;
  }

  .buddy-zzz span:first-child { opacity: 1; }

  .buddy-swap-enter-active,
  .buddy-swap-leave-active { transition: none; }
}

@keyframes pokeball-sway {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(-2px) rotate(-4deg); }
  50% { transform: translateX(0) rotate(0deg); }
  75% { transform: translateX(2px) rotate(4deg); }
}

@keyframes pokeball-shake {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  20%, 60% { transform: translateX(-5px) rotate(-15deg); }
  40%, 80% { transform: translateX(5px) rotate(15deg); }
}

@keyframes sleep-zzz {
  0% { opacity: 0; transform: translate(0, 0) scale(0.6); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translate(25px, -45px) scale(1.2); }
}

/* =========================================
   UNOPENED PACK BADGE
   ========================================= */

.sd-icon-bag {
  position: relative;
  overflow: visible;
}

.sd-pack-badge {
  position: absolute;
  top: -9px;
  right: -11px;
  z-index: 2;

  display: flex;
  align-items: center;
  justify-content: center;

  min-width: 23px;
  height: 23px;
  padding: 0 5px;
  box-sizing: border-box;

  border: 2px solid #fff5dc;
  border-radius: 999px;

  background: linear-gradient(150deg, #ff7180, #dc304d);
  color: #fff;

  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;

  text-shadow: 0 1px 1px rgba(110, 15, 35, 0.3);

  box-shadow:
    0 2px 0 #963047,
    0 3px 7px rgba(15, 30, 55, 0.25);

  pointer-events: none;
}

/* Brief pop when the displayed count changes */

.pack-badge-enter-active {
  animation: pack-badge-pop 280ms ease-out;
}

.pack-badge-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.pack-badge-leave-to {
  opacity: 0;
  transform: scale(0.6);
}

@keyframes pack-badge-pop {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }

  65% {
    opacity: 1;
    transform: scale(1.15);
  }

  100% {
    transform: scale(1);
  }
}

@media (max-width: 600px) {
  .sd-pack-badge {
    top: -7px;
    right: -9px;

    min-width: 20px;
    height: 20px;
    padding: 0 4px;

    font-size: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pack-badge-enter-active {
    animation: none;
  }

  .pack-badge-leave-active {
    transition: none;
  }
}

/* =========================================
   TOP-RIGHT TRAINER PROFILE
   ========================================= */

.trainer-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 139;
  background: transparent;
}

.trainer-hud {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 140;

  width: 265px;

  font-family:
    ui-rounded,
    "Arial Rounded MT Bold",
    system-ui,
    sans-serif;
}

.trainer-hud,
.trainer-hud * {
  box-sizing: border-box;
}

.trainer-profile-card {
  padding: 11px;

  border: 1.5px solid rgba(225, 241, 255, 0.75);
  border-radius: 23px;

  background: linear-gradient(
    145deg,
    rgba(69, 105, 151, 0.82),
    rgba(26, 49, 83, 0.9)
  );

  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);

  box-shadow:
    0 7px 20px rgba(12, 29, 55, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* TRAINER HEADER */

.trainer-profile-trigger {
  display: flex;
  align-items: center;
  gap: 10px;

  width: 100%;
  padding: 0 0 10px;

  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.17);
  background: transparent;

  color: white;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.trainer-avatar-frame {
  display: block;
  flex-shrink: 0;

  width: 49px;
  height: 49px;
  overflow: hidden;

  border: 2px solid #ffe19a;
  border-radius: 16px;

  background: linear-gradient(#fff4cc, #e6bb62);
  box-shadow: 0 3px 0 rgba(10, 25, 49, 0.25);
}

.trainer-avatar {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.trainer-identity {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.trainer-caption {
  color: #c7dbf1;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.2px;
}

.trainer-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-size: 16px;
  font-weight: 900;
}

.trainer-chevron {
  width: 18px;
  height: 18px;
  flex-shrink: 0;

  stroke: #ffe19a;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;

  transition: transform 180ms ease;
}

.trainer-chevron.is-open {
  transform: rotate(180deg);
}

/* ACTIVE BUDDY AND EXP */

.trainer-buddy-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding-top: 9px;
}

.trainer-buddy-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;

  width: 46px;
  height: 46px;
  border-radius: 13px;

  background: rgba(231, 244, 255, 0.12);
  color: #ffe19a;
}

.trainer-buddy-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.trainer-buddy-details {
  flex: 1;
  min-width: 0;
}

.trainer-buddy-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  margin-bottom: 7px;
}

.trainer-buddy-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.trainer-buddy-level {
  flex-shrink: 0;
  color: #ffe19a;
  font-size: 10px;
  font-weight: 900;
}

.trainer-exp-bar {
  display: block;
  width: 100%;
  height: 7px;
  overflow: hidden;

  appearance: none;
  -webkit-appearance: none;

  border: 0;
  border-radius: 999px;
  background: #193452;
  color: #7fe2d0;
}

.trainer-exp-bar::-webkit-progress-bar {
  border-radius: 999px;
  background: #193452;
}

.trainer-exp-bar::-webkit-progress-value {
  border-radius: 999px;
  background: linear-gradient(90deg, #4dc8bd, #a5f1cb);
}

.trainer-exp-bar::-moz-progress-bar {
  border-radius: 999px;
  background: #7fe2d0;
}

.trainer-exp-caption {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;

  color: #c7dbef;
  font-size: 9px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* DROPDOWN */

.trainer-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;

  width: 100%;
  padding: 10px;

  border: 2px solid #dce8f5;
  border-radius: 19px;
  background: #fffdf5;

  box-shadow: 0 12px 28px rgba(14, 31, 58, 0.25);
}

.trainer-dropdown-title {
  display: block;
  padding: 5px 10px 8px;

  color: #75849a;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.2px;
}

.trainer-dropdown button {
  display: flex;
  align-items: center;
  justify-content: space-between;

  width: 100%;
  min-height: 44px;
  padding: 10px;

  border: 0;
  border-radius: 11px;
  background: transparent;

  color: #30476a;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.trainer-dropdown button:hover {
  background: #eaf1fa;
}

.trainer-menu-divider {
  height: 1px;
  margin: 6px 8px;
  background: #e3e8ef;
}

.trainer-dropdown .trainer-logout {
  color: #bd4158;
}

.trainer-dropdown .trainer-logout:hover {
  background: #fff0f2;
}

.trainer-profile-trigger:focus-visible,
.trainer-dropdown button:focus-visible,
.trainer-notice button:focus-visible {
  outline: 3px solid #ffd76d;
  outline-offset: 3px;
}

.trainer-notice {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;

  width: 100%;
  margin: 0;
  padding: 12px 35px 12px 12px;

  border-radius: 14px;
  background: #fffdf5;
  color: #30476a;
  box-shadow: 0 8px 20px rgba(14, 31, 58, 0.2);

  font-size: 12px;
  line-height: 1.5;
}

.trainer-notice button {
  position: absolute;
  top: 5px;
  right: 5px;

  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #30476a;
  font-size: 20px;
  cursor: pointer;
}

.trainer-menu-enter-active,
.trainer-menu-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.trainer-menu-enter-from,
.trainer-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* COMPACT SCREENS */

@media (max-width: 600px) {
  .trainer-hud {
    top: 12px;
    right: 12px;
    width: 180px;
  }

  .trainer-profile-card {
    padding: 8px;
    border-radius: 17px;
  }

  .trainer-avatar-frame {
    width: 36px;
    height: 36px;
    border-radius: 12px;
  }

  .trainer-profile-trigger {
    gap: 7px;
  }

  .trainer-caption {
    font-size: 7px;
    letter-spacing: 0.5px;
  }

  .trainer-name {
    font-size: 13px;
  }

  .trainer-buddy-icon {
    width: 33px;
    height: 33px;
  }

  .trainer-buddy-name {
    font-size: 11px;
  }
}

/* Avoid overlapping the logo on very narrow phones */

@media (max-width: 380px) {
  .trainer-hud {
    width: 150px;
  }

  .trainer-caption {
    display: none;
  }

  .trainer-buddy-row {
    gap: 5px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .trainer-chevron,
  .trainer-menu-enter-active,
  .trainer-menu-leave-active {
    transition: none;
  }
}


/* Loading overlay */
.quest-boot {
  position: absolute;
  inset: 0;
  z-index: 2;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;

  border-radius: inherit;
  background: #132b25;
  color: #b4f5b0;
  pointer-events: none;

  /* Hide after 5 seconds */
  animation: quest-boot-hide 0.25s ease 2s forwards;
}

.quest-boot-title {
  color: #ffde59;
  font-family: "Silkscreen", monospace;
  font-size: 13px;
  letter-spacing: 2px;
}

.quest-loading-text {
  margin: 0;
  font-family: "Silkscreen", monospace;
  font-size: 14px;
}

/* Dots appear one by one, then reset together */
.quest-dots span {
  opacity: 0;
  animation: quest-dot-one 1.2s step-end infinite;
}

.quest-dots span:nth-child(2) {
  animation-name: quest-dot-two;
}

.quest-dots span:nth-child(3) {
  animation-name: quest-dot-three;
}

/* Keep quests hidden until the loading screen finishes */
.quest-content {
  animation: quest-tab-appear 0.25s ease-out;
}


/* VUE TYPER - QUEST SCREEN */

.quest-screen :deep(.vue-typer) {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

.quest-screen :deep(.vue-typer .custom.char) {
  color: inherit;
}

.quest-screen :deep(.vue-typer .custom.caret) {
  background-color: #263955;
  width: 2px;
}

.quest-screen :deep(.vue-typer .custom.caret.complete) {
  display: none;
}


@keyframes quest-dot-one {
  0%, 90%, 100% { opacity: 0; }
  20% { opacity: 1; }
}

@keyframes quest-dot-two {
  0%, 90%, 100% { opacity: 0; }
  40% { opacity: 1; }
}

@keyframes quest-dot-three {
  0%, 90%, 100% { opacity: 0; }
  60% { opacity: 1; }
}

@keyframes quest-boot-hide {
  to {
    opacity: 0;
    visibility: hidden;
  }
}

@keyframes quest-content-show {
  from {
    opacity: 0;
    visibility: hidden;
  }
  to {
    opacity: 1;
    visibility: visible;
  }
}

/* Skip animation when reduced motion is preferred */
@media (prefers-reduced-motion: reduce) {
  .quest-boot {
    display: none;
  }

  .quest-content {
    animation: none;
  }
}

/* =========================================
   TRAINER HUB — HEADING & TABS
========================================= */

.quest-device-heading {
  margin-bottom: 12px;
}

.quest-device-heading h2 {
  margin: 4px 0 0;
  color: #263955;
  font-family: "Silkscreen", monospace;
  font-size: 18px;
}

.quest-tabs {
  display: flex;
  gap: 5px;
  padding: 4px;
  margin-bottom: 14px;
  border: 1px solid #dedbc9;
  border-radius: 10px;
  background: #eeecdf;
}

.quest-tabs button {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 5px;

  min-width: 0;
  min-height: 36px;
  padding: 7px 4px;
  border: 0;
  border-radius: 7px;
  background: transparent;

  color: #626858;
  font-family: "Silkscreen", monospace;
  font-size: 10px;
  cursor: pointer;

  transition: background-color 0.15s ease, color 0.15s ease;
}

.quest-tabs button:hover {
  background: #fff8db;
}

.quest-tabs button.is-selected {
  background: #ffde59;
  color: #30304b;
  box-shadow: 0 2px 0 #d5b83e;
}

.quest-tab-count {
  padding: 2px 4px;
  border-radius: 4px;
  background: rgba(48, 48, 75, 0.09);
  font-size: 9px;
}

.quest-section-title {
  margin: 0 0 5px;
  color: #263955;
  font-size: 15px;
  font-weight: 800;
}

.quest-tab-panel {
  animation: quest-tab-appear 0.2s ease-out;
}

/* =========================================
   POKÉDEX — ACTIVE BUDDY
========================================= */

.pokedex-active {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 10px;
  margin-bottom: 12px;

  border: 1px solid #cce7db;
  border-radius: 8px;
  background: #e9f5ec;
  color: #287b5f;

  font-size: 11px;
}

.pokedex-active-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #35936d;
}

/* =========================================
   POKÉDEX — COLLECTION GRID
========================================= */

.pokedex-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.pokedex-card {
  display: flex;
  flex-direction: column;
  align-items: center;

  min-width: 0;
  padding: 8px 5px 10px;

  border: 2px solid #e2e3d7;
  border-radius: 10px;
  background: #fffef7;
  color: #263955;

  font: inherit;
  cursor: pointer;

  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    transform 0.15s ease;
}

.pokedex-card:hover {
  transform: translateY(-2px);
  border-color: #e4c34b;
  background: #fff9df;
}

.pokedex-card.is-active {
  border-color: #d0a925;
  background: #fff3bd;
}

.pokedex-number {
  align-self: flex-start;
  color: #737b87;
  font-family: "Silkscreen", monospace;
  font-size: 9px;
}

.pokedex-sprite {
  display: block;
  width: 76px;
  max-width: 100%;
  height: 76px;
  object-fit: contain;
  image-rendering: pixelated;
}

.pokedex-name {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.pokedex-card-caption {
  margin-top: 5px;
  color: #737b87;
  font-size: 9px;
}

.pokedex-card.is-active .pokedex-card-caption {
  color: #725912;
  font-weight: 700;
}

.quest-tabs button:focus-visible,
.pokedex-card:focus-visible {
  outline: 2px solid #345b86;
  outline-offset: 3px;
}

@keyframes quest-tab-appear {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .quest-tab-panel {
    animation: none;
  }

  .quest-tabs button,
  .pokedex-card {
    transition: none;
  }

  .pokedex-card:hover {
    transform: none;
  }
}




/* =====================================================
   SHARED TO-DOS — BOOTSTRAP MODAL AND QUEST DEVICE
===================================================== */

.sd-icon-todos {
  background: linear-gradient(#a9e5c8, #4aaf8a);
  color: #294b52;
}

/* MODAL */

.todo-notepad {
  color: #30374a;
  font-family: 'Nunito', system-ui, sans-serif;
}

.todo-notepad .modal-dialog {
  width: calc(100% - 28px);
  max-width: 720px;
  margin: 20px auto;
  min-height: calc(100% - 40px);
}

.todo-notepad .modal-dialog-scrollable {
  height: calc(100% - 40px);
}

.todo-notepad .modal-content {
  background: #fffcf2;
  color: #30374a;
  border: 1px solid #e6dcc4;
  border-top: 10px solid #ffde59;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 24px 80px #14233d66;
}

.todo-notepad .modal-body {
  padding: 0 30px;
}

/* HEADER */

.todo-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  padding: 30px 30px 0;
  border-bottom: 0;
}

.todo-kicker {
  font-family: 'Silkscreen', monospace;
  font-size: 10px;
  color: #887037;
  letter-spacing: 1px;
}

.todo-modal-header h2 {
  margin: 9px 0 4px;
  font-size: clamp(24px, 4vw, 34px);
  font-weight: 800;
}

.todo-modal-header p {
  margin: 0;
  color: #707887;
  font-size: 14px;
}

.todo-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #eee9dd;
  color: #515967;
  font-size: 25px;
  line-height: 1;
  cursor: pointer;
}

.todo-close:hover {
  background: #e3dccb;
}

/* ADD AND EDIT FORMS */

.todo-add-form {
  display: flex;
  gap: 10px;
  margin: 24px 0 12px;
}

.todo-add-form input,
.todo-edit-input {
  flex: 1;
  min-width: 0;
  padding: 12px;
  border: 1px solid #ded8c6;
  border-radius: 9px;
  background: #fff;
  color: #30374a;
  font: inherit;
}

.todo-add-form button {
  flex-shrink: 0;
  padding: 10px 18px;
  border: 0;
  border-radius: 9px;
  background: #ffde59;
  color: #30374a;
  font-weight: 800;
  cursor: pointer;
}

.todo-add-form button:hover:not(:disabled) {
  background: #ffcf32;
}

.todo-edit-form {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  min-width: 0;
  gap: 8px;
}

.todo-edit-input {
  flex-basis: 100%;
  width: 100%;
}

.todo-notepad button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* TASK LIST */

.todo-notepad-list,
.quest-todo-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.todo-notepad-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #e6e1d1;
}

.todo-title-button {
  flex: 1;
  min-width: 0;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: #30374a;
  text-align: left;
  font: inherit;
  overflow-wrap: anywhere;
  cursor: text;
}

.is-done .todo-title-button,
.is-done .quest-todo-title {
  color: #818b88;
  text-decoration: line-through;
}

/* COMPLETION BUTTON */

.todo-check {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  padding: 3px;
  border: 2px solid #a2b0ac;
  border-radius: 50%;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.todo-check[aria-pressed="true"] {
  border-color: #35936d;
  background: #35936d;
}

.todo-check svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ROW ACTIONS */

.todo-row-actions {
  display: flex;
  flex-shrink: 0;
  gap: 5px;
}

.todo-row-actions button {
  padding: 7px 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #536e87;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.todo-row-actions button:hover:not(:disabled) {
  background: #eeeadc;
}

.todo-row-actions .todo-delete {
  color: #a4404d;
}

/* EMPTY STATE */

.todo-notepad-empty {
  padding: 40px 12px;
  text-align: center;
  color: #7e887f;
}

.todo-notepad-empty > span {
  display: inline-grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #e5f1e8;
  color: #35936d;
  font-size: 28px;
}

.todo-notepad-empty h3 {
  margin: 14px 0 6px;
  font-size: 18px;
}

.todo-notepad-empty p {
  font-size: 14px;
}

/* FOOTER AND STORAGE NOTICE */

.todo-modal-footer {
  display: block;
  margin: 0;
  padding: 24px 30px 30px;
  border-top: 0;
  font-size: 12px;
  color: #707887;
}

.todo-modal-footer > span {
  margin: 0;
  font-weight: 700;
  color: #35936d;
}

.todo-modal-footer p {
  margin: 8px 0 0;
  line-height: 1.6;
}

.todo-storage-note {
  margin: 10px 0;
  font-size: 12px;
  color: #9b482e;
}

/* QUEST DEVICE */

.quest-manage-todos {
  width: 100%;
  margin: 0 0 10px;
  padding: 9px;
  border: 1px solid #d9bd4e;
  border-radius: 8px;
  background: #ffed9b;
  color: #53451b;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.quest-manage-todos:hover {
  background: #ffde59;
}

.quest-todo-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px 2px;
  border-bottom: 1px solid #e1dfd0;
}

.quest-todo-title {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 12px;
  line-height: 1.6;
}

.quest-todo-item .todo-check {
  margin-top: 1px;
}

.quest-toggle-count {
  white-space: normal;
}

/* KEYBOARD FOCUS */

.todo-notepad button:focus-visible,
.todo-notepad input:focus-visible,
.todo-check:focus-visible,
.quest-manage-todos:focus-visible {
  outline: 3px solid #6489ed;
  outline-offset: 3px;
}

/* MOBILE */

@media (max-width: 600px) {
  .todo-modal-header {
    padding: 20px 16px 0;
  }

  .todo-notepad .modal-body {
    padding: 0 16px;
  }

  .todo-modal-footer {
    padding: 20px 16px;
  }

  .todo-notepad-row {
    flex-wrap: wrap;
    gap: 9px;
  }

  .todo-title-button {
    flex-basis: calc(100% - 40px);
  }

  .todo-notepad-row > .todo-row-actions {
    margin-left: 33px;
  }

  .todo-add-form button {
    padding: 10px;
  }
}
@keyframes todo-modal-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 600px) {
  .todo-paper { padding: 20px 16px; }
  .todo-notepad-row { flex-wrap: wrap; gap: 9px; }
  .todo-title-button { flex-basis: calc(100% - 40px); }
  .todo-notepad-row > .todo-row-actions { margin-left: 33px; }
  .todo-add-form button { padding: 10px; }
}
@media (prefers-reduced-motion: reduce) { .todo-notepad[open] { animation: none; } }


/* STUDYDEX LOCATION MODAL */

.location-modal {
  z-index: 2000;
  background: rgba(10, 23, 48, 0.7);
  backdrop-filter: blur(5px);
}

.location-modal .modal-dialog {
  max-width: 380px;
  margin-left: auto;
  margin-right: auto;
  width: calc(100% - 32px);
}

.location-modal .modal-content {
  background: #fff9e8;
  border: 3px solid #344967;
  border-radius: 22px;
  color: #293c60;
  font-family: 'Nunito', sans-serif;
}

.location-header {
  font-family: 'Silkscreen', monospace;
  font-size: 10px;
  color: #8f7440;
}

.location-icon {
  width: 90px;
  height: 90px;
  background: #ffe68c;
  border-radius: 20px;
  font-size: 45px;
}

.location-modal h2 {
  font-family: 'Silkscreen', monospace;
  font-size: 22px;
}

.location-description {
  color: #687791;
  font-size: 14px;
}

.location-notice {
  background: #f5ecd4;
  border-radius: 12px;
  color: #6c6046;
  font-size: 12px;
}

.small-note {
  font-size: 12px;
}

.location-allow,
.location-skip {
  border-radius: 12px;
  font-weight: 800;
  font-size: 12px;
}

.location-allow {
  background: #ffde59;
  color: #283957;
  border: 2px solid #d6b73a;
}

.location-allow:hover {
  background: #ffe880;
}

.location-skip {
  background: #fffdf5;
  color: #62718b;
  border: 2px solid #d7cdb5;
}

.location-skip:hover {
  background: #f5ecd4;
}

</style>

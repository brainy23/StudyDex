<script setup>
// =====================================================
// STUDYDEX HOME — STATE, API CALLS, AND INTERACTIONS
// =====================================================
import axios from 'axios'
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentProfile } from '../services/profileService'
import { getOwnedStudyPokemon, getSelectedStudyBuddy, resolveStudyImage } from '../services/studyService'
import { signOutCurrentSession } from '../services/authService'
import { findAvatar } from '../data/avatarOptions'
import Tutorialguide from '../components/common/tutorialguide.vue'
import { usePokemonTransition } from '../composables/usePokemonTransition'

import QuestPhone from '@/components/common/QuestPhone.vue'

import PokemonBuddy from '@/components/pokebuddy/PokemonBuddy.vue'
import ClockWeather from '@/components/common/ClockWeather.vue'
import TownBackground from '@/components/common/TownBackground.vue'

const router = useRouter()
const pokemonTransition = usePokemonTransition()
const buildingNavigationError = ref('')


// tutorial
const showTutorial = ref(router.currentRoute.value.meta.tutorial === true)

function finishTutorial() {
  showTutorial.value = false
  router.replace({ name: 'home' })
}


const asset = '/town/'

const POKE_API_URL = (import.meta.env.VITE_POKE_API_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '')

// to be updated to match user
const MAX_XP = 200


const savedOwnedPokemon = ref([])
const ownedPokemonLoading = ref(true)
const ownedPokemon = computed(() => savedOwnedPokemon.value.map(record => ({
  ownedId: record.id,
  id: record.pokemon?.id ?? record.pokemon_id,
  name: record.pokemon?.name ?? 'Unknown Pokémon',
  spriteUrl: resolveStudyImage(record.pokemon?.sprite_url),
  xp: record.xp ?? 0,
  level: record.level ?? 1,
  is_selected: record.is_selected,
  is_defeated: false,
})))

const savedActiveBuddy = ref(null)
const activeBuddy = computed(() => {
  const record = savedActiveBuddy.value
  if (!record?.pokemon) {
    return {
      ownedId: null,
      id: null,
      name: 'No buddy selected',
      xp: 0,
      level: 1,
      is_defeated: false,
    }
  }

  const pokemonName = record.pokemon.name
  const pokemonId = pokemonName.toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/\s+/g, '-')

  return {
    ownedId: record.id,
    id: pokemonId,
    name: pokemonName,
    xp: record.xp ?? 0,
    level: record.level ?? 1,
    is_selected: true,
    is_defeated: false,
    static_img: record.pokemon.sprite_url || '',
  }
})

const buildingButtons = [
  {
    id: 'arena',
    title: 'Poké Arena',
    subtitle: 'Take a Quiz',
    icon: asset+ 'poke_arena.png',
    left: '21%',
    top: '50%',
    path: '/subjects?flow=quiz',
  },
  {
    id: 'laboratory',
    title: 'Poké Lab',
    subtitle: 'Study Your Decks',
    icon: asset+ 'poke_study.png',
    left: '54.5%',
    top: '49%',
    path: '/subjects?flow=study',
  },
  {
    id: 'trainer',
    title: 'Trainer House',
    subtitle: 'View Your Progress',
    icon: asset+ 'poke_home.png',
    left: '83%',
    top: '65%',
    path: '/trainer',
  },
]

async function selectBuilding(building) {
  if (pokemonTransition.state.active) return
  buildingNavigationError.value = ''
  try {
    if (building.id === 'laboratory' || building.id === 'arena') {
      const flow = building.id === 'arena' ? 'quiz' : 'study'
      await pokemonTransition.run({
        source: 'Town',
        destination: building.title,
        title: flow === 'quiz' ? 'A Challenge Awaits!' : 'Ready to learn?',
        description: flow === 'quiz' ? 'Your next quiz adventure is getting ready.' : 'Your next study adventure is getting ready.',
        waitFor: `${flow}-subjects`,
        durationMs: 2500,
        task: async (signal) => {
          const failure = await router.push(building.path)
          if (signal.aborted) throw signal.reason
          const target = router.currentRoute.value
          if (failure || target.name !== 'selection-subjects' || target.query.flow !== flow) {
            throw new Error(`Could not open ${building.title}. Please try again.`)
          }
        },
      })
    } else {
      const failure = await router.push(building.path)
      if (failure) throw new Error('Could not open this building. Please try again.')
    }
  } catch (error) {
    if (error.name !== 'AbortError') buildingNavigationError.value = error.message || 'Could not open this building. Please try again.'
  }
}

// Component outputs used by the town's interactions.
// ClockWeather owns weather/location; TownBackground owns time/lighting.
const rainActive = ref(false)
const buddySleeping = ref(false)

// ==========================================
// RAIN + UMBRELLA
// ==========================================

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

// TO-DOS — shared by the notepad and the quest screen.
// To-do completion dates follow the device's local calendar.
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
  // Existing to-do setup
  loadTodos()
  scheduleTodoCleanup()
  document.addEventListener('visibilitychange', refreshTodosOnReturn)
  window.addEventListener('focus', refreshTodosOnReturn)

  // Retrieve Pokeball
  getPokeBall()


})

onUnmounted(() => {

  clearTimeout(todoMidnightTimer)
  document.removeEventListener('visibilitychange', refreshTodosOnReturn)
  window.removeEventListener('focus', refreshTodosOnReturn)


})



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
  const selectedRecord = savedOwnedPokemon.value.find(record => record.id === pokemon.ownedId)
  if (!selectedRecord) return
  savedOwnedPokemon.value = savedOwnedPokemon.value.map(record => ({
    ...record,
    is_selected: record.id === selectedRecord.id,
  }))
  savedActiveBuddy.value = savedOwnedPokemon.value.find(record => record.id === selectedRecord.id)
}

const ballShaking = ref(false)

function shakePokeball() {
  if (!buddySleeping.value || !pokeball.value) return

  ballShaking.value = true
}

const townBuddyImage = computed(() => {
  const sprites = buddyData.value?.sprites

  if (buddySleeping.value) {
    return pokeball.value || sprites?.front_default || activeBuddy.value.static_img || ''
  }

  return activeBuddyImage.value
})

// Convert the homepage record into the format PokemonBuddy uses.
const homepagePokemon = computed(() => {
  if (!activeBuddy.value.id) return null

  return {
    ...activeBuddy.value,
    isDefeated: activeBuddy.value.is_defeated,
    evolution_stage: activeBuddy.value.evolution_stage ?? 0,
    animated_img: activeBuddyImage.value || activeBuddy.value.static_img || '',
    static_img: buddyData.value?.sprites?.front_default || activeBuddy.value.static_img || ''
  }
})

// Sample count — connect this to the user's inventory later.
const unopenedPackCount = ref(3)

const unopenedPackLabel = computed(() =>
  unopenedPackCount.value > 99
    ? '99+'
    : String(unopenedPackCount.value)
)

// Trainer identity always comes from the authenticated student's saved profile.
const trainerProfile = ref({ name: 'Loading…', avatar: 'prefer_not_to_say' })
const profileMenuOpen = ref(false)
const trainerAvatarImage = computed(() =>
  findAvatar(trainerProfile.value.avatar)?.image || ''
)

let trainerProfileLoading = false
let trainerProfileActive = true
async function refreshTrainerProfile() {
  if (trainerProfileLoading) return
  trainerProfileLoading = true
  ownedPokemonLoading.value = true
  try {
    const profile = await getCurrentProfile()
    if (!trainerProfileActive) return
    trainerProfile.value = { name: profile.display_name, avatar: profile.avatar_choice }

    try {
      savedActiveBuddy.value = await getSelectedStudyBuddy(profile.id)
    } catch {
      savedActiveBuddy.value = null
      profileNotice.value = 'Your active Pokémon could not load. Refresh the page to try again.'
    }
    try {
      savedOwnedPokemon.value = await getOwnedStudyPokemon(profile.id)
    } catch {
      savedOwnedPokemon.value = []
      profileNotice.value = 'Your Pokédex could not load. Refresh the page to try again.'
    }
  } catch {
    if (trainerProfileActive) {
      trainerProfile.value.name = 'Trainer'
      savedActiveBuddy.value = null
      profileNotice.value = 'Your profile could not load. Refresh the page to try again.'
    }
  } finally {
    ownedPokemonLoading.value = false
    trainerProfileLoading = false
  }
}
onMounted(() => {
  refreshTrainerProfile()
  window.addEventListener('focus', refreshTrainerProfile)
  window.addEventListener('studydex:pokemon-xp', refreshTrainerProfile)
})
onUnmounted(() => {
  trainerProfileActive = false
  window.removeEventListener('focus', refreshTrainerProfile)
  window.removeEventListener('studydex:pokemon-xp', refreshTrainerProfile)
})

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
  activeBuddy.value.static_img ||
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

const profileNotice = ref('')
const loggingOut = ref(false)

function toggleProfileMenu() {
  profileMenuOpen.value = !profileMenuOpen.value
  profileNotice.value = ''
}

async function selectProfileAction(action) {
  if (loggingOut.value) return
  if (action === 'logout') {
    loggingOut.value = true
    profileNotice.value = ''
    try {
      await signOutCurrentSession()
      await router.replace({ name: 'login' })
    } catch {
      closeProfileMenu(true)
      profileNotice.value = 'We couldn’t log you out. Please try again.'
    } finally {
      loggingOut.value = false
    }
    return
  }
  closeProfileMenu(true)
  if (action === 'profile') {
    router.push({ name: 'account' })
  } else if (action === 'progress') {
    router.push({ name: 'studentdashboard' })
  } else if (action === 'settings') {
    profileNotice.value = 'Settings will include sound and accessibility options.'
  } else if (action === 'tutorial') {
    showTutorial.value = true
}}

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
    <p v-if="buildingNavigationError" class="building-navigation-error" role="alert">{{ buildingNavigationError }}</p>

  <!-- tutorial -->
   <Tutorialguide v-if="showTutorial" @done="finishTutorial"/>

    <!-- STUDYDEX LOGO AND CLOCK -->
    <header class="sd-hud">
    <img
      class="sd-logo"
      :src="asset + 'studydex-logo.png'"
      alt="StudyDex"
    />

    <div class="sd-clock-weather">
      <ClockWeather
        :use-device-location="true"
        @rain-change="rainActive = $event"
      />
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
        @click="toggleProfileMenu"
      >
        <span class="trainer-avatar-frame">
          <img
            :src="trainerAvatarImage"
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

        <button type="button" @click="selectProfileAction('profile')">
          <span>Edit Profile</span>
          <span aria-hidden="true">›</span>
        </button>

        <button type="button" @click="selectProfileAction('progress')">
          <span>My Progress</span>
          <span aria-hidden="true">›</span>
        </button>

        <button type="button" @click="selectProfileAction('tutorial')">
          <span>Replay Tutorial</span>
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
          :disabled="loggingOut"
          :aria-busy="loggingOut"
          @click="selectProfileAction('logout')"
        >
          <span>{{ loggingOut ? 'Logging out…' : 'Log out' }}</span>
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

  <QuestPhone
    :todos="todos"
    :owned-pokemon="ownedPokemon"
    :pokemon-loading="ownedPokemonLoading"
    :active-buddy="activeBuddy"
    :max-xp="MAX_XP"
    :device-image="asset + 'pokedex-goals.png'"
    :todo-storage-notice="todoStorageNotice"
    todo-modal-target="#todoModal"
    @toggle-todo="toggleTodo"
    @select-buddy="setActiveBuddy"
  />

      <div class="world-scene">
        <TownBackground
          :rain-active="rainActive"
          @sleep-change="buddySleeping = $event"
        />

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
                <!-- Keep the existing sleeping Poké Ball behaviour -->
                <img
                  v-if="buddySleeping"
                  key="sleeping-buddy"
                  class="buddy-image"
                  :class="{ 'is-shaking': ballShaking }"
                  :src="townBuddyImage"
                  :alt="`${activeBuddy.name}, resting`"
                  draggable="false"
                  @click="shakePokeball"
                  @animationend="ballShaking = false"
                  @error="buddyError = 'Your buddy’s image could not load.'"
                />

                <!-- Awake Pokémon uses the reusable component -->
                <PokemonBuddy
                  v-else-if="homepagePokemon"
                  :key="homepagePokemon.ownedId"
                  class="homepage-pokemon"
                  :active-pokemon="homepagePokemon"
                  embedded
                  progress-position="hidden"
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

    <!-- POKEDEX -->
    <!-- Available to view when buddy sleeps -->
    <button
      type="button"
      class="sd-nav-button"
      @click="router.push('/collection')"
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
      </span>

      <span class="sd-nav-label">PokeDex</span>
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

    </div>
</template>

<style scoped>
.building-navigation-error {
  position: fixed;
  z-index: 2000;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: min(90%, 480px);
  padding: 12px 18px;
  border-radius: 12px;
  background: #fff3d1;
  color: #633423;
  text-align: center;
}
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
  gap: calc(10 * var(--control-unit));

  padding: calc(10 * var(--control-unit)) calc(14 * var(--control-unit)) calc(10 * var(--control-unit)) calc(10 * var(--control-unit));
  border: 2px solid white;
  border-radius: calc(20 * var(--control-unit));

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

  width: calc(40 * var(--control-unit));
  height: calc(40 * var(--control-unit));

  background: linear-gradient(135deg, #ffe98a, #ffdb59);
  border-radius: calc(13 * var(--control-unit));

  overflow: hidden;
}

.building-icon-img {
  width: calc(30 * var(--control-unit));
  height: calc(30 * var(--control-unit));

  object-fit: contain;
  display: block;
}

.building-button-text {
  display: flex;
  flex-direction: column;
  gap: calc(3 * var(--control-unit));
}

.building-button-title {
  font-size: calc(14 * var(--control-unit));
  font-weight: 800;
  line-height: 1.2;
}

.building-button-subtitle {
  color: #647394;
  font-size: calc(10 * var(--control-unit));
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
  .building-button-subtitle {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .building-button {
    transition: none;
  }
}
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
.umbrella-drag {
  position: absolute;

  left: 50%;
  bottom: 40%;

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
.buddy-speech {
  z-index: 4;
}
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
.town-buddy.has-umbrella .buddy-speech {
  bottom: calc(148% + 12px);
}

@media (prefers-reduced-motion: reduce) {
  .rain-shade {
    transition: none;
  }
}

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

.sd-hud {
  position: absolute;
  top: 20px;
  left: 24px;
  z-index: 100;

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;

  pointer-events: none;
}

.sd-logo {
  display: block;
  width: clamp(150px, 17vw, 210px);
  height: auto;

  filter: drop-shadow(0 4px 3px rgba(8, 25, 60, 0.3));
}

.sd-navbar {
  position: fixed;
  left: 50%;
  bottom: calc(22px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 100;

  display: grid;
  grid-template-columns: 1fr 1fr 1.1fr 1fr 1fr;
  align-items: center;
  gap: calc(8 * var(--control-unit));

  width: min(calc(480 * var(--control-unit)), calc(100% - 24px));
  height: calc(94 * var(--control-unit));
  padding: calc(10 * var(--control-unit)) calc(14 * var(--control-unit));

  border: 2px solid rgba(207, 234, 255, 0.78);
  border-radius: calc(30 * var(--control-unit));
  font-size: calc(20 * var(--control-unit));

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

.sd-nav-button {
  position: relative;
  min-width: 0;
  width: 100%;
  height: calc(70 * var(--control-unit));
  padding: calc(5 * var(--control-unit)) calc(2 * var(--control-unit));

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(5 * var(--control-unit));

  border: 1px solid transparent;
  border-radius: calc(19 * var(--control-unit));
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
  font-size: calc(13 * var(--control-unit));
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
  text-shadow: 0 2px 3px rgba(5, 20, 45, 0.6);
}

.sd-icon-tile {
  display: grid;
  place-items: center;
  width: calc(40 * var(--control-unit));
  height: calc(38 * var(--control-unit));
  border-radius: calc(12 * var(--control-unit));

  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow:
    0 3px 0 rgba(7, 23, 49, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.sd-icon-tile svg {
  width: calc(29 * var(--control-unit));
  height: calc(29 * var(--control-unit));
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

.sd-town-button {
  justify-self: center;
  align-self: center;

  width: calc(88 * var(--control-unit));
  height: calc(88 * var(--control-unit));
  margin-top: calc(-22 * var(--control-unit));
  gap: calc(4 * var(--control-unit));

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
  width: calc(42 * var(--control-unit));
  height: calc(42 * var(--control-unit));
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

  width: calc(14 * var(--control-unit));
  height: calc(14 * var(--control-unit));
  border: 3px solid #263d63;
  border-radius: 50%;
  background: #fff;
}

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

@media (max-width: 600px) {
  .sd-hud {
    top: 12px;
    left: 12px;
    gap: 6px;
  }

  .sd-logo {
    width: 145px;
  }

}

@media (prefers-reduced-motion: reduce) {
  .sd-nav-button {
    transition: none;
  }
}

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
.town-buddy.is-sleeping .buddy-image {
  pointer-events: auto;
  cursor: pointer;
  transform-origin: 50% 80%;
  animation: pokeball-sway 2.4s ease-in-out infinite;
}

.town-buddy.is-sleeping .buddy-image.is-shaking {
  animation: pokeball-shake 0.6s ease-in-out;
}
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
.buddy-swap-enter-active,
.buddy-swap-leave-active {
  transition: opacity 0.15s ease;
}

.buddy-swap-enter-from,
.buddy-swap-leave-to {
  opacity: 0;
}
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

  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 265px;

  font-family:
    ui-rounded,
    "Arial Rounded MT Bold",
    system-ui,
    sans-serif;
}
.sd-clock-weather {
  display: flex;
  justify-content: flex-start;
  pointer-events: auto;
}

.sd-clock-weather :deep(.clock-weather-widget) {
  align-items: flex-start;
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

.sd-icon-todos {
  background: linear-gradient(#a9e5c8, #4aaf8a);
  color: #294b52;
}

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

.todo-notepad-list {
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

.is-done .todo-title-button {
  color: #818b88;
  text-decoration: line-through;
}

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

.todo-notepad button:focus-visible,
.todo-notepad input:focus-visible,
.todo-check:focus-visible {
  outline: 3px solid #6489ed;
  outline-offset: 3px;
}

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
.homepage-pokemon {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 0;
  gap: 0;
}
.homepage-pokemon :deep(h2),
.homepage-pokemon :deep(h3),
.homepage-pokemon :deep(.buddy-level),
.homepage-pokemon :deep(.buddy-xp),
.homepage-pokemon :deep(.buddy-message),
.homepage-pokemon :deep(.buddy-error),
.homepage-pokemon :deep(.buddy-status),
.homepage-pokemon :deep(.buddy-placeholder) {
  display: none;
}

.homepage-pokemon :deep(.buddy-image-container) {
  width: 100%;
  margin: 0;
}

.homepage-pokemon :deep(.buddy-sprite) {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}
</style>

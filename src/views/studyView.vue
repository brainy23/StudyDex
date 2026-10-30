<script setup>
import { FAST_CARD_MS, FAST_CARD_STREAK, BOSS_COOLDOWN_MS, readEncounter, writeEncounter, makeQuestions } from '../composables/bossEncounter'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router'
import { getCurrentProfile } from '../services/profileService'
import {
  getStudyCatalogue,
  getTopicLesson,
  getTopicFlashcards,
  studyErrorMessage,
} from '../services/studyService'
import StudyImage from '../components/study/StudyImage.vue'
import { useTopicCompletion } from '../composables/useTopicCompletion'
import '../assets/study.css'

const route = useRoute()
const router = useRouter()
const topicCompletion = useTopicCompletion()
const { savedInBrowser } = topicCompletion
const profile = ref(null)
const catalogue = ref({ subjects: [], topics: [] })
const loading = ref(true)
const error = ref(null)
const resources = reactive({})
const progress = reactive({})
let alive = true
let generation = 0

// This page is now a dedicated flashcard room, including older ?mode=learn links.
const mode = computed(() => 'flashcards')
const subject = computed(() => {
  const subjects = catalogue.value.subjects
  if (route.query.subject) return subjects.find((item) => item.id === route.query.subject) || null
  const requestedTopic = catalogue.value.topics.find((item) => item.id === route.query.topic)
  const initialSubjectId = requestedTopic?.subject_id || catalogue.value.topics[0]?.subject_id
  return subjects.find((item) => item.id === initialSubjectId) || subjects[0] || null
})
const availableTopics = computed(() =>
  catalogue.value.topics.filter((item) => item.subject_id === subject.value?.id),
)
const topic = computed(() =>
  route.query.topic
    ? availableTopics.value.find((item) => item.id === route.query.topic) || null
    : availableTopics.value[0] || null,
)
const arenaLocation = computed(() => ({
  name: 'quiz',
  query: {
    ...(subject.value ? { subject: subject.value.id } : {}),
    ...(topic.value ? { topic: topic.value.id } : {}),
  },
}))
const quizUnlocked = computed(() => topicCompletion.isComplete(topic.value?.id))
const currentResources = computed(() => resources[topic.value?.id])
const readingProgress = computed(
  () =>
    progress[topic.value?.id] || {
      read: 0,
      total: currentResources.value?.lesson.data?.concepts?.length || 0,
    },
)
const progressPercent = computed(() =>
  readingProgress.value.total
    ? Math.round((readingProgress.value.read / readingProgress.value.total) * 100)
    : 0,
)
const activeResource = computed(() => {
  const data = currentResources.value
  if (!data) return null
  return mode.value === 'learn' ? data.lesson : data.flashcards
})
const modeKey = computed(() => `${topic.value?.id}:${mode.value}`)

async function initialise() {
  const request = ++generation
  loading.value = true
  error.value = null
  profile.value = null
  topicCompletion.bindStudent(null, null)
  catalogue.value = { subjects: [], topics: [] }
  Object.keys(resources).forEach((id) => delete resources[id])
  Object.keys(progress).forEach((id) => delete progress[id])
  try {
    const student = await getCurrentProfile()
    if (!alive || request !== generation) return
    profile.value = student
    topicCompletion.bindStudent(student.id, student.school_level_id)
    if (student.school_level_id) {
      const data = await getStudyCatalogue(student.school_level_id)
      if (alive && request === generation) catalogue.value = data
    }
  } catch (cause) {
    if (alive && request === generation) error.value = cause
  } finally {
    if (alive && request === generation) loading.value = false
  }
}

async function loadResource(topicId, name) {
  const target = resources[topicId]?.[name]
  if (!target || target.loading) return
  target.loading = true
  target.error = null
  try {
    const data = await {
      lesson: getTopicLesson,
      flashcards: getTopicFlashcards,
    }[name](topicId)
    if (alive && resources[topicId]?.[name] === target) target.data = data
  } catch (cause) {
    if (alive && resources[topicId]?.[name] === target) target.error = cause
  } finally {
    if (alive && resources[topicId]?.[name] === target) target.loading = false
  }
}

function loadTopic(id) {
  if (!id || resources[id]) return
  resources[id] = Object.fromEntries(
    ['lesson', 'flashcards'].map((name) => [
      name,
      { loading: false, data: null, error: null },
    ]),
  )
  // Load lesson and revision independently; formal assessments belong to Arena.
  for (const name of Object.keys(resources[id])) loadResource(id, name)
}

function setMode(nextMode) {
  if (!['learn', 'flashcards'].includes(nextMode)) return
  const query = { ...route.query, mode: nextMode }
  delete query.battle
  router.push({ name: 'study-decks', query })
}

function goToArena() {
  if (quizUnlocked.value) router.push(arenaLocation.value)
}

function completeTopic(id) {
  if (id === topic.value?.id) topicCompletion.markComplete(id)
}

function chooseSubject(id) {
  const firstTopic = catalogue.value.topics.find((item) => item.subject_id === id)
  router.push({
    name: 'study-decks',
    query: { subject: id, ...(firstTopic ? { topic: firstTopic.id } : {}), mode: 'flashcards' },
  })
}

function chooseTopic(selected) {
  router.push({
    name: 'study-decks',
    query: { subject: selected.subject_id, topic: selected.id, mode: 'flashcards' },
  })
}

function updateProgress(value) {
  if (topic.value) progress[topic.value.id] = value
}

function retryMode() {
  if (topic.value)
    loadResource(topic.value.id, mode.value === 'learn' ? 'lesson' : 'flashcards')
}

watch(() => topic.value?.id, loadTopic)
onMounted(initialise)
onBeforeRouteLeave(() => {
  pauseFocusTimer()
})
onUnmounted(() => {
  alive = false
  generation++
})


// Mewtwo companion; change this ID to select another Pokémon.
const POKE_API_BASE = 'https://pokeapi.co/api/v2'
const pokemonCache = new Map()
const reduceMotion = ref(false)
let motionQuery
function updateMotionPreference() { reduceMotion.value = !!motionQuery?.matches; spriteIndex.value = 0 }
onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotionPreference()
  motionQuery.addEventListener('change', updateMotionPreference)
})
onUnmounted(() => motionQuery?.removeEventListener('change', updateMotionPreference))
const apiPokemon = ref(null)
const spriteLoading = ref(false)
const spriteError = ref('')
const spriteIndex = ref(0)
const spriteRetry = ref(0)
const buddyApiKey = computed(() => '150')
const buddyDisplayName = computed(() => apiPokemon.value?.name || 'Mewtwo')
const spriteChoices = computed(() => {
  const sprites = apiPokemon.value?.sprites
  return [...new Set([
    !reduceMotion.value && sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default,
    sprites?.front_default,
    sprites?.other?.['official-artwork']?.front_default,
  ].filter((url) => typeof url === 'string' && url.startsWith('https://')))]
})
const buddySprite = computed(() => spriteChoices.value[spriteIndex.value] || '')
function nextBuddySprite() {
  if (spriteIndex.value < spriteChoices.value.length - 1) spriteIndex.value++
  else { spriteIndex.value = spriteChoices.value.length; spriteError.value = 'The Pokémon image could not load. Try again.' }
}
watch([buddyApiKey, spriteRetry], async ([key], previous, onCleanup) => {
  const controller = new AbortController()
  let cancelled = false
  let timeout
  onCleanup(() => { cancelled = true; controller.abort(); clearTimeout(timeout) })
  apiPokemon.value = null
  spriteIndex.value = 0
  spriteError.value = ''
  spriteLoading.value = false
  if (!key) {
    return
  }
  spriteLoading.value = true
  try {
    let data = pokemonCache.get(key)
    if (!data) {
      timeout = setTimeout(() => controller.abort(), 12000)
      const response = await fetch(`${POKE_API_BASE}/pokemon/${encodeURIComponent(key)}/`, { signal: controller.signal })
      if (!response.ok) throw new Error(`PokéAPI returned HTTP ${response.status}`)
      data = await response.json()
      if (!data?.sprites || typeof data.name !== 'string') throw new Error('Invalid Pokémon response')
      pokemonCache.set(key, data)
    }
    if (cancelled) return
    apiPokemon.value = data
    if (!spriteChoices.value.length) spriteError.value = 'No sprite is available for this Pokémon.'
  } catch (cause) {
    if (!cancelled) {
      console.error('PokéAPI buddy load failed:', key, cause)
      spriteError.value = 'Could not load your Pokémon from PokéAPI. Check your connection and retry.'
    }
  } finally {
    clearTimeout(timeout)
    if (!cancelled) spriteLoading.value = false
  }
}, { immediate: true })

// Geometry below matches public/poke-lab/poke-lab-interior.png (1672 × 941).
const labBackground = `${import.meta.env.BASE_URL}poke-lab/poke-lab-interior.png`
const backgroundFailed = ref(false)
const enteredLab = ref(false)
const pickerSubjectId = ref(null)
const pickerBusy = ref(false)
const pickerError = ref('')
const visibleSubjects = computed(() => catalogue.value.subjects.filter(item => !/\bmath(?:s|ematics)?\b/i.test(item.name || '')))
const pickerSubject = computed(() => visibleSubjects.value.find(item => item.id === pickerSubjectId.value))
const pickerTopics = computed(() => catalogue.value.topics.filter(item => item.subject_id === pickerSubjectId.value))
function returnToSelection() {
  pauseFocusTimer()
  enteredLab.value = false
  pickerSubjectId.value = subject.value?.id || null
  pickerError.value = ''
}

const reviewQueue = ref([])
const cardIndex = computed(() => reviewQueue.value[0] ?? -1)
const answerVisible = ref(false)
const completedCards = ref(0)
const ratingMessage = ref('')
// A local, independent 25-minute focus session. No server timer API is assumed.
const focusSeconds = ref(25 * 60)
const timerRunning = ref(false)
const timerFinished = ref(false)
// Paused/idle/completed is always red, even when fewer than two minutes remain.
const timerBorderColor = computed(() => !timerRunning.value ? '#ff4057' : focusSeconds.value <= 120 ? '#ffd43b' : '#34e782')
const timerBorderStyle = computed(() => ({ '--timer-border': timerBorderColor.value }))
let timerDeadline = 0
let focusInterval
const focusTime = computed(() => `${String(Math.floor(focusSeconds.value / 60)).padStart(2, '0')}:${String(focusSeconds.value % 60).padStart(2, '0')}`)
function tickFocusTimer() {
  if (!timerRunning.value) return
  focusSeconds.value = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000))
  if (!focusSeconds.value) {
    timerRunning.value = false
    timerFinished.value = true
    clearInterval(focusInterval)
  }
}
function pauseFocusTimer() {
  tickFocusTimer()
  timerRunning.value = false
  clearInterval(focusInterval)
}
function startFocusTimer() {
  if (timerRunning.value) return
  if (!focusSeconds.value) focusSeconds.value = 25 * 60
  timerFinished.value = false
  timerDeadline = Date.now() + focusSeconds.value * 1000
  timerRunning.value = true
  focusInterval = setInterval(tickFocusTimer, 250)
}
function resetFocusTimer() {
  pauseFocusTimer()
  focusSeconds.value = 25 * 60
  timerFinished.value = false
}
const now = ref(new Date())
const live = ref(true)
const previewHour = ref(12)
const autoPreview = ref(false)
let previewInterval
function stopAutoPreview() {
  clearInterval(previewInterval)
  previewInterval = undefined
  autoPreview.value = false
}
function useLiveTime() {
  stopAutoPreview()
  now.value = new Date()
  live.value = true
}
function setPreview(value) {
  const next = Number(value)
  if (!Number.isFinite(next)) return
  stopAutoPreview()
  live.value = false
  previewHour.value = ((next % 24) + 24) % 24
}
function toggleAutoPreview() {
  if (autoPreview.value) { stopAutoPreview(); return }
  previewHour.value = hour.value
  live.value = false
  autoPreview.value = true
  const startedAt = performance.now()
  const startHour = previewHour.value
  previewInterval = setInterval(() => {
    previewHour.value = (startHour + (performance.now() - startedAt) / 60000 * 24) % 24
  }, 50)
}
onUnmounted(stopAutoPreview)

let clockInterval
const hour = computed(() => live.value ? now.value.getHours() + now.value.getMinutes() / 60 + now.value.getSeconds() / 3600 : previewHour.value)
const displayTime = computed(() => {
  const minutes = Math.floor(hour.value * 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})
const landscapeImage = `${import.meta.env.BASE_URL}trainer-home/window-landscape-clean.png`
const landscapeFailed = ref(false)
const landscapeStyle = computed(() => ({
  filter: `brightness(${lighting.value.brightness}) saturate(${lighting.value.saturation})`,
}))
const skyImages = {
  sun: `${import.meta.env.BASE_URL}town/bg_sun.png`,
  moon: `${import.meta.env.BASE_URL}town/bg_moon.png`,
  clouds: `${import.meta.env.BASE_URL}town/bg_clouds.png`,
  stars: `${import.meta.env.BASE_URL}town/bg_stars.png`,
}
const skyImageFailed = reactive({ sun: false, moon: false, clouds: false, stars: false })
// Same lighting keyframes and celestial paths as QuizView.vue.
const frames = [
  [0, 'Night', '#03091c', '#142744', 0.5, 0.8, 0.3, 1],
  [5.5, 'Night', '#081229', '#354564', 0.38, 0.7, 0.38, 0.8],
  [8, 'Day', '#258be0', '#c7eeff', 1, 1.06, 1, 0],
  [12, 'Day', '#1685df', '#c4efff', 1.04, 1.1, 1, 0],
  [15.5, 'Afternoon', '#579bd5', '#ffe0ad', 1.02, 1.08, 0.95, 0],
  [18.5, 'Sunset', '#67518e', '#ffad7b', 0.82, 1.05, 0.78, 0.03],
  [19.25, 'Dusk', '#30345f', '#a77b9d', 0.58, 0.85, 0.58, 0.35],
  [20.5, 'Evening', '#101f43', '#405477', 0.43, 0.75, 0.4, 0.75],
  [22, 'Night', '#03091c', '#142744', 0.5, 0.8, 0.3, 1],
  [24, 'Night', '#03091c', '#142744', 0.5, 0.8, 0.3, 1],
].map(
  ([
    hour,
    name,
    top,
    horizon,
    brightness,
    saturation,
    cloud,
    stars,
  ]) => ({
    hour,
    name,
    top,
    horizon,
    brightness,
    saturation,
    cloud,
    stars,
  }),
)

const lerp = (a, b, t) => a + (b - a) * t

function mixColor(a, b, t) {
  const channels = [1, 3, 5].map((position) => {
    const start = parseInt(a.slice(position, position + 2), 16)
    const end = parseInt(b.slice(position, position + 2), 16)

    return Math.round(lerp(start, end, t))
  })

  return `rgb(${channels.join(',')})`
}

const lighting = computed(() => {
  const h = hour.value

  const index = frames.findIndex(
    (frame, i) =>
      i < frames.length - 1 &&
      h >= frame.hour &&
      h < frames[i + 1].hour,
  )

  const start = frames[Math.max(0, index)]
  const end = frames[Math.max(0, index) + 1]

  const progress = (h - start.hour) / (end.hour - start.hour)
  const t = progress * progress * (3 - 2 * progress)

  return {
    name: t < 0.5 ? start.name : end.name,
    top: mixColor(start.top, end.top, t),
    horizon: mixColor(start.horizon, end.horizon, t),
    brightness: lerp(start.brightness, end.brightness, t),
    saturation: lerp(start.saturation, end.saturation, t),
    cloud: lerp(start.cloud, end.cloud, t),
    stars: lerp(start.stars, end.stars, t),
  }
})

const skyStyle = computed(() => ({
  background: `linear-gradient(
    to bottom,
    ${lighting.value.top} 0%,
    ${lighting.value.horizon} 30%
  )`,
}))

const cloudStyle = computed(() => ({
  opacity: lighting.value.cloud,
  filter: `brightness(${lighting.value.brightness})`,
}))

function celestialStyle(isMoon) {
  const h = hour.value

  const progress = isMoon
    ? ((h - 19 + 24) % 24) / 11
    : (h - 6) / 13

  const visible = progress > 0 && progress < 1
  const p = Math.max(0, Math.min(1, progress))

  return {
    left: `${12 + p * 76}%`,
    top: `${25 - Math.sin(p * Math.PI) * 19}%`,
    opacity: visible
      ? Math.min(1, p * 10, (1 - p) * 10)
      : 0,
  }
}

const roomLighting = computed(() => ({
  filter: `brightness(${Math.max(.78, lighting.value.brightness)}) saturate(${Math.max(.9, lighting.value.saturation)})`,
}))
// Deterministic fallback stars, used only if the existing town asset is absent.
const skyStars = Array.from({ length: 65 }, (_, index) => ({
  left: `${(index * 37.3 + 7) % 100}%`, top: `${(index * 19.7 + 3) % 65}%`,
  width: `${index % 3 + 1}px`, height: `${index % 3 + 1}px`,
}))

// The uploaded page did not include StudyFlashcards.vue or studyService.
// This adapter supports common card shapes; adjust here if your service differs.
function cardRows(data) {
  if (Array.isArray(data)) return data
  for (const key of ['cards', 'flashcards', 'items']) {
    if (Array.isArray(data?.[key])) return data[key]
  }
  return []
}
function cardText(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value.text === 'string') return value.text
  return ''
}
function firstText(...values) { return values.map(cardText).find(Boolean) || '' }
const cards = computed(() => cardRows(currentResources.value?.flashcards.data).map((card, index) => ({
  id: card?.id ?? index,
  front: firstText(card?.front, card?.front_text, card?.question, card?.question_text, card?.prompt, card?.term),
  back: firstText(card?.back, card?.back_text, card?.answer, card?.answer_text, card?.definition, card?.explanation),
  frontImage: card?.front_image_url || card?.question_image_url || '',
  backImage: card?.back_image_url || card?.answer_image_url || '',
})))
const currentCard = computed(() => cards.value[cardIndex.value] || null)
const flashResource = computed(() => currentResources.value?.flashcards)
const reviewedCount = computed(() => completedCards.value)
const unsupportedCards = computed(() => {
  const data = flashResource.value?.data
  return data != null && !Array.isArray(data) &&
    !['cards', 'flashcards', 'items'].some((key) => Array.isArray(data[key]))
})
const bossNavigating = ref(false)
let cardShownAt = performance.now()
let fastStreak = 0
let bossCooldownUntil = 0
let restoredBoss = ''
watch([currentCard, enteredLab], () => { cardShownAt = performance.now() })
function resetRushOnVisibility() { cardShownAt = performance.now(); fastStreak = 0 }
onMounted(() => document.addEventListener('visibilitychange', resetRushOnVisibility))
onUnmounted(() => document.removeEventListener('visibilitychange', resetRushOnVisibility))
async function startSurpriseBoss() {
  fastStreak = 0
  if (Date.now() < bossCooldownUntil || bossNavigating.value) return
  const questions = makeQuestions(cards.value)
  if (!questions.length) return // Image-only/one-answer decks cannot form a fair MCQ.
  if (!router.hasRoute('surprise-boss')) {
    ratingMessage.value = 'Boss battle route is not installed yet.'
    return
  }
  pauseFocusTimer()
  const encounter = {
    id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
    createdAt: Date.now(), owner: profile.value?.id, topic: topic.value?.id,
    topicName: topic.value?.name, questions, status: 'pending',
    index: 0, choice: null, score: 0, finished: false,
    returnQuery: { ...route.query, mode: 'flashcards' },
    snapshot: { focusSeconds: focusSeconds.value, queue: [...reviewQueue.value], completed: completedCards.value,
      cardIds: cards.value.map(card => String(card.id)) },
  }
  if (!writeEncounter(encounter)) {
    ratingMessage.value = 'Battle could not start because browser session storage is unavailable.'
    return
  }
  bossNavigating.value = true
  pauseFocusTimer()
  try {
    const failure = await router.push({ name: 'surprise-boss', query: { encounter: encounter.id } })
    if (failure) { encounter.status = 'cancelled'; writeEncounter(encounter); ratingMessage.value = 'Battle navigation was cancelled.' }
  } catch { encounter.status = 'cancelled'; writeEncounter(encounter); ratingMessage.value = 'Could not open the boss battle.' }
  finally { bossNavigating.value = false }
}
function restoreBossProgress() {
  const encounter = readEncounter()
  if (!encounter || encounter.id !== route.query.bossReturn || restoredBoss === encounter.id ||
      encounter.owner !== profile.value?.id || String(encounter.topic) !== String(topic.value?.id) ||
      encounter.status !== 'complete' || !cards.value.length) return
  restoredBoss = encounter.id
  const won = encounter.outcome === 'won' || (!encounter.outcome && encounter.score >= Math.ceil(encounter.questions.length * .7))
  const sameCards = JSON.stringify(cards.value.map(card => String(card.id))) === JSON.stringify(encounter.snapshot.cardIds)
  pauseFocusTimer()
  if (won && sameCards) {
    reviewQueue.value = encounter.snapshot.queue.filter(index => Number.isInteger(index) && index >= 0 && index < cards.value.length)
    completedCards.value = encounter.snapshot.completed
    focusSeconds.value = Math.max(0, Number(encounter.snapshot.focusSeconds) || 0)
    timerFinished.value = focusSeconds.value === 0
    ratingMessage.value = 'Boss defeated! Continue where you left off. Press Start to resume your timer.'
  } else {
    restartCards()
    resetFocusTimer()
    ratingMessage.value = won
      ? 'This deck changed; starting a fresh review with a 25-minute timer.'
      : 'Boss battle lost. Your deck and 25-minute study timer have been reset. Try again at a steadier pace.'
  }
  enteredLab.value = true
  answerVisible.value = false
  fastStreak = 0
  cardShownAt = performance.now()
  bossCooldownUntil = Date.now() + BOSS_COOLDOWN_MS
}
function revealCard() {
  if (currentCard.value) answerVisible.value = !answerVisible.value
}
// Ratings apply only to this visit: Again repeats soon, Hard later, Easy retires it.
async function rateCard(rating) {
  if (mode.value !== 'flashcards' || !currentCard.value || !answerVisible.value ||
      !['again', 'easy', 'hard'].includes(rating) || bossNavigating.value) return
  const wasFast = performance.now() - cardShownAt < FAST_CARD_MS
  const next = [...reviewQueue.value]
  const index = next.shift()
  if (rating === 'easy') {
    completedCards.value++
    ratingMessage.value = 'Easy — finished for this round.'
  } else {
    next.splice(Math.min(rating === 'again' ? 1 : 3, next.length), 0, index)
    ratingMessage.value = rating === 'again' ? 'Again — this card will return soon.' : 'Hard — this card will return later in the round.'
  }
  reviewQueue.value = next
  answerVisible.value = false
  cardShownAt = performance.now()
  fastStreak = wasFast ? fastStreak + 1 : 0
  if (fastStreak >= FAST_CARD_STREAK) await startSurpriseBoss()
}
function restartCards() {
  cardShownAt = performance.now()
  fastStreak = 0
  reviewQueue.value = cards.value.map((_, index) => index)
  completedCards.value = 0
  answerVisible.value = false
  ratingMessage.value = ''
}
function handleCardKey(event) {
  if (mode.value !== 'flashcards' || !currentCard.value || event.target !== event.currentTarget) return
  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); revealCard() }
}
async function selectLabTopic(item) {
  if (pickerBusy.value) return
  pickerBusy.value = true
  pickerError.value = ''
  try {
    await router.push({ name: 'study-decks', query: { subject: item.subject_id, topic: item.id, mode: 'flashcards' } })
    if (String(route.query.topic) === String(item.id)) enteredLab.value = true
  } catch {
    pickerError.value = 'Could not open this topic. Please try again.'
  } finally { pickerBusy.value = false }
}
watch([() => topic.value?.id, () => flashResource.value?.data], restartCards, { immediate: true, flush: 'sync' })
watch([() => flashResource.value?.data, () => route.query.bossReturn], restoreBossProgress, { immediate: true, flush: 'post' })
onUnmounted(() => { clearInterval(focusInterval) })
onMounted(() => { clockInterval = window.setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => window.clearInterval(clockInterval))
</script>

<template>
  <div class="arena-with-preview lab-with-preview">
  <main class="poke-lab-page" :class="{ 'is-selecting': !enteredLab }" :style="{ '--lab-backdrop': `url(&quot;${labBackground}&quot;)` }">
    <header class="arena-hud">
      <RouterLink to="/home" class="home-link">
        ‹ Back to town
      </RouterLink>

      <button v-if="enteredLab" type="button" class="home-link change-topic" @click="returnToSelection">Topics</button>
      <div class="arena-clock">
        <strong>{{ displayTime }}</strong>
        <span>{{ lighting.name }}</span>
      </div>
    </header>


    <div v-if="loading" class="lab-state" role="status">Opening your Poké Lab…</div>
    <div v-else-if="error" class="lab-state" role="alert">
      <p>{{ studyErrorMessage(error, 'Your study content') }}</p>
      <button @click="initialise">Try again</button>
    </div>
    <div v-else-if="!profile?.school_level_id" class="lab-state">
      <h1>Set your school level first</h1>
      <RouterLink to="/account">Open Account Settings</RouterLink>
    </div>

    <template v-else>
      <section class="lab-stage" :class="{ 'missing-background': backgroundFailed, 'selection-blur': !enteredLab }" :inert="!enteredLab" :aria-hidden="!enteredLab" :style="[skyStyle, timerBorderStyle]" aria-label="Poké Lab study room">
        <div class="lab-sky" :style="skyStyle" aria-hidden="true">
          <div class="lab-celestial lab-sun" :style="celestialStyle(false)">
            <img v-if="!skyImageFailed.sun" :src="skyImages.sun" alt="" @error="skyImageFailed.sun = true" />
            <span v-else class="sun-fallback"></span>
          </div>
          <div class="lab-celestial lab-moon" :style="celestialStyle(true)">
            <img v-if="!skyImageFailed.moon" :src="skyImages.moon" alt="" @error="skyImageFailed.moon = true" />
            <span v-else class="moon-fallback"></span>
          </div>
          <div class="lab-stars" :style="{ opacity: lighting.stars }">
            <img v-if="!skyImageFailed.stars" :src="skyImages.stars" alt="" @error="skyImageFailed.stars = true" />
            <div v-else class="fallback-stars"><i v-for="(star, index) in skyStars" :key="index" :style="star"></i></div>
          </div>
          <div class="lab-clouds" :style="cloudStyle">
            <img v-if="!skyImageFailed.clouds" :src="skyImages.clouds" alt="" @error="skyImageFailed.clouds = true" />
            <div v-else class="fallback-clouds"><i></i><i></i><i></i></div>
          </div>
          <img
            v-if="!landscapeFailed"
            class="lab-landscape"
            :src="landscapeImage"
            :style="landscapeStyle"
            alt=""
            draggable="false"
            @error="landscapeFailed = true"
          />
        </div>
        <img class="lab-room" :src="labBackground" :style="roomLighting" alt="" @error="backgroundFailed = true" />

        <!-- This coloured ring overlays the red trim baked into the room artwork. -->
        <div class="timer-frame" aria-hidden="true"></div>
        <!-- Timer screen: paused red, running green, final two minutes yellow. -->
        <section class="lab-screen prompt-screen timer-screen" aria-label="25-minute focus timer">
          <p class="screen-eyebrow">25-minute focus</p>
          <strong class="focus-digits" role="timer" aria-label="Time remaining">{{ focusTime }}</strong>
          <div class="focus-actions">
            <button @click="timerRunning ? pauseFocusTimer() : startFocusTimer()">{{ timerRunning ? 'Pause' : focusSeconds === 1500 ? 'Start' : focusSeconds === 0 ? 'Start again' : 'Resume' }}</button>
            <button @click="resetFocusTimer">Reset</button>
          </div>
          <span v-if="timerFinished" class="focus-finished" role="status">Session complete — take a break!</span>
        </section>

        <nav class="lab-navigation" aria-label="Room navigation">
          <button type="button" @click="returnToSelection">Topics</button>
        </nav>

        <!-- Blue screen: question and answer on the same display. -->
        <section class="lab-screen answer-screen" aria-label="Flashcard answer and learning content" tabindex="0" @keydown="handleCardKey">
          <template v-if="mode === 'flashcards'">
            <p class="screen-eyebrow">{{ answerVisible ? 'Flashcard · Answer' : 'Flashcard · Question' }}</p>
            <div v-if="!topic" class="screen-message"><h2>Choose a study topic</h2><p>Use Topics above to get started.</p></div>
            <div v-else-if="flashResource?.loading || !flashResource" class="screen-message" role="status">Loading your flashcards…</div>
            <div v-else-if="flashResource.error" class="screen-message" role="alert">
              <p>{{ studyErrorMessage(flashResource.error, 'Your flashcards') }}</p>
              <button @click="retryMode">Try again</button>
            </div>
            <div v-else-if="unsupportedCards" class="screen-message" role="alert">
              <h2>This deck format needs connecting</h2>
              <p>Your cards loaded, but this view could not read their format.</p>
            </div>
            <div v-else-if="!cards.length" class="screen-message"><h2>No flashcards yet</h2><p>Choose another topic using the Topics button.</p></div>
            <div v-else-if="!currentCard" class="screen-message" role="status"><h2>Round complete!</h2><p>All {{ cards.length }} cards marked Easy.</p><button @click="restartCards">Study again</button></div>
            <div v-else class="answer-content" aria-live="polite">
              <template v-if="answerVisible">
                <p class="question-reminder">{{ currentCard.front }}</p>
                <p class="answer-copy">{{ currentCard.back || (currentCard.backImage ? '' : 'This card has no answer text.') }}</p>
                <StudyImage v-if="currentCard.backImage" :path="currentCard.backImage" alt="Flashcard answer illustration" />
              </template>
              <template v-else>
                <h1 class="answer-copy">{{ currentCard.front || (currentCard.frontImage ? '' : 'This card has no question text.') }}</h1>
                <StudyImage v-if="currentCard.frontImage" :path="currentCard.frontImage" alt="Flashcard question illustration" />
              </template>
              <button class="screen-flip" :aria-pressed="answerVisible" @click="revealCard">{{ answerVisible ? 'Show question' : 'Reveal answer' }}</button>
            </div>
          </template>
        </section>

        <!-- The sprite's bottom edge sits on the chamber's purple platform. -->
        <aside class="buddy-chamber" :class="{ 'has-pokemon': !!buddySprite }" aria-label="Your study buddy">
          <div v-if="buddySprite" class="buddy-contact-shadow" aria-hidden="true"></div>
          <div class="buddy-sprite">
            <img v-if="buddySprite" :key="buddySprite" :class="{ 'is-artwork': buddySprite === apiPokemon?.sprites?.other?.['official-artwork']?.front_default }" :src="buddySprite" :alt="buddyDisplayName" @error="nextBuddySprite" />
            <span v-else class="chamber-status" role="status">{{ spriteLoading ? 'Loading…' : spriteError ? 'Try again below' : 'Loading companion…' }}</span>
          </div>
        </aside>

        <!-- Only the three requested rating buttons live on the control panel. -->
        <nav class="lab-console" aria-label="Flashcard ratings">
          <div class="console-actions rating-actions">
            <button class="rate-again" :disabled="mode !== 'flashcards' || !currentCard || !answerVisible" @click="rateCard('again')">Again</button>
            <button class="rate-easy" :disabled="mode !== 'flashcards' || !currentCard || !answerVisible" @click="rateCard('easy')">Easy</button>
            <button class="rate-hard" :disabled="mode !== 'flashcards' || !currentCard || !answerVisible" @click="rateCard('hard')">Hard</button>
          </div>
          <p class="console-status">{{ mode === 'learn' ? 'Switch to Flashcards to review.' : currentCard ? answerVisible ? 'How well did you remember?' : 'Reveal the answer to rate this card.' : cards.length ? 'Round complete' : 'Choose a deck to begin' }}</p>
          <span v-if="cards.length && mode === 'flashcards'" class="console-status">{{ reviewedCount }} / {{ cards.length }} finished</span>
        </nav>
      </section>
      <footer v-if="enteredLab" class="lab-footer">
        <span role="status">{{ ratingMessage }}</span>
        <span>{{ profile.school_level?.name }}<template v-if="subject"> · {{ subject.name }}</template></span>
        <p v-if="spriteError" role="alert">{{ spriteError }} <button @click="spriteRetry++">Retry Pokémon</button></p>
        <p v-if="!savedInBrowser" role="status">Progress can only be kept for this visit because browser storage is unavailable.</p>
        <p v-if="landscapeFailed" role="status">Mountain background missing. Copy window-landscape-clean.png into public/trainer-home/.</p>
        <p v-if="backgroundFailed" role="alert">Room image missing. Put poke-lab-interior.png in public/poke-lab/.</p>
      </footer>
    </template>

    <section v-if="!enteredLab && !loading && !error && profile?.school_level_id" class="arena-picker" aria-labelledby="picker-title">
      <div class="picker-shell">
        <span class="picker-eyebrow">STUDYDEX · POKÉ LAB</span>
        <h1 id="picker-title">{{ pickerSubject ? 'Choose your topic' : 'What will you master today?' }}</h1>
        <p class="picker-intro">{{ pickerSubject ? pickerSubject.name + ' · ' + (profile.school_level?.name || 'Your school level') : 'Choose a subject to begin your study session.' }}</p>
        <button v-if="pickerSubject" type="button" class="picker-back" @click="pickerSubjectId = null">← All subjects</button>
        <div v-if="!pickerSubject" class="bubble-grid">
          <button v-for="item in visibleSubjects" :key="item.id" type="button" class="bubble-card" @click="pickerSubjectId = item.id">
            <span class="bubble-symbol" aria-hidden="true">{{ /science/i.test(item.name) ? '⚗' : /math/i.test(item.name) ? '✦' : '✎' }}</span>
            <strong>{{ item.name }}</strong><span>Explore topics →</span>
          </button>
        </div>
        <template v-else>
          <div class="science-filters">
            <strong class="science-level-label">{{ profile.school_level?.name }}</strong>
            <p>Showing study topics for your saved school level. Choose a topic to practise.</p>
          </div>
          <div class="bubble-grid topic-grid">
            <div v-for="item in pickerTopics" :key="item.id" class="topic-choice">
              <button type="button" class="bubble-card" :disabled="pickerBusy" @click="selectLabTopic(item)">
                <span class="bubble-symbol" aria-hidden="true">✦</span>
                <span v-if="item.theme" class="science-theme">{{ item.theme }}</span>
                <strong>{{ item.name }}</strong>
                <span>Study flashcards →</span>
              </button>
            </div>
          </div>
        </template>
        <p v-if="!visibleSubjects.length">No published study subjects are available for your school level yet.</p>
        <p v-else-if="pickerSubject && !pickerTopics.length">No published topics are available for this subject yet.</p>
        <p v-if="pickerError" role="alert">{{ pickerError }}</p>
        <p class="picker-footnote">Study at your own pace. Take a break after your focus session.</p>
      </div>
    </section>
  </main>
  <footer class="time-preview-bar" aria-label="Time preview controls">
    <div class="time-bar-inner">
      <strong class="time-bar-title">Time preview <span>{{ displayTime }}</span></strong>
      <button type="button" :aria-pressed="live" @click="useLiveTime">Live</button>
      <button v-for="preset in [{ label: '7am', hour: 7 }, { label: 'Day', hour: 12 }, { label: 'Sunset', hour: 18.5 }, { label: 'Night', hour: 21 }, { label: 'Midnight', hour: 0 }]" :key="preset.label" type="button" :aria-pressed="!live && !autoPreview && Math.abs(previewHour - preset.hour) < .001" @click="setPreview(preset.hour)">{{ preset.label }}</button>
      <button type="button" :aria-pressed="autoPreview" @click="toggleAutoPreview">{{ autoPreview ? 'Pause cycle' : '▶ Cycle day' }}</button>
      <label class="time-bar-slider"><span>Time</span><input type="range" min="0" max="1439" step="1" :value="Math.floor(hour * 60)" :aria-valuetext="displayTime" @input="setPreview(Number($event.target.value) / 60)" /></label>
      <span class="time-bar-status">{{ live ? 'Live clock' : autoPreview ? '24 hours in 60 seconds' : 'Preview paused' }}</span>
    </div>
  </footer>
  </div>
</template>

<style scoped>
.poke-lab-page { min-height: 100dvh; background: #0c172b; color: #eef7ff; font-family: system-ui, sans-serif; padding: 12px; box-sizing: border-box; }
.poke-lab-page *, .poke-lab-page *::before, .poke-lab-page *::after { box-sizing: border-box; }
.poke-lab-page button, .poke-lab-page select { font: inherit; }
.poke-lab-page button { cursor: pointer; border: 1px solid #5b799e; border-radius: 9px; padding: 9px 14px; background: #203959; color: #f4f9ff; font-weight: 750; }
.poke-lab-page button:hover:not(:disabled) { background: #31547a; }
.poke-lab-page button:disabled { opacity: .42; cursor: default; }
.poke-lab-page :focus-visible { outline: 3px solid #ffdf7a; outline-offset: 3px; }
.lab-toolbar { max-width: 1672px; margin: 0 auto 12px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.lab-title { display: flex; flex: 1; gap: 12px; align-items: baseline; }
.lab-title span { color: #bbcee5; font-size: 13px; }
.lab-state { padding: 50px 24px; max-width: 800px; margin: auto; text-align: center; }
.lab-state a { color: #9de7ff; }
.lab-stage { position: relative; width: 100%; max-width: none; aspect-ratio: 1672 / 941; margin: auto; container-type: inline-size; overflow: hidden; border-radius: 16px; isolation: isolate; }
.lab-room { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; z-index: 1; pointer-events: none; }
.lab-screen { z-index: 2; position: absolute; display: flex; flex-direction: column; color: #f2f8ff; overflow: auto; scrollbar-width: thin; scrollbar-color: #589ac5 transparent; padding: 1cqw; overflow-wrap: anywhere; }
.prompt-screen { left: 7.8%; top: 21.3%; width: 19.5%; height: 15.8%; }
.answer-screen { left: 32.1%; top: 22%; width: 35.8%; height: 30.8%; padding: 1.3cqw; }
.screen-eyebrow { margin: 0 0 .65cqw; font-size: clamp(10px, .8cqw, 14px); color: #a4dafb; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.prompt-screen h1 { font-size: clamp(12px, 1.28cqw, 23px); line-height: 1.35; font-weight: 750; margin: 0 0 .45cqw; white-space: pre-wrap; }
.prompt-screen p:not(.screen-eyebrow), .card-position { font-size: clamp(10px, .85cqw, 15px); margin: 0; }
.card-position { margin-top: auto; color: #b9d5f5; padding-top: .4cqw; }
.lab-screen :deep(img) { display: block; max-width: 100%; max-height: 12cqw; object-fit: contain; margin: .5cqw auto; }
.answer-content { display: flex; flex-direction: column; flex: 1; }
.answer-copy { margin: auto 0; padding-block: .7cqw; white-space: pre-wrap; font-size: clamp(14px, 1.5cqw, 27px); line-height: 1.55; }
.answer-placeholder { margin: auto; text-align: center; }
.answer-placeholder > span { color: #62d5ff; font-size: 4cqw; line-height: 1; }
.answer-placeholder h2, .screen-message h2 { font-size: clamp(14px, 1.45cqw, 25px); margin: .6cqw 0; }
.answer-placeholder p, .screen-message { font-size: clamp(12px, 1cqw, 18px); line-height: 1.5; }
.answer-screen :deep(.study-button) { padding: 6px 10px; font-size: inherit; }
.answer-screen :deep(h2) { font-size: clamp(14px, 1.5cqw, 25px); }
.answer-screen :deep(h3) { font-size: clamp(13px, 1.2cqw, 21px); }
.answer-screen :deep(p), .answer-screen :deep(li) { font-size: clamp(12px, 1cqw, 18px); }
.buddy-chamber { z-index: 2; position: absolute; left: 74.6%; top: 41.3%; width: 15.7%; height: 29.8%; overflow: hidden; contain: paint; padding: .4cqw .5cqw 0; display: flex; align-items: flex-end; justify-content: center; pointer-events: none; }
.buddy-sprite { position: relative; z-index: 2; width: 92%; height: 92%; min-width: 0; min-height: 0; overflow: hidden; display: flex; align-items: flex-end; justify-content: center;  }
.buddy-sprite :deep(img) { width: 100%; height: 100%; max-width: 100%; max-height: 100%; min-width: 0; min-height: 0; object-fit: contain; object-position: center bottom; image-rendering: pixelated; display: block; }
.buddy-sprite img.is-artwork { image-rendering: auto; }
.buddy-sprite :deep(> *) { max-width: 100%; max-height: 100%; }
.lab-console { z-index: 2; position: absolute; left: 33.2%; top: 82.1%; width: 33.6%; height: 12.2%; display: flex; flex-direction: column; justify-content: center; gap: .45cqw; }
.console-modes, .console-actions, .console-status { display: flex; align-items: center; justify-content: center; gap: .6cqw; }
.poke-lab-page .lab-console button { font-size: clamp(10px, .9cqw, 16px); padding: .42cqw .8cqw; border-radius: .5cqw; white-space: nowrap; }
.console-modes button { font-size: clamp(9px, .7cqw, 13px) !important; padding: .15cqw .7cqw !important; background: transparent; border-color: transparent; }
.poke-lab-page button[aria-pressed='true'], .topic-options button[aria-current='true'] { background: #a9edff; color: #102845; border-color: #a9edff; }
.console-actions .reveal-button { background: #a9edff; color: #102845; flex: 1; }
.console-actions > button { flex: 1; }
.console-status { font-size: clamp(9px, .7cqw, 13px); color: #b9d5f5; }
.console-status button { border: 0; background: transparent; padding: 0 .5cqw !important; font-size: inherit !important; text-decoration: underline; }
.console-learn { text-align: center; font-size: clamp(12px, 1cqw, 18px); }
.console-learn progress { display: block; width: 85%; height: 8px; margin: 8px auto; accent-color: #6bddff; }
.lab-footer { max-width: 1672px; margin: 10px auto 0; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px 20px; color: #adc5df; font-size: 12px; }
.lab-footer p { flex-basis: 100%; margin: 0; }
.lab-dialog { color: #eff8ff; background: #132742; border: 1px solid #6b9bc8; border-radius: 20px; padding: 24px; width: min(540px, calc(100vw - 24px)); max-height: 85dvh; overflow: auto; }
.lab-dialog::backdrop { background: #050e20bb; backdrop-filter: blur(7px); }
.dialog-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; }
.dialog-heading h2 { margin: 0; }
.lab-dialog label { display: block; margin-bottom: 8px; }
.lab-dialog select { padding: 12px; background: #203959; color: #fff; width: 100%; border: 1px solid #6b9bc8; border-radius: 9px; }
.topic-options { display: grid; gap: 10px; margin-top: 16px; }
.topic-options button { text-align: left; min-height: 44px; }
.missing-background .lab-screen, .missing-background .lab-console { background: #122c4f; border-radius: 12px; }
/* Phones/tablets use readable cards below the room rather than tiny overlay text. */
@media (max-width: 1000px) {
  .poke-lab-page { padding: 8px; }
  .lab-toolbar { gap: 8px; }
  .lab-title { min-width: 50%; flex-direction: column; gap: 2px; }
  .lab-toolbar button { padding: 9px; font-size: 12px; min-height: 44px; }
  .lab-stage { aspect-ratio: auto; padding-top: 56.28%; background: #142b48 !important; }
  .lab-room { height: auto; aspect-ratio: 1672 / 941; }
  .lab-screen, .lab-console { position: relative; top: auto; left: auto; width: auto; height: auto; margin: 12px; padding: 20px; background: #142e53; border: 2px solid #39bdff; border-radius: 14px; }
  .prompt-screen { border-color: #f06874; }
  .prompt-screen h1 { font-size: 20px; }
  .answer-screen { min-height: 230px; max-height: 70dvh; }
  .screen-eyebrow, .card-position { font-size: 12px; }
  .answer-copy { font-size: 20px; }
  .answer-placeholder > span { font-size: 48px; }
  .answer-placeholder h2, .screen-message h2 { font-size: 21px; }
  .answer-placeholder p, .screen-message { font-size: 15px; }
  .lab-screen :deep(img) { max-height: 220px; }
  .buddy-chamber { top: 23.24cqw; height: 16.77cqw; }
  .lab-console { gap: 12px; }
  .console-actions, .console-modes, .console-status { gap: 8px; }
  .poke-lab-page .lab-console button { min-height: 44px; font-size: 13px !important; border-radius: 8px; padding: 8px !important; white-space: normal; }
  .console-status, .console-learn { font-size: 13px; }
  .console-actions button span { display: none; }
}

.timer-screen { align-items: center; justify-content: center; gap: .25cqw; text-align: center; padding: .5cqw; }
.timer-screen .screen-eyebrow { margin: 0; }
.focus-digits { font-size: clamp(24px, 3.4cqw, 58px); font-variant-numeric: tabular-nums; line-height: 1.12; letter-spacing: .03em; }
.focus-actions { display: flex; gap: .6cqw; }
.poke-lab-page .focus-actions button { padding: .3cqw .8cqw; font-size: clamp(10px, .85cqw, 15px); }
.focus-finished { font-size: clamp(9px, .72cqw, 13px); color: #ffd3a6; }
.question-reminder { font-size: clamp(11px, .9cqw, 16px); color: #a6c6e6; margin: 0 0 .5cqw; white-space: pre-wrap; }
.screen-flip { align-self: center; margin-top: .7cqw; font-size: clamp(11px, .9cqw, 16px) !important; padding: .5cqw 1cqw !important; }
.console-status { margin: 0; text-align: center; }
.poke-lab-page .rating-actions button { min-height: 3.2cqw; font-size: clamp(12px, 1.2cqw, 21px); }
.poke-lab-page .rate-again { background: #ab354c; border-color: #f17e90; }
.poke-lab-page .rate-easy { background: #24694f; border-color: #6ddaa2; }
.poke-lab-page .rate-hard { background: #9c681a; border-color: #f2c46d; }
@media (max-width: 1000px) {
  .timer-screen { padding: 20px; gap: 10px; }
  .focus-digits { font-size: 52px; }
  .poke-lab-page .focus-actions button { min-height: 44px; padding: 8px 18px; font-size: 14px; }
  .focus-finished { font-size: 13px; }
  .screen-flip { min-height: 44px; font-size: 14px !important; padding: 8px 16px !important; }
  .question-reminder { font-size: 14px; }
}
.chamber-status { align-self: center; color: #e0cfff; text-align: center; font-size: clamp(8px, .8cqw, 14px); }

.lab-sky { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.lab-celestial { position: absolute; z-index: 1; width: 10%; transform: translate(-50%, -50%); transition: opacity 1.5s ease; }
.lab-moon { width: 7%; }
.lab-celestial img { width: 100%; height: auto; display: block; }
.lab-stars, .lab-clouds { position: absolute; inset: 0; }
.lab-stars { z-index: 2; }
.lab-clouds { z-index: 3; }
.lab-stars > img, .lab-clouds > img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; object-fit: fill; }
.lab-clouds > img, .fallback-clouds { left: -5%; width: 110%; animation: lab-cloud-drift 80s ease-in-out infinite alternate; }
.lab-stars > img, .fallback-stars { animation: lab-twinkle 5s ease-in-out infinite alternate; }
.fallback-stars, .fallback-clouds { position: absolute; inset: 0; }
.fallback-stars i { position: absolute; background: #fff; border-radius: 50%; box-shadow: 0 0 4px #fff; }
.sun-fallback, .moon-fallback { display: block; width: 100%; aspect-ratio: 1; border-radius: 50%; }
.sun-fallback { background: radial-gradient(circle, #fff7b4 25%, #ffdb6e 70%); box-shadow: 0 0 35px #ffe79b88; }
.moon-fallback { background: radial-gradient(circle at 35% 35%, #fffdeb, #c1d4eb); box-shadow: 0 0 20px #d3e7ff55; }
.fallback-clouds i { position: absolute; width: 25%; height: 8%; background: #ffffffaa; border-radius: 50%; filter: blur(8px); }
.fallback-clouds i:nth-child(1) { left: 4%; top: 17%; }
.fallback-clouds i:nth-child(2) { left: 45%; top: 6%; width: 35%; }
.fallback-clouds i:nth-child(3) { left: 80%; top: 32%; }
@keyframes lab-cloud-drift { from { transform: translateX(-2%); } to { transform: translateX(2%); } }
@keyframes lab-twinkle { from { opacity: .7; } to { opacity: 1; } }
@media (max-width: 1000px) { .lab-sky { bottom: auto; height: 56.28cqw; } }
@media (prefers-reduced-motion: reduce) {
  .lab-clouds > img, .fallback-clouds, .lab-stars > img, .fallback-stars { animation: none; }
  .lab-celestial { transition: none; }
}

.timer-frame {
  position: absolute;
  z-index: 2;
  left: 7.05%;
  top: 11.2cqw;
  width: 21.25%;
  height: 10.44cqw;
  border: .25cqw solid var(--timer-border, #ff4057);
  border-radius: 1.2cqw;
  box-shadow: 0 0 .3cqw var(--timer-border, #ff4057), inset 0 0 .15cqw var(--timer-border, #ff4057);
  pointer-events: none;
  transition: border-color .25s ease, box-shadow .25s ease;
}
@media (max-width: 1000px) {
  .timer-screen { border-width: 2px; border-color: var(--timer-border, #ff4057); box-shadow: 0 0 5px var(--timer-border, #ff4057); }
}
@media (prefers-reduced-motion: reduce) { .timer-frame { transition: none; } }
.lab-landscape {
  position: absolute;
  z-index: 4;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 85%;
  max-width: none;
  object-fit: fill;
  pointer-events: none;
}

.lab-navigation {
  position: absolute;
  z-index: 2;
  left: 9.15%;
  top: 45.2%;
  width: 15.3%;
  height: 13.6%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: .7cqw;
  padding: .6cqw;
}
.poke-lab-page .lab-navigation button,
.lab-navigation a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 2.5cqw;
  padding: .5cqw;
  border: 1px solid #72c9ed;
  border-radius: .55cqw;
  background: #203959;
  color: #f4f9ff;
  text-decoration: none;
  font: inherit;
  font-size: clamp(11px, 1.05cqw, 18px);
  font-weight: 750;
  text-align: center;
}
.lab-navigation a:hover { background: #31547a; }
.state-home-link { color: #c4edff; }
@media (max-width: 1000px) {
  .lab-navigation {
    position: relative;
    left: auto;
    top: auto;
    width: auto;
    height: auto;
    margin: 12px;
    padding: 16px;
    flex-direction: row;
    gap: 10px;
    border: 2px solid #39bdff;
    border-radius: 14px;
    background: #142e53;
  }
  .poke-lab-page .lab-navigation button, .lab-navigation a {
    min-height: 44px;
    padding: 10px;
    font-size: 14px;
    border-radius: 8px;
  }
}

/* Contact with the platform and a faint glass reflection give the sprite depth.
   The image itself keeps crisp pixel rendering with no blur or colour filter. */
.buddy-contact-shadow {
  position: absolute;
  z-index: 1;
  left: 12%;
  bottom: 0;
  width: 76%;
  height: 8%;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgb(24 6 55 / 72%) 10%, rgb(31 8 63 / 36%) 52%, transparent 74%);
  pointer-events: none;
}
.buddy-chamber.has-pokemon::after {
  content: '';
  position: absolute;
  z-index: 3;
  inset: 0;
  background: linear-gradient(100deg, transparent 4%, rgb(187 238 255 / 10%) 8%, transparent 16%, transparent 78%, rgb(187 180 255 / 8%) 91%, transparent 96%);
  pointer-events: none;
}

/* Same glass-card selection design as PokéArena. */
.poke-lab-page.is-selecting { position: fixed; inset: 0; overflow: hidden; }
.lab-stage.selection-blur { filter: blur(9px) brightness(.64); pointer-events: none; }
.is-selecting .lab-toolbar { position: relative; z-index: 10; }
.poke-lab-page .arena-picker { position: absolute; z-index: 8; inset: 90px 0 0; overflow-y: auto; padding: 28px 24px 130px; color: white; text-align: center; }
.poke-lab-page .picker-shell { width: min(940px, 100%); margin: auto; padding: 28px 0; }
.poke-lab-page .picker-eyebrow { color: #ffe9ae; font-size: 12px; font-weight: 800; letter-spacing: .2em; }
.poke-lab-page .picker-shell h1 { margin: 16px 0 12px; color: white; font-size: clamp(28px, 4vw, 48px); font-weight: 800; text-shadow: 0 3px 18px #0007; }
.poke-lab-page .picker-intro { margin-bottom: 28px; color: #fff6e3; font-size: 17px; }
.poke-lab-page .bubble-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 22px; }
.poke-lab-page .bubble-card { position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 14px; width: 100%; min-height: 190px; padding: 26px 20px; border: 1px solid #ffffff9e; border-radius: 32px; background: linear-gradient(145deg, #ffffff38, #ffffff12); box-shadow: inset 0 1px 0 #ffffffb3, inset 0 -1px 0 #ffffff26, 0 12px 30px #071b3544; backdrop-filter: blur(18px); color: white; font: inherit; cursor: pointer; transition: transform .18s, background .18s, box-shadow .18s; }
.poke-lab-page .bubble-card strong { font-size: 22px; line-height: 1.3; overflow-wrap: anywhere; }
.poke-lab-page .bubble-card > span:last-child { font-size: 13px; color: #fff5df; }
.poke-lab-page .bubble-symbol { font-size: 36px; color: #ffe699; text-shadow: 0 0 18px #ffe4a455; }
.poke-lab-page .bubble-card:hover:not(:disabled) { transform: translateY(-5px); background: linear-gradient(145deg, #ffffff55, #ffffff22); box-shadow: 0 0 0 2px #ffe19a, 0 18px 38px #071b3555; }
.poke-lab-page .bubble-card:disabled { opacity: .65; cursor: not-allowed; }
.poke-lab-page .topic-choice { display: flex; flex-direction: column; gap: 12px; }
.poke-lab-page .topic-choice .bubble-card { flex: 1; }
.poke-lab-page .revise-link { color: #ffe6a1; font-weight: 700; font-size: 14px; }
.poke-lab-page .picker-back, .poke-lab-page .glass-action { display: inline-block; margin: 0 0 22px; padding: 12px 20px; border: 1px solid #ffffff88; border-radius: 20px; background: #ffffff22; color: white; text-decoration: none; font: inherit; cursor: pointer; }
.poke-lab-page .picker-footnote { margin: 28px 0 0; font-size: 12px; color: #e0e8f5; }
.poke-lab-page .picker-notice { padding: 12px; border: 1px solid #ffe19a77; border-radius: 12px; background: #203046b3; }

.poke-lab-page .arena-picker { position: absolute; inset: 90px 0 0; padding-bottom: 24px; }
.science-filters { display: grid; justify-items: center; gap: 14px; margin-bottom: 24px; }
.science-filters p { margin: 0; max-width: 650px; font-size: 12px; line-height: 1.6; color: #e2ebf6; }
.science-level-label { padding: 10px 20px; border: 1px solid #ffe29b; border-radius: 20px; background: #ffe29b; color: #20334b; }
.science-theme { color: #ffe49b; text-transform: uppercase; font-size: 10px; letter-spacing: .12em; }
@media (max-width: 700px) {
  .poke-lab-page .arena-picker { padding: 12px 18px 24px; }
  .poke-lab-page .bubble-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .poke-lab-page .bubble-card { min-height: 160px; padding: 18px 10px; border-radius: 24px; }
  .poke-lab-page .bubble-card strong { font-size: 17px; }
}
@media (prefers-reduced-motion: reduce) { .poke-lab-page .bubble-card { transition: none; } }

.arena-hud {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  left: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}

.home-link,
.arena-clock {
  border: 1px solid rgb(255 255 255 / 40%);
  border-radius: 14px;
  background: rgb(16 30 52 / 80%);
  color: white;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 14px rgb(0 0 0 / 15%);
}

.home-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  pointer-events: auto;
}

.home-link:hover {
  border-color: #ffdc77;
  color: #ffdc77;
}

.arena-clock {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 10px 14px;
}

.arena-clock strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.arena-clock span {
  color: #e2eafa;
  font-size: 12px;
}

button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid #ffdc55;
  outline-offset: 4px;
}

@media (max-width: 600px) {
  .arena-hud {
    top: 10px;
    left: 10px;
    right: 10px;
  }

  .home-link,
  .arena-clock {
    padding: 8px 10px;
  }

  .arena-clock {
    gap: 6px;
  }

  .arena-clock strong {
    font-size: 15px;
  }

  .arena-clock span {
    font-size: 10px;
  }
}

/* The footer is a separate grid row, never an overlay on the battle. */
.arena-with-preview { position: fixed; inset: 0; display: grid; grid-template-rows: minmax(0, 1fr) auto; background: #101d30; }
.arena-with-preview > .arena-page { position: relative; inset: auto; width: 100%; height: 100%; min-height: 0; container-type: size; }
.arena-with-preview .arena-scene { width: min(100%, calc(100cqh * 1672 / 941)); }
.time-preview-bar { position: relative; min-width: 0; overflow-x: auto; border-top: 2px solid #b99a58; background: #14243a; color: #fff1cf; padding: 10px 14px max(10px, env(safe-area-inset-bottom)); font-family: system-ui, sans-serif; }
.time-bar-inner { display: flex; align-items: center; justify-content: center; gap: 8px; width: max-content; min-width: 100%; }
.time-bar-title { display: flex; align-items: center; gap: 10px; margin-right: 8px; font-size: 12px; white-space: nowrap; }
.time-bar-title span { color: #ffdf85; font-variant-numeric: tabular-nums; }
.time-preview-bar button { min-height: 36px; padding: 7px 11px; border: 1px solid #718096; border-radius: 8px; background: #253951; color: #fff3d6; font: inherit; font-size: 12px; cursor: pointer; white-space: nowrap; }
.time-preview-bar button:hover { background: #3b526d; }
.time-preview-bar button[aria-pressed='true'] { background: #ffdf85; border-color: #ffdf85; color: #233047; }
.time-bar-slider { display: flex; align-items: center; gap: 8px; margin: 0 8px; font-size: 12px; }
.time-bar-slider input { width: clamp(100px, 12vw, 200px); accent-color: #ffdf85; }
.time-bar-status { font-size: 11px; color: #c6d4e7; white-space: nowrap; }
.time-preview-bar button:focus-visible, .time-preview-bar input:focus-visible { outline: 2px solid #ffdf85; outline-offset: 2px; }
@media (max-width: 700px) {
  .arena-with-preview .arena-scene { width: 100%; }
  .time-bar-inner { justify-content: flex-start; }
  .arena-picker { padding-bottom: 24px; }
  .battle-dock { margin-bottom: 24px; }
}

/* Shared Studydex shell: identical font, navigation and clock on both pages. */
.arena-hud { position: fixed; font-family: system-ui, sans-serif; }
.arena-hud .home-link { font-family: inherit; font-size: 13px; font-weight: 700; line-height: 1.4; }
.arena-hud .change-topic { margin-inline: auto; }
.arena-hud .arena-clock { margin-left: auto; }
.arena-hud button.home-link { border: 1px solid rgb(255 255 255 / 40%); border-radius: 14px; background: rgb(16 30 52 / 80%); padding: 10px 14px; color: white; }
.arena-hud button.home-link:hover { border-color: #ffdc77; color: #ffdc77; background: rgb(16 30 52 / 80%); }
.arena-picker { font-family: system-ui, sans-serif; }
@media(max-width:600px) { .arena-hud button.home-link { padding: 8px 10px; } }

.lab-with-preview > .poke-lab-page { position: relative; inset: auto; min-height: 0; height: 100%; padding: 0; overflow-y: auto; container-type: size; background: #101d30; }

.lab-with-preview .poke-lab-page.is-selecting { overflow: hidden; }
.lab-with-preview .lab-footer { padding: 0 16px; }
.lab-with-preview .lab-state { margin-top: 90px; }
@media(max-width:1000px) {
 .lab-with-preview .poke-lab-page:not(.is-selecting) { padding-top: 75px; }
 .lab-with-preview .lab-stage { width: 100%; }
}
/* Responsive room layout: one uncapped scene, sized from the available
   grid row above the time preview bar. All interactive overlays scale
   together with the artwork so they stay aligned. */
.lab-with-preview {
  width: 100%;
  height: 100dvh;
  min-width: 0;
  overflow: hidden;
}
.lab-with-preview > .poke-lab-page {
  width: 100%;
  min-width: 0;
  isolation: isolate;
}
/* Extend the artwork into unused space without stretching the controls. */
.lab-with-preview > .poke-lab-page::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: linear-gradient(#101d3066, #101d3066), var(--lab-backdrop);
  background-size: cover;
  background-position: center;
  filter: blur(18px) brightness(.65);
  pointer-events: none;
}
.lab-with-preview .lab-stage { max-width: none; }

/* Topic selection: artwork covers the full available area. */
.lab-with-preview .poke-lab-page.is-selecting { overflow: hidden; }
.lab-with-preview .poke-lab-page.is-selecting .lab-stage {
  position: absolute;
  top: 50%;
  left: 50%;
  width: max(100cqw, calc(100cqh * 1672 / 941));
  height: auto;
  aspect-ratio: 1672 / 941;
  padding-top: 0;
  margin: 0;
  border-radius: 0;
  transform: translate(-50%, -50%) scale(1.02);
}
@media (min-width: 1001px) {
  /* Preserve the whole interactive room, even on ultrawide monitors. */
  .lab-with-preview .poke-lab-page:not(.is-selecting) {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    padding: 0 0 32px;
  }
  .lab-with-preview .poke-lab-page:not(.is-selecting) .lab-stage {
    position: relative;
    width: min(100cqw, calc(100cqh * 1672 / 941));
    height: auto;
    aspect-ratio: 1672 / 941;
    margin: 0;
    padding: 0;
    flex-shrink: 0;
    border-radius: 0;
  }
  .lab-with-preview .poke-lab-page:not(.is-selecting) .lab-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    max-width: none;
    min-height: 24px;
    margin: 0;
    padding: 4px 16px;
    justify-content: flex-end;
    box-sizing: border-box;
  }
}
@media (max-width: 1000px) {
  /* Retain readable, scrollable flashcard controls on smaller devices. */
  .lab-with-preview .poke-lab-page:not(.is-selecting) {
    display: block;
    overflow-y: auto;
    padding-top: 75px;
  }
  .lab-with-preview .poke-lab-page:not(.is-selecting) .lab-stage {
    width: 100%;
    aspect-ratio: auto;
    margin: 0;
  }
  .lab-with-preview .poke-lab-page.is-selecting .lab-room {
    height: 100%;
    aspect-ratio: auto;
  }
}


</style>

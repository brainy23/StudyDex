<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { isNavigationFailure, NavigationFailureType, onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router'
import { useReducedMotion } from 'motion-v'
import { getCurrentProfile } from '../services/profileService'
import {
  getStudyCatalogue,
  getTopicLesson,
  getTopicFlashcards,
  getSelectedStudyBuddy,
  studyErrorMessage,
} from '../services/studyService'
import { useTimer } from '../components/timer/useTimer'
import StudyLearn from '../components/study/StudyLearn.vue'
import StudyFlashcards from '../components/study/StudyFlashcards.vue'
import StudyImage from '../components/study/StudyImage.vue'
import TownBackground from '../components/common/TownBackground.vue'
import ClockWeather from '../components/common/ClockWeather.vue'
import PokemonBuddy from '../components/pokebuddy/PokemonBuddy.vue'
import { useTopicCompletion } from '../composables/useTopicCompletion'
import { useArenaTransition } from '../composables/useArenaTransition'
import { displayTitle } from '../utils/displayText'
import { arenaLocation, requestedConceptIds, requestedTopicId } from '../utils/studyNavigation'
import { readEncounter, writeEncounter, makeQuestions } from '../composables/bossEncounter'
import '../assets/study.css'

const route = useRoute()
const router = useRouter()
const timer = useTimer()
const arenaTransition = useArenaTransition()
const arenaState = arenaTransition.state
const reducedMotion = useReducedMotion()
const topicCompletion = useTopicCompletion()
const { savedInBrowser } = topicCompletion
const profile = ref(null)
const catalogue = ref({ subjects: [], topics: [] })
const loading = ref(true)
const error = ref(null)
const buddy = ref(null)
const buddyError = ref(null)
const buddyLoading = ref(false)
const topicSelection = ref(null)
const resources = reactive({})
const progress = reactive({})
const practiceResume = ref(null)
const practiceError = ref('')
const practiceBusy = ref(false)
let alive = true
let generation = 0

const mode = computed(() =>
  ['learn', 'flashcards'].includes(route.query.mode) ? route.query.mode : 'learn',
)
const selectingTopic = computed(() => route.query.view === 'topics')
const requestedTopic = computed(() => requestedTopicId(route.query))
const reviewConceptIds = computed(() => requestedConceptIds(route.query))
const subject = computed(() => {
  const subjects = catalogue.value.subjects
  if (route.query.subject) return subjects.find((item) => item.id === route.query.subject) || null
  const selected = catalogue.value.topics.find((item) => item.id === requestedTopic.value)
  const initialSubjectId = selected?.subject_id || catalogue.value.topics[0]?.subject_id
  return subjects.find((item) => item.id === initialSubjectId) || subjects[0] || null
})
const availableTopics = computed(() =>
  catalogue.value.topics.filter((item) => item.subject_id === subject.value?.id),
)
const topic = computed(() =>
  selectingTopic.value ? null : requestedTopic.value
    ? availableTopics.value.find((item) => item.id === requestedTopic.value) || null
    : availableTopics.value[0] || null,
)
const nextArena = computed(() => arenaLocation(topic.value, subject.value?.id))
const otherTopics = computed(() => catalogue.value.topics.filter((item) => item.id !== route.query.from_topic_id))
const noOtherPopulatedTopics = computed(() => otherTopics.value.length > 0 && otherTopics.value.every(
  (item) => !topicContentPending(item) && !topicHasContent(item) && !topicContentFailed(item),
))
const currentResources = computed(() => resources[topic.value?.id])
const readingProgress = computed(
  () =>
    progress[topic.value?.id] || {
      read: 0,
      total: currentResources.value?.lesson.data?.concepts.length || 0,
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
    timer.bindUser(student.id)
    loadBuddy(student.id, request)
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

async function loadBuddy(userId, request) {
  buddyLoading.value = true
  buddy.value = null
  buddyError.value = null
  try {
    const data = await getSelectedStudyBuddy(userId)
    if (alive && request === generation) buddy.value = data
  } catch (cause) {
    if (alive && request === generation) buddyError.value = cause
  } finally {
    if (alive && request === generation) buddyLoading.value = false
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
  delete query.concept_id
  delete query.concept_ids
  delete query.review
  router.push({ name: 'study-decks', query })
}

function goToArena() {
  if (!topic.value) return
  arenaTransition.start({
    router,
    location: nextArena.value,
    topicName: topic.value.name,
    reducedMotion: reducedMotion.value,
    onStart: () => timer.pause('Your session was paused when you left Poké Lab. Resume when you return.'),
  })
}

async function startBossPractice(snapshot) {
  if (practiceBusy.value || arenaState.active || !profile.value || !topic.value || !router.hasRoute('surprise-boss')) return
  practiceError.value = ''
  const questions = makeQuestions((currentResources.value?.flashcards.data || []).map(card => ({
    front: card.front_text, back: card.back_text,
  })))
  if (!questions.length) {
    practiceError.value = 'This deck needs at least two different text answers for boss practice.'
    return
  }
  const encounter = {
    id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
    createdAt: Date.now(), owner: profile.value.id, topic: topic.value.id,
    topicName: topic.value.name, questions, status: 'pending',
    index: 0, choice: null, score: 0, finished: false,
    returnQuery: { ...route.query, mode: 'flashcards' }, snapshot,
  }
  if (!writeEncounter(encounter)) {
    practiceError.value = 'Boss practice needs browser session storage to preserve your deck.'
    return
  }
  timer.pause('Your timer is paused for optional boss practice. Resume when you return.')
  practiceBusy.value = true
  try {
    const failure = await router.push({ name: 'surprise-boss', query: { encounter: encounter.id } })
    if (failure) practiceError.value = 'Boss practice navigation was cancelled. Your deck is unchanged.'
  } catch {
    practiceError.value = 'Could not open boss practice. Your deck and paused timer are preserved.'
  } finally { practiceBusy.value = false }
}

function restorePractice() {
  practiceResume.value = null
  const encounter = readEncounter()
  if (!encounter || !['pending', 'complete'].includes(encounter.status) ||
      encounter.owner !== profile.value?.id || encounter.topic !== topic.value?.id ||
      !currentResources.value?.flashcards.data) return
  practiceResume.value = { id: encounter.id, snapshot: encounter.snapshot }
  encounter.status = 'returned'
  writeEncounter(encounter)
}

async function reviseAnotherTopic() {
  await router.push({
    name: 'study-decks',
    query: { view: 'topics', mode: 'flashcards', from_topic_id: topic.value?.id },
  })
  await nextTick()
  topicSelection.value?.querySelector('h2')?.focus()
}

function topicHasContent(item) {
  const data = resources[item.id]
  return Boolean(data?.flashcards.data?.length || data?.lesson.data?.concepts.length)
}

function topicContentPending(item) {
  const data = resources[item.id]
  return !data || data.lesson.loading || data.flashcards.loading
}

function topicContentFailed(item) {
  const data = resources[item.id]
  return data?.lesson.error || data?.lesson.data?.errors.concepts || data?.flashcards.error
}

function topicContentLabel(item) {
  const data = resources[item.id]
  if (topicContentPending(item)) return 'Checking content…'
  if (data?.flashcards.data?.length) return 'Flashcards available'
  if (data?.lesson.data?.concepts.length) return 'Concepts available · No flashcards yet'
  if (topicContentFailed(item)) return 'Content could not be loaded'
  return 'No study content available yet'
}

function retryTopicContent(item) {
  loadResource(item.id, 'lesson')
  loadResource(item.id, 'flashcards')
}

function completeTopic(id) {
  if (id === topic.value?.id) topicCompletion.markComplete(id)
}

function chooseTopic(selected) {
  return router.push({
    name: 'study-decks',
    query: {
      subject: selected.subject_id,
      topic_id: selected.id,
      mode: selectingTopic.value ? resources[selected.id]?.flashcards.data?.length ? 'flashcards' : 'learn' : mode.value,
    },
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
watch(() => [profile.value?.id, topic.value?.id, currentResources.value?.flashcards.data], restorePractice)
watch(() => [selectingTopic.value, catalogue.value.topics], ([selecting]) => {
  if (selecting) catalogue.value.topics.forEach((item) => loadTopic(item.id))
})
onMounted(initialise)
onBeforeRouteLeave(() => {
  timer.pause('Your session was paused when you left Poké Lab. Resume when you return.')
})
onUnmounted(() => {
  alive = false
  generation++
})

const enteredLab = ref(Boolean(requestedTopicId(route.query)) && route.query.view !== 'topics')
const pickerSubjectId = ref(route.query.subject || null)
const pickerBusy = ref(false)
const pickerError = ref('')
const backgroundFailed = ref(false)
const visibleSubjects = computed(() => catalogue.value.subjects)
const pickerSubject = computed(() => catalogue.value.subjects.find(item => item.id === pickerSubjectId.value))
const pickerTopics = computed(() => catalogue.value.topics.filter(item => item.subject_id === pickerSubjectId.value))
const timerBorderStyle = computed(() => ({ '--timer-border': timer.state.status !== 'running' ? '#ff4057' : timer.secondsLeft.value <= 120 ? '#ffd43b' : '#34e782' }))
const timerLabel = computed(() => timer.state.status === 'running' ? 'Pause' : timer.state.status === 'paused' ? 'Resume' : timer.state.status === 'complete' && timer.state.phase === 'focus' ? 'Start 5-minute Break' : 'Start Study Session')
function toggleTimer() {
  if (timer.state.status === 'running') timer.pause()
  else if (timer.state.status === 'paused') timer.resume()
  else if (timer.state.status === 'complete' && timer.state.phase === 'focus') timer.startBreak()
  else timer.startSession(topic.value?.id)
}
function returnToSelection() {
  enteredLab.value = false
  pickerSubjectId.value = subject.value?.id || null
  pickerError.value = ''
}
async function selectPickerSubject(id) {
  pickerSubjectId.value = id
  const query = { ...route.query, subject: id }
  delete query.topic
  delete query.topic_id
  await router.push({ name: 'study-decks', query })
}
async function selectLabTopic(item) {
  if (pickerBusy.value) return
  pickerBusy.value = true
  pickerError.value = ''
  try {
    const failure = await chooseTopic(item)
    if (failure && !isNavigationFailure(failure, NavigationFailureType.duplicated)) throw new Error('Navigation cancelled')
    enteredLab.value = true
  } catch { pickerError.value = 'Could not open this topic. Please try again.' }
  finally { pickerBusy.value = false }
}
watch(() => route.query.view, value => { if (value === 'topics') returnToSelection() })
watch(() => [loading.value, topic.value?.id, route.query.view], ([pending, id, view]) => {
  if (pending) return
  if (!id || view === 'topics') enteredLab.value = false
  else if (requestedTopic.value) enteredLab.value = true
})
const previewPokemon = ref(null)
const previewError = ref('')
let previewController
onMounted(async () => {
  previewController = new AbortController()
  try {
    const response = await fetch('https://pokeapi.co/api/v2/pokemon/150/', { signal: previewController.signal })
    if (!response.ok) throw new Error('Preview unavailable')
    const data = await response.json()
    if (!previewController.signal.aborted) previewPokemon.value = data
  } catch (cause) { if (cause.name !== 'AbortError') previewError.value = 'Companion preview unavailable.' }
})
onUnmounted(() => previewController?.abort())
const roomPokemon = computed(() => {
  if (buddy.value?.pokemon?.sprite_url) return {
    id: buddy.value.pokemon.pokeapi_id, name: buddy.value.pokemon.name, xp: buddy.value.xp,
    evolution_stage: 0, animated_img: buddy.value.pokemon.sprite_url, static_img: buddy.value.pokemon.sprite_url,
  }
  const data = previewPokemon.value
  if (!data) return null
  const still = data.sprites?.front_default || ''
  const animated = data.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default
  return { id: data.id, name: data.name, xp: 0, evolution_stage: 0, animated_img: (enteredLab.value && !reducedMotion.value && animated) || still, static_img: still }
})

</script>

<template>
  <div class="study-page designed-lab">
    <main class="poke-lab-page" :class="{ 'is-selecting': !enteredLab }">
      <header class="study-header">
        <RouterLink to="/home" class="home-link">‹ Back to town</RouterLink>
        <button v-if="enteredLab" type="button" class="home-link change-topic" @click="returnToSelection">Topics</button>
        <div class="study-clock"><ClockWeather :use-device-location="true" /></div>
        <h1 class="visually-hidden">Poké Lab</h1>
      </header>
      <div class="study-content">
        <div v-if="loading" class="lab-state" role="status">Opening your Poké Lab…</div>
        <div v-else-if="error" class="lab-state" role="alert">
          <h2>We could not open your study content</h2>
          <p>{{ studyErrorMessage(error, 'Your study content') }}</p>
          <button @click="initialise">Try again</button>
        </div>
        <div v-else-if="!profile?.school_level_id" class="lab-state">
          <h2>Set your school level first</h2>
          <RouterLink to="/account">Open Account Settings</RouterLink>
        </div>
        <KeepAlive v-else>
          <StudyFlashcards v-if="topic && currentResources && activeResource" :key="topic.id" :resource="currentResources.flashcards" :practice-resume="practiceResume">
            <template #room="{ review, rate, flip, restart, snapshot }">
              <section class="lab-stage" :class="{ 'missing-background': backgroundFailed, 'selection-blur': !enteredLab }" :inert="!enteredLab" :aria-hidden="!enteredLab" :style="timerBorderStyle" aria-label="Poké Lab study room">
                <TownBackground scene="lab" :paused="!enteredLab" @image-error="backgroundFailed = true" />
                <div class="timer-frame" aria-hidden="true"></div>
                <section class="lab-screen prompt-screen timer-screen study-timer" aria-label="Study Block Timer">
                  <p class="screen-eyebrow">{{ timer.state.phase === 'focus' ? '25-minute focus' : '5-minute break' }}</p>
                  <strong class="focus-digits" role="timer" aria-label="Time remaining">{{ timer.display.value }}</strong>
                  <div class="focus-actions">
                    <button @click="toggleTimer">{{ timerLabel }}</button>
                    <button @click="timer.endSession">Reset</button>
                  </div>
                  <span v-if="timer.state.status === 'complete'" class="focus-finished" role="status">Session complete — take a break!</span>
                </section>
                <nav class="lab-navigation" aria-label="Room navigation">
                  <div class="lab-mode-toggle study-mode-nav" aria-label="Learning modes">
                    <button :aria-pressed="mode === 'learn'" @click="setMode('learn')">Learn</button>
                    <button :aria-pressed="mode === 'flashcards'" @click="setMode('flashcards')">Flashcards</button>
                  </div>
                  <button :disabled="arenaState.active || practiceBusy" @click="goToArena">Go to Poké Arena</button>
                </nav>
                <section class="lab-screen answer-screen main-study" aria-label="Learning content" tabindex="0">
                  <p class="screen-eyebrow study-topic-label">{{ displayTitle(subject?.name) }} · {{ displayTitle(topic.name) }}</p>
                  <KeepAlive>
                    <StudyLearn v-if="mode === 'learn'" :topic="topic" :resource="currentResources.lesson" :review-concept-ids="reviewConceptIds" :show-overview="route.query.review === 'topic'" :arena-busy="arenaState.active" @progress="updateProgress" @complete="completeTopic" @mode="setMode" @retry="retryMode" @arena="goToArena" />
                  </KeepAlive>
                  <div v-if="mode === 'flashcards'" class="study-flashcards">
                    <p v-if="currentResources.flashcards.loading" role="status">Loading flashcards…</p>
                    <div v-else-if="currentResources.flashcards.error" class="screen-message" role="alert">
                      <p>{{ studyErrorMessage(currentResources.flashcards.error, 'Flashcards') }}</p><button @click="retryMode">Try again</button>
                    </div>
                    <div v-else-if="!review.cards.length" class="screen-message study-empty"><h2>No flashcards yet</h2><p>There are no flashcards for this topic yet.</p><button @click="setMode('learn')">Back to Learn</button></div>
                    <div v-else-if="review.complete" class="screen-message study-completion">
                      <h2 tabindex="-1">Flashcards Completed!</h2><p>{{ review.remembered.length }} unique cards remembered · {{ review.reviews }} total review attempts</p>
                      <button @click="reviseAnotherTopic">Revise Another Topic</button>
                      <button :disabled="arenaState.active" @click="goToArena">Go to Poké Arena</button>
                      <button @click="restart">Restart Deck</button>
                    </div>
                    <div v-else-if="review.current" class="answer-content" aria-live="polite">
                      <p class="screen-eyebrow">Flashcard · {{ review.flipped ? 'Answer' : 'Question' }}</p>
                      <div v-if="!review.flipped" class="study-card-front">
                        <h2 class="answer-copy study-card-text">{{ review.current.front_text }}</h2>
                        <StudyImage :path="review.current.front_image_path || ''" alt="Question illustration" />
                      </div>
                      <div v-else class="study-card-back">
                        <p class="question-reminder">{{ review.current.front_text }}</p>
                        <p class="answer-copy study-card-text">{{ review.current.back_text }}</p>
                        <StudyImage :path="review.current.back_image_path || ''" alt="Answer illustration" />
                      </div>
                      <button class="screen-flip study-flip-card" :aria-pressed="review.flipped" @click="flip">{{ review.flipped ? 'Show question' : 'Reveal answer' }}</button>
                    </div>
                  </div>
                </section>
                <aside class="buddy-chamber" :class="{ 'has-pokemon': !!roomPokemon }" aria-label="Your study buddy">
                  <div v-if="roomPokemon" class="buddy-contact-shadow" aria-hidden="true"></div>
                  <div class="buddy-sprite">
                    <PokemonBuddy v-if="roomPokemon" class="lab-pokemon-buddy" :active-pokemon="roomPokemon" />
                    <span v-else class="chamber-status">{{ previewError || 'Loading companion…' }}</span>
                  </div>
                </aside>
                <nav class="lab-console" :aria-label="mode === 'flashcards' ? 'Flashcard ratings' : 'Concept navigation'">
                  <template v-if="mode === 'flashcards'">
                    <div class="console-actions rating-actions study-ratings">
                      <button class="rate-again" :disabled="!review.current || !review.flipped || currentResources.flashcards.loading || !!currentResources.flashcards.error" @click="rate('practise')">Again</button>
                      <button class="rate-easy" :disabled="!review.current || !review.flipped || currentResources.flashcards.loading || !!currentResources.flashcards.error" @click="rate('remembered')">Easy</button>
                      <button class="rate-hard" :disabled="!review.current || !review.flipped || currentResources.flashcards.loading || !!currentResources.flashcards.error" @click="rate('hard')">Hard</button>
                    </div>
                    <p class="console-status study-review-progress">{{ review.remembered.length }} / {{ review.cards.length }} remembered · {{ review.queue.length }} still to review</p>
                    <p v-if="review.current" class="console-status study-card-position">Card {{ review.cardNumber }} of {{ review.cards.length }}</p>
                  </template>
                  <template v-else>
                    <div class="console-actions rating-actions"><button class="rate-again" disabled>Again</button><button class="rate-easy" disabled>Easy</button><button class="rate-hard" disabled>Hard</button></div>
                    <p class="console-status study-topic-progress">{{ readingProgress.read }} of {{ readingProgress.total }} concepts read</p>
                    <span class="visually-hidden" role="progressbar" aria-label="Reading progress" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100"></span>
                  </template>
                </nav>
              </section>
              <footer v-if="enteredLab" class="lab-footer">
                <p v-if="arenaState.error || practiceError" role="alert">{{ arenaState.error || practiceError }}</p>
                <span v-if="timer.state.notice" role="status">{{ timer.state.notice }}</span>
                <span>{{ profile.school_level?.name }} · {{ subject?.name }}</span>
                <button v-if="mode === 'flashcards' && review.cards.length > 1 && router.hasRoute('surprise-boss')" class="practice-link" :disabled="practiceBusy || arenaState.active" @click="startBossPractice(snapshot())">Optional Boss Practice</button>
                <span v-if="buddyLoading">Looking for your buddy…</span>
                <span v-else-if="buddyError" role="alert">{{ studyErrorMessage(buddyError, 'Your buddy') }}</span>
                <span v-else-if="buddy">Level {{ buddy.level }} · {{ buddy.xp }} XP</span>
                <span v-else>Companion preview</span>
                <p v-if="!savedInBrowser" role="status">Progress can only be kept for this visit because browser storage is unavailable.</p>
              </footer>
            </template>
          </StudyFlashcards>
          <section v-else class="lab-stage selection-blur" aria-hidden="true"><TownBackground scene="lab" paused /></section>
        </KeepAlive>
        <section v-if="!enteredLab && !loading && !error && profile?.school_level_id" ref="topicSelection" class="arena-picker" :class="{ 'study-topic-selection': selectingTopic }" aria-labelledby="picker-title">
          <div class="picker-shell">
            <span class="picker-eyebrow">STUDYDEX · POKÉ LAB</span>
            <h2 id="picker-title" tabindex="-1">{{ selectingTopic ? 'Revise Another Topic' : pickerSubject ? 'Choose your topic' : 'What will you master today?' }}</h2>
            <p class="picker-intro">{{ pickerSubject ? pickerSubject.name + ' · ' + (profile.school_level?.name || 'Your school level') : 'Choose a subject to begin your study session.' }}</p>
            <p v-if="requestedTopic && !topic" role="status">This topic is unavailable. Choose a topic for your saved school level.</p>
            <button v-if="pickerSubject" class="picker-back" @click="pickerSubjectId = null">← All subjects</button>
            <div v-if="!pickerSubject" class="bubble-grid">
              <button v-for="item in visibleSubjects" :key="item.id" class="bubble-card" @click="selectPickerSubject(item.id)">
                <span class="bubble-symbol" aria-hidden="true">{{ /science/i.test(item.name) ? '⚗' : /math/i.test(item.name) ? '✦' : '✎' }}</span>
                <strong>{{ displayTitle(item.name) }}</strong><span>Explore topics →</span>
              </button>
            </div>
            <template v-else>
              <div class="science-filters"><strong class="science-level-label">{{ profile.school_level?.name }}</strong><p>Showing study topics for your saved school level. Choose a topic to practise.</p></div>
              <div class="bubble-grid topic-grid study-topic-list">
                <div v-for="item in pickerTopics" :key="item.id" class="topic-choice">
                  <button class="bubble-card" :disabled="pickerBusy || (selectingTopic && !topicContentPending(item) && !topicHasContent(item) && !topicContentFailed(item))" @click="selectLabTopic(item)"><span class="bubble-symbol" aria-hidden="true">✦</span><strong>{{ displayTitle(item.name) }}</strong><span>Study topic →</span></button>
                  <span v-if="selectingTopic">{{ topicContentLabel(item) }}</span>
                  <div v-if="topicContentFailed(item)" role="alert"><p>{{ studyErrorMessage(resources[item.id]?.lesson.error || resources[item.id]?.lesson.data?.errors.concepts || resources[item.id]?.flashcards.error, 'Topic content') }}</p><button class="glass-action" @click="retryTopicContent(item)">Try again</button></div>
                </div>
              </div>
            </template>
            <p v-if="!visibleSubjects.length">No subjects are visible to your account. Content or read access may not have been enabled yet.</p>
            <p v-else-if="pickerSubject && !pickerTopics.length">There are no available {{ pickerSubject.name }} topics for {{ profile.school_level?.name }} yet.</p>
            <p v-if="selectingTopic && !otherTopics.length">No other topics are available at your school level yet.</p>
            <p v-else-if="selectingTopic && noOtherPopulatedTopics">No other populated topics are available yet.</p>
            <p v-if="pickerError" role="alert">{{ pickerError }}</p>
            <p class="picker-footnote">Study at your own pace. Take a break after your focus session.</p>
          </div>
        </section>
      </div>
    </main>
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
.buddy-sprite .is-artwork :deep(img) { image-rendering: auto; }
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
  .console-status { font-size: 13px; }
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
.poke-lab-page .picker-shell h2 { margin: 16px 0 12px; color: white; font-size: clamp(28px, 4vw, 48px); font-weight: 800; text-shadow: 0 3px 18px #0007; }
.poke-lab-page .picker-intro { margin-bottom: 28px; color: #fff6e3; font-size: 17px; }
.poke-lab-page .bubble-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 22px; }
.poke-lab-page .bubble-card { position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 14px; width: 100%; min-height: 190px; padding: 26px 20px; border: 1px solid #ffffff9e; border-radius: 32px; background: linear-gradient(145deg, #ffffff38, #ffffff12); box-shadow: inset 0 1px 0 #ffffffb3, inset 0 -1px 0 #ffffff26, 0 12px 30px #071b3544; backdrop-filter: blur(18px); color: white; font: inherit; cursor: pointer; transition: transform .18s, *background* .18s, box-shadow .18s; }
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

.home-link {
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

button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid #ffdc55;
  outline-offset: 4px;
}

@media (max-width: 600px) {

  .home-link {
    padding: 8px 10px;
  }
}

/* Full-page study room */
.study-page {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
}

.study-page > .poke-lab-page {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  isolation: isolate;
}

/* Floating navigation — no full-width background */
.study-header {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  left: 22px;
  right: 22px;
  z-index: 20;

  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;

  margin: 0;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
  backdrop-filter: none;

  /* Empty header space must not block the room controls. */
  pointer-events: none;
}

.study-header > .home-link,
.study-header > .study-clock {
  pointer-events: auto;
}

.study-header > .home-link {
  justify-self: start;
}

/* Back to Town stays top left; Topics stays top right. */
.study-header > .change-topic {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
}

/* ClockWeather keeps its own component styling. */
.study-clock {
  grid-column: 1 / -1;
  grid-row: 2;
  justify-self: start;
  min-width: 0;
  max-width: 100%;
}

/* Room occupies the entire page, including behind the clock. */
.study-content {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  container-type: size;
}

/* Remove the blurred border/background introduced previously. */
.study-content::before {
  content: none;
}

/*
 * Scale the artwork and its interactive overlays together.
 * Cover the viewport without stretching the room image.
 */
.study-content .lab-stage {
  position: absolute;
  top: 50%;
  left: 50%;

  width: max(100cqw, calc(100cqh * 1672 / 941));
  height: auto;
  aspect-ratio: 1672 / 941;
  max-width: none;

  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  transform: translate(-50%, -50%);
}

/* Topic selection remains above the room but below the header. */
.study-content .arena-picker {
  position: absolute;
  inset: 220px 0 0;
  overflow-y: auto;
  padding-bottom: 24px;
  /* Keep scrolling cards separate from the blurred, static room surface. */
  contain: layout paint;
  transform: translateZ(0);
  overscroll-behavior-y: contain;
}

/* Keep feedback readable without a full-width dark strip. */
.study-content .lab-footer {
  position: absolute;
  bottom: 12px;
  right: 16px;
  left: 16px;
  z-index: 5;

  width: auto;
  max-width: none;
  margin: 0;
  padding: 0;

  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;

  background: transparent;
  color: #eef7ff;
  text-shadow: 0 1px 4px rgb(0 0 0 / 70%);
}

.study-content .lab-footer p {
  margin: 0;
}

/* Ensure global text styles do not make flashcards dark blue. */
.poke-lab-page .answer-copy,
.poke-lab-page .screen-message,
.poke-lab-page .screen-message h2 {
  color: #eef7ff;
}

/* Small screens retain readable, scrollable study controls. */
@media (max-width: 1000px) {
  .study-header {
    left: 12px;
    right: 12px;
  }

  .poke-lab-page:not(.is-selecting) .study-content {
    overflow-y: auto;
    container-type: inline-size;
  }

  .poke-lab-page:not(.is-selecting) .lab-stage {
    position: relative;
    top: auto;
    left: auto;
    width: 100%;
    height: auto;
    aspect-ratio: auto;

    /* Reserve the artwork area above the stacked controls. */
    padding-top: max(56.28%, 240px);
    transform: none;
  }

  .poke-lab-page:not(.is-selecting) .lab-footer {
    position: relative;
    inset: auto;
    padding: 12px;
  }
}

/* Make StudyView flush with the browser viewport. */
.study-page {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  max-width: none;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  overflow: hidden;
  background: #101d30;
  box-sizing: border-box;
}

.study-page > .poke-lab-page {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  max-width: none;

  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;

  background-image: none;
  box-shadow: none;
  overflow: hidden;
  box-sizing: border-box;
}

.study-content {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background-image: none;
}

/* Remove the extra decorative backdrop. */
.study-page::before,
.study-page::after,
.study-page > .poke-lab-page::before,
.study-page > .poke-lab-page::after,
.study-content::before,
.study-content::after {
  content: none;
  display: none;
}

/* Embed the shared buddy in the lab chamber without its standalone card layout. */
.lab-pokemon-buddy {
  width: 100%; height: 100%; padding: 0; gap: 0;
  min-width: 0; min-height: 0; position: relative;
}
.lab-pokemon-buddy :deep(.buddy-image-container) {
  width: 100%; height: 100%; min-height: 0; align-items: flex-end;
}
/* Keep status text accessible without covering the chamber's artwork. */
.lab-pokemon-buddy :deep(h2),
.lab-pokemon-buddy :deep(h3),
.lab-pokemon-buddy :deep(.buddy-level),
.lab-pokemon-buddy :deep(.buddy-status),
.lab-pokemon-buddy :deep(.buddy-message),
.lab-pokemon-buddy :deep(.buddy-error),
.lab-pokemon-buddy :deep(.buddy-xp) {
  position: absolute; width: 1px; height: 1px; padding: 0;
  margin: -1px; overflow: hidden; clip-path: inset(50%);
  white-space: nowrap; border: 0;
}

/* Functional additions stay inside the reference room's existing screens. */
.lab-mode-toggle { display: flex; gap: .45cqw; margin: 0; padding: 0; border: 0; }
.lab-console .study-topic-progress { margin: 0; padding: 0; border: 0; }
.lab-navigation .lab-mode-toggle button { flex: 1; min-width: 0; width: auto; padding-inline: .2cqw; }
.answer-screen.main-study { background: transparent; border: 0; border-radius: 0; box-shadow: none; }
.answer-screen :deep(.study-learn), .answer-screen :deep(.study-learn :is(h2,h3,p,li)) { color: #eef7ff; }
.answer-screen :deep(.study-roadmap) { margin-block: 12px; padding-top: 8px; border-color: #589ac5; }
.answer-screen :deep(.study-roadmap-list) { grid-template-columns: 1fr; }
.answer-screen :deep(.study-roadmap button), .answer-screen :deep(.study-roadmap-names button) { background: #203959; color: #eef7ff; border-color: #5b799e; }
.answer-screen :deep(.study-example), .answer-screen :deep(.study-completion), .answer-screen :deep(.study-message) { background: #203959; padding: 12px; }
.answer-screen :deep(.study-interactive), .answer-screen :deep(.study-interactive :is(h3,p)) { color: #17324d; }
.answer-screen :deep(.study-learn .study-button) { color: #f4f9ff !important; border: 1px solid #5b799e; border-radius: 9px; background: #203959; }
.answer-screen :deep(.study-interactive .study-button) { color: #17324d !important; background: #f1f5fb; }
.answer-screen :deep(.study-interactive [data-state="on"]) { background: #ffd841; }
.answer-screen .study-card-front, .answer-screen .study-card-back { display: block; min-height: 0; padding: 0; border: 0; background: transparent; transform: none; backface-visibility: visible; }
.answer-screen .study-flip-card { display: inline-flex; width: auto; margin: .7cqw auto 0; min-height: 0; border: 1px solid #5b799e; border-radius: 9px; background: #203959; color: #f4f9ff; }
.poke-lab-page .practice-link { min-height: 44px; padding: 4px 8px; border: 0; background: transparent; color: white; font-size: 12px; text-decoration: underline; }
.lab-state { position: relative; z-index: 8; margin-top: 220px; }
@media (max-width: 1000px) {
 .lab-navigation { flex-direction: column; }
 .lab-mode-toggle { gap: 8px; }
 .focus-actions { width: 100%; gap: 8px; }
 .poke-lab-page .focus-actions button:first-child { flex: 1; min-width: 0; }
 .poke-lab-page .focus-actions button:last-child { flex: 0 0 auto; white-space: nowrap; padding-inline: 12px; }
 .answer-screen .study-flip-card { min-height: 44px; }
 .answer-screen.main-study { background: #142e53; border: 2px solid #39bdff; border-radius: 14px; }
}

</style>

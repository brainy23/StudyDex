<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { isNavigationFailure, NavigationFailureType, RouterLink, useRoute, useRouter } from 'vue-router'
import ArenaAssessment from '../components/study/StudyQuiz.vue'
import TownBackground from '../components/common/TownBackground.vue'
import ClockWeather from '../components/common/ClockWeather.vue'
import Pokemon_Backwards from '../components/pokebuddy/Pokemon_Backwards.vue'
import { useTimeOfDay } from '../composables/useTimeOfDay'
import { getCurrentProfile } from '../services/profileService'
import { getStudyCatalogue, getStudyQuestions, studyErrorMessage } from '../services/studyService'
import { useTopicCompletion } from '../composables/useTopicCompletion'
import { useArenaTransition } from '../composables/useArenaTransition'
import { displayTitle } from '../utils/displayText'
import { lessonReviewLocation, requestedTopicId } from '../utils/studyNavigation'
import '../assets/study.css'

const route = useRoute()
const router = useRouter()
const arenaTransition = useArenaTransition()
const topicCompletion = useTopicCompletion()
const { savedInBrowser } = topicCompletion
const profile = ref(null)
const catalogue = ref({ subjects: [], topics: [] })
const loading = ref(true)
const error = ref(null)
const resources = reactive({})
let alive = true
let generation = 0

const purpose = computed(() => route.query.battle === 'boss' ? 'boss_battle' : 'quiz')
const requestedTopic = computed(() => requestedTopicId(route.query))
const subject = computed(() => {
  const subjects = catalogue.value.subjects
  if (route.query.subject) return subjects.find((item) => item.id === route.query.subject) || null
  const requested = catalogue.value.topics.find((item) => item.id === requestedTopic.value)
  const firstSubject = requested?.subject_id || catalogue.value.topics[0]?.subject_id
  return subjects.find((item) => item.id === firstSubject) || subjects[0] || null
})
const availableTopics = computed(() => catalogue.value.topics.filter((item) => item.subject_id === subject.value?.id))
const topic = computed(() => requestedTopic.value
  ? availableTopics.value.find((item) => item.id === requestedTopic.value) || null
  : availableTopics.value[0] || null)
const resourceKey = computed(() => `${topic.value?.id}:${purpose.value}`)
const activeResource = computed(() => resources[resourceKey.value])
const coveredTopics = computed(() => availableTopics.value.filter((item) => topicCompletion.isComplete(item.id)))
const revisionLocation = computed(() => ({
  name: 'study-decks',
  query: {
    ...(subject.value ? { subject: subject.value.id } : {}),
    ...(topic.value ? { topic_id: topic.value.id } : {}),
    mode: 'flashcards',
  },
}))

async function initialise() {
  const request = ++generation
  loading.value = true
  error.value = null
  profile.value = null
  topicCompletion.bindStudent(null, null)
  catalogue.value = { subjects: [], topics: [] }
  Object.keys(resources).forEach((key) => delete resources[key])
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

async function loadAssessment(topicId, nextPurpose, retry = false) {
  if (!topicId) return
  const key = `${topicId}:${nextPurpose}`
  if (resources[key]?.loading || (resources[key] && !retry)) return
  resources[key] ||= { loading: false, data: null, error: null }
  const target = resources[key]
  target.loading = true
  target.error = null
  try {
    const data = await getStudyQuestions(topicId, nextPurpose)
    if (alive && resources[key] === target) target.data = data
  } catch (cause) {
    if (alive && resources[key] === target) target.error = cause
  } finally {
    if (alive && resources[key] === target) target.loading = false
  }
}

function assessmentQuery(subjectId, topicId) {
  return {
    subject: subjectId,
    ...(topicId ? { topic_id: topicId } : {}),
    ...(purpose.value === 'boss_battle' ? { battle: 'boss' } : {}),
  }
}
function chooseTopic(selected) {
  return router.push({ name: 'quiz', query: assessmentQuery(selected.subject_id, selected.id) })
}
function setAssessmentMode(nextMode) {
  if (nextMode === 'study') {
    router.push(lessonReviewLocation(topic.value))
    return
  }
  if (nextMode === 'learn') {
    router.push(revisionLocation.value)
    return
  }
  if (!['quiz', 'boss_battle'].includes(nextMode)) return
  const query = { ...route.query }
  if (nextMode === 'boss_battle') query.battle = 'boss'
  else delete query.battle
  router.push({ name: 'quiz', query })
}
function retryAssessment() {
  loadAssessment(topic.value?.id, purpose.value, true)
}

watch(() => [topic.value?.id, purpose.value], ([id, nextPurpose]) => {
  loadAssessment(id, nextPurpose)
})
watch(
  () => [loading.value, activeResource.value?.loading, arenaTransition.state.arrivalPath, route.fullPath],
  () => {
    if (!loading.value && !activeResource.value?.loading) arenaTransition.focusArrival(route.fullPath)
  },
  { flush: 'post' },
)
onMounted(initialise)
onUnmounted(() => {
  arenaTransition.clearArrival()
  alive = false
  generation++
})
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

// Preview time drives the shared background.
const { hour, lighting } = useTimeOfDay({ live, previewHour })
const rainActive = ref(false)
// Availability follows the integration branch; visual time previews do not gate access.
const displayTime = computed(() => {
  const minutes = Math.floor(hour.value * 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})
// Keep the original sky colour in the margins around the proportional artwork.
const skyStyle = computed(() => ({
  background: `linear-gradient(to bottom, ${lighting.value.top} 0%, ${lighting.value.horizon} 30%)`
}))


const enteredArena = ref(Boolean(requestedTopicId(route.query)))
const pickerSubjectId = ref(route.query.subject || null)
const pickerBusy = ref(false)
const pickerError = ref('')
const pickerSubject = computed(() => catalogue.value.subjects.find(item => item.id === pickerSubjectId.value))
const pickerTopics = computed(() => catalogue.value.topics.filter(item => item.subject_id === pickerSubjectId.value))
async function selectPickerSubject(id) {
  pickerSubjectId.value = id
  await router.push({ name: 'quiz', query: assessmentQuery(id) })
}
async function enterTopic(item) {
  if (pickerBusy.value) return
  pickerBusy.value = true
  pickerError.value = ''
  try {
    const failure = await chooseTopic(item)
    if (failure && !isNavigationFailure(failure, NavigationFailureType.duplicated)) throw new Error('Navigation cancelled')
    enteredArena.value = true
  } catch { pickerError.value = 'Could not open this topic. Please try again.' }
  finally { pickerBusy.value = false }
}
function returnToSelection() { enteredArena.value = false; pickerSubjectId.value = subject.value?.id || null }
watch(() => [loading.value, topic.value?.id], ([pending, id]) => {
  if (pending) return
  if (!id) enteredArena.value = false
  else if (requestedTopic.value) enteredArena.value = true
})
const spriteError = ref('')
const fighters = ref([])
let spriteController
function readArenaBuddy() {
  try {
    const saved = JSON.parse(localStorage.getItem('studydex-active-buddy'))
    const id = Number(saved?.pokeapi_id ?? saved?.id)
    if (Number.isInteger(id) && id > 0) return { id, name: saved.name }
  } catch { /* Use a preview buddy when none has been saved. */ }
  return { id: 25, name: 'Pikachu' }
}

async function loadArenaFighters() {
  spriteController?.abort()
  const controller = new AbortController()
  spriteController = controller
  spriteError.value = ''
  const selected = readArenaBuddy()
  // The back-sprite component accepts a name or a numeric PokéAPI ID as text.
  // Use the ID to avoid sending a trainer's custom nickname to PokéAPI.
  fighters.value = [{
    name: selected.name || 'Your buddy',
    pokename: String(selected.id)
  }]
  // Grounded, fully evolved mentors: Venusaur, Blastoise, Raichu,
  // Nidoqueen, Nidoking, Alakazam, Machamp, Meganium, Typhlosion,
  // Feraligatr, Sceptile, Blaziken and Swampert.
  const pool = [3, 9, 26, 31, 34, 65, 68, 154, 157, 160, 254, 257, 260]
    .filter(id => id !== selected.id)
  const enemyId = pool[Math.floor(Math.random() * pool.length)]
  try {
    // Only the opponent's front sprite is fetched by the parent.
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${enemyId}/`, {
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`Pokémon request failed: ${response.status}`)
    const pokemon = await response.json()
    if (controller.signal.aborted) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const still = pokemon.sprites?.front_default
    const animated = pokemon.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default
    fighters.value.push({
      name: pokemon.name,
      image: (!reduceMotion && animated) || still,
      still, failed: false, padding: 0
    })
  } catch (cause) {
    if (cause.name !== 'AbortError') spriteError.value = 'The opponent could not load.'
  }
}
function arenaSpriteError(fighter) {
  if (fighter.still && fighter.image !== fighter.still) {
    fighter.image = fighter.still
    fighter.padding = 0
  } else fighter.failed = true
}
// Align the visible feet, rather than the transparent image edge, to the floor.
function groundArenaSprite(event, fighter) {
  try {
    const img = event.target
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx || !canvas.width || !canvas.height) return
    ctx.drawImage(img, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    for (let y = canvas.height - 1; y >= 0; y--) {
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 32) {
          fighter.padding = (canvas.height - 1 - y) / canvas.height * 100
          return
        }
      }
    }
  } catch { fighter.padding = 0 }
}

onMounted(loadArenaFighters)
onUnmounted(() => spriteController?.abort())



</script>

<template>
  <div class="arena-with-preview designed-arena">
    <main class="arena-page" :style="skyStyle">
      <KeepAlive>
        <ArenaAssessment v-if="topic && activeResource" :key="resourceKey" :resource="activeResource" :purpose="purpose" @mode="setAssessmentMode" @retry="retryAssessment">
          <template #battle="{ assessment, select, previous, next, preview, review }">
            <h2 class="visually-hidden">{{ assessment.title }}</h2>
            <div class="arena-scene" :class="{ 'selection-blur': !enteredArena }" :inert="!enteredArena" :aria-hidden="!enteredArena">
              <TownBackground class="arena-background-layer" :scene="purpose === 'boss_battle' ? 'boss' : 'arena'" :live="live" :preview-hour="previewHour" :rain-active="rainActive" />
              <section v-if="enteredArena" class="quiz-content demo-board main-study" aria-label="Assessment content">
                <div class="demo-caption"><span class="study-eyebrow">{{ displayTitle(subject?.name) }} · {{ displayTitle(topic.name) }}</span><span>{{ assessment.reviewing ? 'Your choices' : assessment.previewing ? `${assessment.index + 1} / ${assessment.questions.length}` : assessment.title }}</span></div>
                <p v-if="activeResource.loading" role="status">Loading questions…</p>
                <div v-else-if="activeResource.error" role="alert"><p>{{ studyErrorMessage(activeResource.error, assessment.title) }}</p><button class="battle-next" @click="retryAssessment">Try again</button></div>
                <div v-else-if="!assessment.questions.length" class="study-empty"><h2>{{ assessment.title }}</h2><p>{{ purpose === 'quiz' ? 'There are no regular quiz questions for this topic yet.' : 'There is no Boss Battle for this topic yet.' }}</p><p>Keep practising in Poké Lab and check back when this assessment is ready.</p></div>
                <template v-else-if="assessment.reviewing">
                  <h2>Your answer choices</h2>
                  <ol class="study-answer-summary"><li v-for="question in assessment.questions" :key="question.id"><strong>{{ question.question_text }}</strong><p>{{ question.options.find(option => option.id === assessment.answers[question.id])?.option_text || 'No answer chosen' }}</p></li></ol>
                </template>
                <template v-else-if="assessment.previewing && assessment.current"><h2 id="arena-question">{{ assessment.current.question_text }}</h2><p v-if="!assessment.current.options.length">Answer options are not available for this question yet.</p></template>
                <template v-else><h2>{{ assessment.title }}</h2><p>{{ assessment.questions.length }} questions available to preview.</p></template>
              </section>
              <section v-if="enteredArena" class="battle-dock" aria-label="Battle answer controls">
                <div class="battle-dialogue" aria-live="polite">
                  <span class="dialogue-kicker">{{ assessment.reviewing ? 'YOUR CHOICES' : 'QUESTION PREVIEW' }}</span>
                  <template v-if="assessment.reviewing"><p>They have not been submitted or graded.</p><small>Your answers are not graded or saved. Choices are kept for this visit only.</small></template>
                  <template v-else-if="assessment.previewing && assessment.current && !activeResource.loading && !activeResource.error">
                    <p v-if="assessment.answers[assessment.current.id]">Choice noted for this visit. This answer has not been graded.</p>
                    <p v-else>What will <strong>{{ fighters[0]?.name || 'your buddy' }}</strong> choose?</p>
                    <button class="battle-next" :disabled="assessment.index === 0" @click="previous">Previous</button>
                    <button class="battle-next" :disabled="assessment.index === assessment.questions.length - 1 ? !assessment.allChosen : !assessment.answers[assessment.current.id]" @click="next">{{ assessment.index === assessment.questions.length - 1 ? 'Review my choices' : 'Next question' }}</button>
                    <small>Your answers are not graded or saved.</small>
                  </template>
                  <template v-else><p>Secure grading is not available yet.</p><small>You can preview questions, but answers are not graded or saved. Scores and rewards are not available yet.</small></template>
                  <small class="arena-reading-progress">{{ profile?.school_level?.name }} · {{ coveredTopics.length }} of {{ availableTopics.length }} topics read</small>
                </div>
                <fieldset v-if="assessment.previewing && !assessment.reviewing && assessment.current && !activeResource.loading && !activeResource.error" class="demo-answers study-question">
                  <legend class="visually-hidden">{{ assessment.current.question_text }}</legend>
                  <label v-for="(option, index) in assessment.current.options" :key="option.id" :class="['battle-option', 'demo-answer-' + index, { 'is-selected': assessment.answers[assessment.current.id] === option.id }]">
                    <input class="visually-hidden" type="radio" :name="'question-' + assessment.current.id" :value="option.id" :checked="assessment.answers[assessment.current.id] === option.id" @change="select(option.id)" />
                    <b class="choice-letter">{{ ['A','B','C','D'][index] }}</b><span class="choice-text">{{ option.option_text }}</span>
                  </label>
                </fieldset>
                <div v-else class="battle-end-actions">
                  <template v-if="assessment.reviewing"><button @click="review">Review questions</button><button @click="returnToSelection">Choose topic</button></template>
                  <template v-else>
                    <button disabled>{{ purpose === 'quiz' ? 'Start Quiz' : 'Start Boss Battle' }}</button>
                    <button v-if="assessment.questions.length && !activeResource.loading && !activeResource.error" @click="preview">Preview Questions</button>
                    <button @click="setAssessmentMode('study')">Review Entire Topic</button>
                    <button v-if="purpose === 'quiz'" @click="setAssessmentMode('boss_battle')">View Boss Battle</button>
                    <button v-else @click="setAssessmentMode('learn')">Revise in Poké Lab</button>
                  </template>
                </div>
              </section>
              <div v-for="(fighter, index) in fighters" :key="index" class="arena-fighter" :class="index === 0 ? 'player-fighter' : 'opponent-fighter'">
                <div class="fighter-shadow"></div>
                <Pokemon_Backwards v-if="index === 0" :key="fighter.pokename" class="player-back-sprite" :pokename="fighter.pokename" />
                <img v-else-if="fighter.image && !fighter.failed" :key="fighter.image" :src="fighter.image" :alt="fighter.name + ', front view'" crossorigin="anonymous" :style="{ transform: `translateY(${fighter.padding}%)` }" @load="groundArenaSprite($event, fighter)" @error="arenaSpriteError(fighter)" />
                <span v-else class="fighter-unavailable">Sprite unavailable</span>
              </div>
              <p v-if="spriteError && enteredArena" class="sprite-status">{{ spriteError }} <button @click="loadArenaFighters">Retry</button></p>
            </div>
          </template>
        </ArenaAssessment>
        <div v-else class="arena-scene selection-blur" aria-hidden="true"><TownBackground class="arena-background-layer" scene="arena" :live="live" :preview-hour="previewHour" /></div>
      </KeepAlive>
      <header class="arena-hud">
        <RouterLink to="/home" class="home-link">‹ Back to town</RouterLink>
        <button v-if="enteredArena" class="home-link change-topic" @click="returnToSelection">Topics</button>
        <div class="arena-clock-widget"><ClockWeather :use-device-location="true" @rain-change="rainActive = $event" /></div>
        <div class="arena-type-switch" aria-label="Question set"><button class="home-link" :aria-pressed="purpose === 'quiz'" @click="setAssessmentMode('quiz')">Topic Quiz</button><button class="home-link" :aria-pressed="purpose === 'boss_battle'" @click="setAssessmentMode('boss_battle')">Boss Battle</button></div>
        <h1 class="visually-hidden">Poké Arena</h1>
        <RouterLink v-if="enteredArena" :to="revisionLocation" class="home-link revise-lab">Revise in Poké Lab</RouterLink>
      </header>
      <section v-if="!enteredArena || loading || error || !profile?.school_level_id" class="arena-picker" aria-labelledby="picker-title">
        <div class="picker-shell">
          <span class="picker-eyebrow">STUDYDEX · POKÉ ARENA</span>
          <h2 id="picker-title">{{ pickerSubject ? 'Choose your topic' : 'What will you master today?' }}</h2>
          <p class="picker-intro">{{ pickerSubject ? pickerSubject.name + ' · ' + (profile?.school_level?.name || 'Your school level') : 'Choose a subject to begin your quiz battle.' }}</p>
          <p v-if="loading" role="status">Loading your subjects…</p>
          <div v-else-if="error" role="alert"><h2>We could not open Poké Arena</h2><p>{{ studyErrorMessage(error, 'Your Arena content') }}</p><button class="glass-action" @click="initialise">Try again</button></div>
          <div v-else-if="!profile?.school_level_id"><h2>Set your school level first</h2><RouterLink to="/account" class="glass-action">Open Account Settings</RouterLink></div>
          <template v-else>
            <p class="science-level-label study-level">{{ displayTitle(profile.school_level?.name || 'School level not set') }}</p>
            <p v-if="requestedTopic && !topic">This topic is unavailable. Choose an available topic for your school level.</p>
            <button v-if="pickerSubject" class="picker-back" @click="pickerSubjectId = null">← All subjects</button>
            <div v-if="!pickerSubject" class="bubble-grid"><button v-for="item in catalogue.subjects" :key="item.id" class="bubble-card" @click="selectPickerSubject(item.id)"><span class="bubble-symbol" aria-hidden="true">{{ /science/i.test(item.name) ? '⚗' : /math/i.test(item.name) ? '✦' : '✎' }}</span><strong>{{ displayTitle(item.name) }}</strong><span>Explore topics →</span></button></div>
            <template v-else>
              <div class="science-filters"><p>{{ coveredTopics.length }} of {{ availableTopics.length }} topics read in this subject. Learning progress does not limit your quiz selection.</p></div>
              <div class="bubble-grid topic-grid study-topic-list"><div v-for="item in pickerTopics" :key="item.id" class="topic-choice"><button class="bubble-card" :disabled="pickerBusy" @click="enterTopic(item)"><span class="bubble-symbol" aria-hidden="true">✦</span><strong>{{ displayTitle(item.name) }}</strong><span>Preview questions →</span></button></div></div>
            </template>
            <p v-if="!catalogue.subjects.length">No subjects are visible to your account.</p>
            <p v-else-if="pickerSubject && !pickerTopics.length">No assessment topics are available for this subject at your level yet.</p>
            <p v-if="pickerError" role="alert">{{ pickerError }}</p>
            <p v-if="!savedInBrowser" role="status">Topics read will stay for this visit because browser storage is unavailable.</p>
            <p class="picker-footnote">Question previews only. Secure grading and rewards are not connected yet.</p>
          </template>
        </div>
      </section>
    </main>
    <footer class="time-preview-bar" aria-label="Time preview controls">
      <div class="time-bar-inner">
        <strong class="time-bar-title">Time preview <span>{{ displayTime }}</span></strong>
        <button :aria-pressed="live" @click="useLiveTime">Live</button>
        <button v-for="preset in [{ label: '7am', hour: 7 }, { label: 'Day', hour: 12 }, { label: 'Sunset', hour: 18.5 }, { label: 'Night', hour: 21 }, { label: 'Midnight', hour: 0 }]" :key="preset.label" :aria-pressed="!live && !autoPreview && Math.abs(previewHour - preset.hour) < .001" @click="setPreview(preset.hour)">{{ preset.label }}</button>
        <button :aria-pressed="autoPreview" @click="toggleAutoPreview">{{ autoPreview ? 'Pause cycle' : '▶ Cycle day' }}</button>
        <label class="time-bar-slider"><span>Time</span><input type="range" min="0" max="1439" step="1" :value="Math.floor(hour * 60)" :aria-valuetext="displayTime" @input="setPreview(Number($event.target.value) / 60)" /></label>
        <span class="time-bar-status">{{ live ? 'Live clock' : autoPreview ? '24 hours in 60 seconds' : 'Preview paused' }}</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>

.arena-page {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: system-ui, sans-serif;
}

.arena-page * {
  box-sizing: border-box;
}

.arena-scene {
  position: relative;
  width: min(100vw, calc(100dvh * 1672 / 941));
  aspect-ratio: 1672 / 941;
  overflow: hidden;
  isolation: isolate;
  container-type: inline-size;
}

/* FUTURE QUIZ CONTENT */

.quiz-content {
  position: absolute;
  z-index: 6;
  left: 29%;
  top: 26%;
  width: 42%;
  height: 27%;
  padding: 12px;
  overflow: auto;
  color: white;
}


/* CLOCK AND NAVIGATION */

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
  .arena-hud { top: 10px; left: 10px; right: 10px; }
  .home-link { padding: 8px 10px; }
}

/* ENTRY PICKER */
.arena-scene { transition: filter .35s ease; }
.arena-scene.selection-blur { filter: blur(9px) brightness(.64); pointer-events: none; }
.arena-picker { position: absolute; z-index: 8; inset: 90px 0 0; overflow-y: auto; padding: 28px 24px 130px; color: white; text-align: center; }
.picker-shell { width: min(940px, 100%); margin: auto; padding: 28px 0; }
.picker-eyebrow { color: #ffe9ae; font-size: 12px; font-weight: 800; letter-spacing: .2em; }
.picker-shell h2 { margin: 16px 0 12px; color: white; font-size: clamp(28px, 4vw, 48px); font-weight: 800; text-shadow: 0 3px 18px #0007; }
.picker-intro { margin-bottom: 28px; color: #fff6e3; font-size: 17px; }
.bubble-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 22px; }
.bubble-card { position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 14px; width: 100%; min-height: 190px; padding: 26px 20px; border: 1px solid #ffffff9e; border-radius: 32px; background: linear-gradient(145deg, #ffffff38, #ffffff12); box-shadow: inset 0 1px 0 #ffffffb3, inset 0 -1px 0 #ffffff26, 0 12px 30px #071b3544; backdrop-filter: blur(18px); color: white; font: inherit; cursor: pointer; transition: transform .18s; background: .18s, box-shadow .18s; }
.bubble-card strong { font-size: 22px; line-height: 1.3; overflow-wrap: anywhere; }
.bubble-card > span:last-child { font-size: 13px; color: #fff5df; }
.bubble-symbol { font-size: 36px; color: #ffe699; text-shadow: 0 0 18px #ffe4a455; }
.bubble-card:hover:not(:disabled) { transform: translateY(-5px); background: linear-gradient(145deg, #ffffff55, #ffffff22); box-shadow: 0 0 0 2px #ffe19a, 0 18px 38px #071b3555; }
.bubble-card:disabled { opacity: .65; cursor: not-allowed; }
.topic-choice { display: flex; flex-direction: column; gap: 12px; }
.topic-choice .bubble-card { flex: 1; }
.revise-link { color: #ffe6a1; font-weight: 700; font-size: 14px; }
.picker-back, .glass-action { display: inline-block; margin: 0 0 22px; padding: 12px 20px; border: 1px solid #ffffff88; border-radius: 20px; background: #ffffff22; color: white; text-decoration: none; font: inherit; cursor: pointer; }
.picker-footnote { margin: 28px 0 0; font-size: 12px; color: #e0e8f5; }
.picker-notice { padding: 12px; border: 1px solid #ffe19a77; border-radius: 12px; background: #203046b3; }
.change-topic { cursor: pointer; font: inherit; }
.quiz-content :deep(.study-panel), .quiz-content :deep(.study-empty), .quiz-content :deep(.study-message) { background: transparent; box-shadow: none; border: 0; color: #fff5dc; padding: 5px; }
.quiz-content :deep(h2), .quiz-content :deep(h3), .quiz-content :deep(p) { color: #fff5dc; }
.quiz-content :deep(h2) { font-size: clamp(17px, 1.6cqw, 26px); }
.arena-topic-caption { font-size: 12px; color: #ffdc81; margin: 0 0 8px; }
.sprite-status { position: absolute; z-index: 8; bottom: 2%; left: 35%; background: #17304d; color: white; padding: 8px; border-radius: 10px; }
.arena-picker button:focus-visible, .arena-picker a:focus-visible { outline: 3px solid #ffdf86; outline-offset: 4px; }
.arena-fighter { position: absolute; z-index: 7; height: 0; transform: translateX(-50%); }
.player-fighter { left: 32%; top: 77%; width: 11%; }
.opponent-fighter { left: 67%; top: 72%; width: 10.5%; }
.arena-fighter > img { position: absolute; bottom: 0; left: 0; width: 100%; height: auto; image-rendering: pixelated; filter: drop-shadow(0 3px 1px #1b253044); }
.fighter-shadow { position: absolute; top: -.3cqw; left: 23%; width: 54%; height: 1cqw; border-radius: 50%; background: #31221466; filter: blur(3px); }
.fighter-name { position: absolute; top: 1cqw; left: 50%; transform: translateX(-50%); border: 1px solid #e6bf60; border-radius: 20px; padding: 4px 12px; color: #fff4d0; background: #182c43e8; text-transform: capitalize; font-size: clamp(10px, .9cqw, 14px); white-space: nowrap; }
.fighter-unavailable { position: absolute; bottom: 10px; background: #172c43; padding: 8px; font-size: 11px; }

@media (max-width: 700px) {
  .arena-picker { padding: 12px 18px 180px; }
  .bubble-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .bubble-card { min-height: 160px; padding: 18px 10px; border-radius: 24px; }
  .bubble-card strong { font-size: 17px; }
  .arena-page:has(.arena-scene:not(.selection-blur)) { overflow-y: auto; display: block; padding-top: 75px; }
  .arena-scene:not(.selection-blur) { width: 100%; aspect-ratio: auto; padding-top: calc(100vw * 941 / 1672); overflow: visible; }
  .arena-scene:not(.selection-blur) > .arena-background-layer { height: calc(100vw * 941 / 1672); }
  .arena-scene:not(.selection-blur) .quiz-content { position: relative; left: auto; top: auto; width: calc(100% - 24px); height: auto; margin: 16px 12px 180px; padding: 18px; background: #1b3048; border: 3px solid #d4b369; border-radius: 16px; }
  .arena-scene:not(.selection-blur) .player-fighter { top: calc(100vw * 941 / 1672 * .77); }
  .arena-scene:not(.selection-blur) .opponent-fighter { top: calc(100vw * 941 / 1672 * .72); }
}
@media (prefers-reduced-motion: reduce) { .arena-scene, .bubble-card { transition: none; } }

.science-filters { display: grid; justify-items: center; gap: 14px; margin-bottom: 24px; }
.science-filters label { display: flex; gap: 10px; align-items: center; }
.science-filters p { margin: 0; max-width: 650px; font-size: 12px; line-height: 1.6; color: #e2ebf6; }
.science-theme { color: #ffe49b; text-transform: uppercase; font-size: 10px; letter-spacing: .12em; }
.science-detail { font-size: 11px; line-height: 1.5; color: #eff5ff; }
.science-level-label { padding: 10px 20px; border: 1px solid #ffe29b; border-radius: 20px; background: #ffe29b; color: #20334b; }
.science-filters select { padding: 10px 16px; border-radius: 16px; background: #21374e; color: white; font: inherit; }

/* CLASSIC BATTLE LAYOUT — no levels, HP or XP panels. */
.demo-board { display: flex; flex-direction: column; align-items: stretch; justify-content: center; text-align: center; padding: 1cqw 1.4cqw; }
.demo-caption { display: flex; justify-content: space-between; gap: 10px; color: #ffe6a2; font-size: clamp(9px, .8cqw, 13px); font-weight: 800; }
.demo-board h2 { margin: auto 0; padding: 12px 0; font-size: clamp(20px, 2cqw, 34px); line-height: 1.35; color: #fff8e7; }
.demo-board > p { color: #fff8e7; }
.battle-dock { position: absolute; z-index: 9; left: 2%; right: 2%; bottom: 1.5%; height: 19%; display: grid; grid-template-columns: 42% minmax(0, 1fr); gap: 12px; padding: 10px; border: 3px solid #344652; border-radius: 18px; background: #ede8d7; box-shadow: 0 5px 0 #192735, inset 0 0 0 2px #fff9dc; color: #263548; }
.battle-dialogue { min-width: 0; overflow-y: auto; padding: 12px 16px; border: 3px solid #d6b254; border-radius: 9px; background: #183047; box-shadow: inset 0 0 0 2px #080f1d; color: #fff5dc; }
.dialogue-kicker { color: #ffdc83; font-size: clamp(9px, .7cqw, 12px); font-weight: 900; letter-spacing: .1em; }
.battle-dialogue p { margin: 8px 0; font-size: clamp(15px, 1.4cqw, 23px); line-height: 1.3; }
.battle-dialogue strong { text-transform: capitalize; }
.battle-dialogue small { font-size: clamp(10px, .85cqw, 14px); color: #d7e5ec; }
.battle-dialogue .battle-explanation { font-size: clamp(12px, 1cqw, 17px); }
.demo-answers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 8px; min-height: 0; }
.demo-answers .battle-option { display: flex; align-items: center; gap: 8px; min-width: 0; min-height: 0; overflow-y: auto; padding: 8px 12px; border: 3px solid #fff4d2; outline: 2px solid #45515b; border-radius: 18px; color: white; font: inherit; font-size: clamp(11px, 1.1cqw, 18px); font-weight: 800; text-align: left; cursor: pointer; box-shadow: inset 0 -5px 0 #0002, inset 0 2px 0 #fff6; }
.choice-letter { display: grid; place-items: center; flex: 0 0 25px; height: 25px; border-radius: 50%; background: #0002; font-size: 12px; }
.choice-text { flex: 1; overflow-wrap: anywhere; }
.demo-answer-0 { background: #be4358; }.demo-answer-1 { background: #dfb94e; color: #26334a !important; }.demo-answer-2 { background: #488247; }.demo-answer-3 { background: #396d99; }
.demo-answers .battle-option:hover:not(:disabled) { filter: brightness(1.15); }
.demo-answers .battle-option:disabled { cursor: default; }
.demo-answers .correct { outline: 3px solid #ffe270; border-color: #ffe270; }
.demo-answers .wrong { border-style: dashed; }
.battle-next, .battle-end-actions button { padding: 8px 12px; border: 2px solid #b58d32; border-radius: 9px; background: #ffe08a; color: #26334a; font: inherit; font-weight: 800; cursor: pointer; }
.battle-next { font-size: 12px; }
.battle-end-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.battle-dock button:focus-visible { outline: 3px solid #fff; outline-offset: -6px; }
@media (max-width: 700px) {
  .arena-scene:not(.selection-blur) .quiz-content { margin-bottom: 12px; }
  .arena-scene:not(.selection-blur) .player-fighter { top: calc(100vw * 941 / 1672 * .77); }
  .arena-scene:not(.selection-blur) .opponent-fighter { top: calc(100vw * 941 / 1672 * .72); }
  .battle-dock { position: relative; left: auto; right: auto; bottom: auto; width: calc(100% - 24px); height: auto; margin: 12px 12px 180px; grid-template-columns: 1fr; }
  .battle-dialogue { max-height: 180px; }
  .demo-answers { grid-template-rows: auto; }
  .demo-answers .battle-option { min-height: 65px; font-size: 14px; overflow: visible; }
  .battle-dialogue p { font-size: 18px; }
  .battle-dialogue .battle-explanation { font-size: 14px; }
}
/* Recoil the wrapper so sprite foot-alignment remains intact. */
.player-fighter.is-hit { animation: player-recoil .65s ease-out .22s both; }
.opponent-fighter.is-hit { animation: opponent-recoil .65s ease-out .22s both; }
.arena-fighter.is-hit > img, .arena-fighter.is-hit .player-back-sprite :deep(img) { animation: damage-flash .65s ease-out .22s both; }
@keyframes player-recoil {
  0%,100% { transform: translateX(-50%); }
  20% { transform: translateX(-65%) rotate(-4deg); }
  40% { transform: translateX(-44%) rotate(2deg); }
  60% { transform: translateX(-56%) rotate(-2deg); }
  80% { transform: translateX(-48%); }
}
@keyframes opponent-recoil {
  0%,100% { transform: translateX(-50%); }
  20% { transform: translateX(-35%) rotate(4deg); }
  40% { transform: translateX(-56%) rotate(-2deg); }
  60% { transform: translateX(-44%) rotate(2deg); }
  80% { transform: translateX(-52%); }
}
@keyframes damage-flash {
  0%,100% { opacity: 1; filter: drop-shadow(0 3px 2px #0005); }
  20% { opacity: .65; filter: brightness(.65) sepia(1) saturate(10000%) hue-rotate(320deg) drop-shadow(0 0 8px #ff2020); }
  55% { opacity: .85; filter: brightness(.85) sepia(1) saturate(10000%) hue-rotate(320deg) drop-shadow(0 0 4px #ff2020); }
}
@media(prefers-reduced-motion: reduce) { .arena-fighter, .arena-fighter > img, .arena-fighter .player-back-sprite :deep(img) { animation: none !important; } }

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
.arena-hud button.home-link { border: 1px solid rgb(255 255 255 / 40%); border-radius: 14px; background: rgb(16 30 52 / 80%); padding: 10px 14px; color: white; }
.arena-hud button.home-link:hover { border-color: #ffdc77; color: #ffdc77; background: rgb(16 30 52 / 80%); }
.arena-picker { font-family: system-ui, sans-serif; }
@media(max-width:600px) { .arena-hud button.home-link { padding: 8px 10px; } }

/* Float the shared clock below Back to Town, with no navigation backdrop. */
.arena-hud { display: grid; grid-template-columns: minmax(0, 1fr) auto; background: transparent; }
.arena-hud .home-link { grid-column: 1; grid-row: 1; justify-self: start; }
.arena-hud .change-topic { grid-column: 2; grid-row: 1; margin: 0; justify-self: end; }
.arena-clock-widget { grid-column: 1; grid-row: 2; justify-self: start; pointer-events: auto; max-width: 100%; }
.arena-picker { top: 190px; }
@media (max-width: 700px) {
  .arena-page:has(.arena-scene:not(.selection-blur)) { padding-top: 190px; }
}
/* Keep the shared back sprite anchored at the original player's floor position. */
.player-back-sprite {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: auto;
  min-height: 0;
  color: white;
}
.player-back-sprite :deep(.pokemon-back-sprite) {
  width: 100%;
  height: auto;
  max-width: 100%;
  object-position: center bottom;
  image-rendering: pixelated;
  filter: drop-shadow(0 3px 1px #1b253044);
}
.player-back-sprite :deep(.sprite-status) {
  position: static;
  margin: 0;
  padding: 6px;
  font-size: 11px;
}

/* Safe database previews use the reference battle controls without grading colors. */
.designed-arena :deep(.study-quiz) { display: contents; }
.quiz-content.main-study { border: 0; border-radius: 0; background: transparent; box-shadow: none; }
.demo-caption .study-eyebrow { color: inherit; font-size: inherit; }
.demo-caption > span:last-child { flex-shrink: 0; white-space: nowrap; }
.demo-answers { border: 0; margin: 0; padding: 0; }
.battle-dialogue small { display: block; }
.battle-dialogue .battle-next { padding: 4px 8px; margin: 0 6px 4px 0; }
.demo-answers .battle-option.is-selected { outline: 3px solid #ffe270; border-color: #ffe270; }
.demo-answers .battle-option:has(input:focus-visible) { outline: 3px solid white; outline-offset: -6px; }
.arena-type-switch { grid-column: 2; grid-row: 2; display: flex; gap: 8px; pointer-events: auto; }
.arena-type-switch button { cursor: pointer; }
.arena-type-switch button[aria-pressed='true'] { border-color: #ffdc77; }
.arena-hud .revise-lab { grid-column: 2; grid-row: 3; justify-self: end; }
.picker-shell .study-level { display: inline-block; }
.battle-end-actions button:disabled, .battle-next:disabled { opacity: .5; cursor: not-allowed; }
.study-answer-summary { text-align: left; padding-left: 20px; }
@media (max-width: 700px) { .arena-type-switch { flex-wrap: wrap; max-width: 135px; justify-content: flex-end; } .arena-type-switch button.home-link { font-size: 11px; } }

</style>

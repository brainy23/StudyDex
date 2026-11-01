<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router'
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
import StudyTimerPanel from '../components/study/StudyTimerPanel.vue'
import StudyImage from '../components/study/StudyImage.vue'
import BackToHome from '../components/common/BackToHome.vue'
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
const modeComponent = computed(
  () => ({ learn: StudyLearn, flashcards: StudyFlashcards })[mode.value],
)
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

function chooseSubject(id) {
  const firstTopic = catalogue.value.topics.find((item) => item.subject_id === id)
  router.push({
    name: 'study-decks',
    query: { subject: id, ...(firstTopic ? { topic_id: firstTopic.id } : {}), mode: 'learn' },
  })
}

function chooseTopic(selected) {
  router.push({
    name: 'study-decks',
    query: {
      subject: selected.subject_id,
      topic_id: selected.id,
      mode: selectingTopic.value && resources[selected.id]?.flashcards.data?.length ? 'flashcards' : 'learn',
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
</script>

<template>
  <main class="study-page" :class="{ 'study-room-mode': mode === 'flashcards' }">
    <div class="study-layout study-screen">
      <header class="study-header study-panel">
        <div class="study-header-title">
          <BackToHome variant="text" class="study-town-link" />
          <h1>Poké Lab</h1>
          <p>Explore a little. Remember a little more.</p>
        </div>
        <!-- <div v-if="profile" class="study-header-context">
          <p class="study-level">{{ profile.school_level?.name || 'School level not set' }}</p>
          <p>
            {{ subject?.name || 'Choose a subject' }} <span v-if="topic">· {{ topic.name }}</span>
          </p>
          <a href="#study-topics">Choose subject or topic</a>
        </div> -->
        <div class="study-header-actions">
          <button class="study-button" :disabled="!topic || arenaState.active || practiceBusy" @click="goToArena">Go to Poké Arena</button>
          <p v-if="arenaState.error" class="study-note" role="alert">{{ arenaState.error }}</p>
          <p v-if="practiceError" class="study-note" role="alert">{{ practiceError }}</p>
          <p v-if="topic" class="study-note">
            Choose when you are ready to explore this topic's quiz.
          </p>
          <p v-if="!savedInBrowser" class="study-note" role="status">
            Browser storage is unavailable. Topic completion will stay for this app visit only.
          </p>
        </div>
      </header>

      <section v-if="loading" class="study-page-state study-panel study-loading" role="status">
        Loading your Poké Lab…
      </section>
      <section v-else-if="error" class="study-page-state study-panel" role="alert">
        <h2>We could not open your study content</h2>
        <p>{{ studyErrorMessage(error, 'Your study content') }}</p>
        <button class="study-button" @click="initialise">Try again</button>
      </section>
      <section v-else-if="!profile?.school_level_id" class="study-page-state study-panel">
        <h2>Set your school level first</h2>
        <p>Add your Primary level in Account Settings so we can show you the right topics.</p>
        <RouterLink to="/account" class="study-button">Open Account Settings</RouterLink>
      </section>
      <template v-else>
        <aside class="study-buddy study-panel" aria-labelledby="study-buddy-heading">
          <div class="study-buddy-art">
            <StudyImage
              v-if="buddy?.pokemon?.sprite_url"
              :path="buddy.pokemon.sprite_url"
              :alt="buddy.pokemon.name"
            />
            <img v-else src="/assets/quiz_buddy.png" alt="" />
          </div>
          <div>
            <p class="study-eyebrow">Your study companion</p>
            <h2 id="study-buddy-heading">{{ displayTitle(buddy?.pokemon?.name || 'Pokémon Buddy') }}</h2>
            <p v-if="buddyLoading" class="study-note" role="status">Looking for your buddy…</p>
            <p v-else-if="buddyError" class="study-note" role="alert">
              {{ studyErrorMessage(buddyError, 'Your buddy') }}
            </p>
            <template v-else-if="buddy">
              <p>Level {{ buddy.level }} · {{ buddy.xp }} XP</p>
              <p class="study-note">Your saved buddy stats. Studying does not award XP yet.</p>
            </template>
            <p v-else class="study-note">
              Buddy preview — your selected Pokémon will appear here when your collection is
              connected.
            </p>
          </div>
        </aside>

        <section class="main-study study-panel" aria-label="Learning content">
          <div v-if="selectingTopic" ref="topicSelection" class="study-topic-selection">
            <p class="study-eyebrow">{{ displayTitle(profile.school_level?.name || 'Your school level') }}</p>
            <h2 tabindex="-1">Revise Another Topic</h2>
            <p>Choose a topic to keep learning. Your saved school level stays the same.</p>
            <p v-if="!otherTopics.length" role="status">No other topics are available at your school level yet. You can revisit your completed topic below.</p>
            <p v-else-if="noOtherPopulatedTopics" role="status">No other populated topics are available yet. You can revisit your completed topic below.</p>
            <ul class="study-topic-list">
              <li v-for="item in catalogue.topics" :key="item.id">
                <button :disabled="!topicHasContent(item)" @click="chooseTopic(item)">
                  {{ displayTitle(item.name) }}
                  <span class="study-note">{{ topicContentLabel(item) }}</span>
                </button>
                <div v-if="topicContentFailed(item)" class="study-message" role="alert">
                  <p>{{ studyErrorMessage(topicContentFailed(item), displayTitle(item.name)) }}</p>
                  <button class="study-button study-button-secondary" @click="retryTopicContent(item)">Try again</button>
                </div>
              </li>
            </ul>
          </div>
          <nav v-if="topic" class="study-mode-nav" aria-label="Learning modes">
            <button
              v-for="item in [
                { id: 'learn', label: 'Learn' },
                { id: 'flashcards', label: 'Flashcards' },
              ]"
              :key="item.id"
              :aria-pressed="mode === item.id"
              @click="setMode(item.id)"
            >
              {{ item.label }}
            </button>
          </nav>
          <p v-if="topic && activeResource" class="study-eyebrow study-topic-label">
            {{ displayTitle(subject?.name) }} · {{ displayTitle(topic.name) }}
          </p>
          <!-- Keep the cache alive when browsing a subject with no available topic. -->
          <KeepAlive>
            <component
              v-if="topic && activeResource"
              :is="modeComponent"
              :key="modeKey"
              :topic="topic"
              :resource="activeResource"
              :review-concept-ids="reviewConceptIds"
              :show-overview="route.query.review === 'topic'"
              :arena-busy="arenaState.active || practiceBusy"
              v-bind="mode === 'flashcards' ? { buddy, topicId: topic.id, practiceEnabled: router.hasRoute('surprise-boss'), practiceResume } : {}"
              @progress="updateProgress"
              @complete="completeTopic"
              @mode="setMode"
              @retry="retryMode"
              @arena="goToArena"
              @topics="reviseAnotherTopic"
              @practice="startBossPractice"
            />
          </KeepAlive>
          <div v-if="!selectingTopic && (!topic || !activeResource)" class="study-empty">
            <h2>
              {{
                requestedTopic ? 'This topic is unavailable' : 'No study content is available'
              }}
            </h2>
            <p v-if="!catalogue.subjects.length">
              No subjects are visible to your account. Content may not be published yet, or read
              access may not have been enabled.
            </p>
            <p v-else>
              {{
                requestedTopic
                  ? 'Choose a topic available for your registered school level.'
                  : `There are no available ${displayTitle(subject?.name || '')} topics for ${displayTitle(profile.school_level?.name || 'your school level')} yet.`
              }}
            </p>
            <p class="study-note">
              Content may also be unavailable if your account has not been granted read access.
            </p>
            <a href="#study-topics" class="study-button">Browse available topics</a>
          </div>
        </section>

        <aside class="study-utilities" aria-label="Study tools">
          <StudyTimerPanel v-if="mode !== 'flashcards' || !topic" :topic-id="topic?.id || null" />
          <section
            id="study-topics"
            class="study-panel study-topic-browser"
            aria-labelledby="topic-browser-heading"
          >
            <h2 id="topic-browser-heading">Your study topics</h2>
            <label for="study-subject">Subject</label>
            <select
              id="study-subject"
              :value="subject?.id || ''"
              @change="chooseSubject($event.target.value)"
            >
              <option v-if="!subject" value="" disabled>Choose a subject</option>
              <option v-for="item in catalogue.subjects" :key="item.id" :value="item.id">
                {{ displayTitle(item.name) }}
              </option>
            </select>
            <ul v-if="availableTopics.length" class="study-topic-list">
              <li v-for="item in availableTopics" :key="item.id">
                <button
                  :aria-current="topic?.id === item.id ? 'true' : undefined"
                  @click="chooseTopic(item)"
                >
                  {{ displayTitle(item.name) }}
                </button>
              </li>
            </ul>
            <p v-else class="study-note">
              No topics are available for this subject at your level yet.
            </p>
            <div v-if="topic" class="study-topic-progress">
              <h3>Current learning progress</h3>
              <p>{{ readingProgress.read }} of {{ readingProgress.total }} concepts read</p>
              <progress :value="progressPercent" max="100" aria-label="Topic reading progress" />
              <p class="study-note">
                Reading and flashcard progress stay for this visit. They reset after leaving or
                refreshing.
              </p>
            </div>
          </section>
        </aside>
      </template>
    </div>
  </main>
</template>

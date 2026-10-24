<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router'
import { getCurrentProfile } from '../services/profileService'
import {
  getStudyCatalogue,
  getTopicLesson,
  getTopicFlashcards,
  getStudyQuestions,
  getSelectedStudyBuddy,
  studyErrorMessage,
} from '../services/studyService'
import { useTimer } from '../components/timer/useTimer'
import StudyLearn from '../components/study/StudyLearn.vue'
import StudyFlashcards from '../components/study/StudyFlashcards.vue'
import StudyQuiz from '../components/study/StudyQuiz.vue'
import StudyTimerPanel from '../components/study/StudyTimerPanel.vue'
import StudyImage from '../components/study/StudyImage.vue'
import '../assets/study.css'

const route = useRoute()
const router = useRouter()
const timer = useTimer()
const profile = ref(null)
const catalogue = ref({ subjects: [], topics: [] })
const loading = ref(true)
const error = ref(null)
const buddy = ref(null)
const buddyError = ref(null)
const buddyLoading = ref(false)
const resources = reactive({})
const progress = reactive({})
let alive = true
let generation = 0

const mode = computed(() =>
  ['learn', 'flashcards', 'quiz'].includes(route.query.mode) ? route.query.mode : 'learn',
)
const purpose = computed(() => (route.query.battle === 'boss' ? 'boss_battle' : 'quiz'))
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
  if (mode.value === 'learn') return data.lesson
  if (mode.value === 'flashcards') return data.flashcards
  return data[purpose.value]
})
const modeComponent = computed(
  () => ({ learn: StudyLearn, flashcards: StudyFlashcards, quiz: StudyQuiz })[mode.value],
)
const modeKey = computed(
  () => `${topic.value?.id}:${mode.value}:${mode.value === 'quiz' ? purpose.value : ''}`,
)

async function initialise() {
  const request = ++generation
  loading.value = true
  error.value = null
  profile.value = null
  catalogue.value = { subjects: [], topics: [] }
  Object.keys(resources).forEach((id) => delete resources[id])
  Object.keys(progress).forEach((id) => delete progress[id])
  try {
    const student = await getCurrentProfile()
    if (!alive || request !== generation) return
    profile.value = student
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
      quiz: (id) => getStudyQuestions(id, 'quiz'),
      boss_battle: (id) => getStudyQuestions(id, 'boss_battle'),
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
    ['lesson', 'flashcards', 'quiz', 'boss_battle'].map((name) => [
      name,
      { loading: false, data: null, error: null },
    ]),
  )
  // Start independently: a denied/empty quiz bank must not delay Learn mode.
  for (const name of Object.keys(resources[id])) loadResource(id, name)
}

function setMode(nextMode) {
  const boss = nextMode === 'boss_battle'
  const query = { ...route.query, mode: boss ? 'quiz' : nextMode }
  if (boss) query.battle = 'boss'
  else delete query.battle
  router.push({ name: 'study-decks', query })
}

function chooseSubject(id) {
  const firstTopic = catalogue.value.topics.find((item) => item.subject_id === id)
  router.push({
    name: 'study-decks',
    query: { subject: id, ...(firstTopic ? { topic: firstTopic.id } : {}), mode: 'learn' },
  })
}

function chooseTopic(selected) {
  router.push({
    name: 'study-decks',
    query: { subject: selected.subject_id, topic: selected.id, mode: 'learn' },
  })
}

function updateProgress(value) {
  if (topic.value) progress[topic.value.id] = value
}

function retryMode() {
  if (topic.value)
    loadResource(
      topic.value.id,
      mode.value === 'learn'
        ? 'lesson'
        : mode.value === 'flashcards'
          ? 'flashcards'
          : purpose.value,
    )
}

watch(() => topic.value?.id, loadTopic)
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
  <main class="study-page">
    <div class="study-layout study-screen">
      <header class="study-header study-panel">
        <div class="study-header-title">
          <RouterLink to="/home" class="study-town-link">← Back to Town</RouterLink>
          <h1>Poké Lab</h1>
          <p>Explore a little. Remember a little more.</p>
        </div>
        <div v-if="profile" class="study-header-context">
          <p class="study-level">{{ profile.school_level?.name || 'School level not set' }}</p>
          <p>
            {{ subject?.name || 'Choose a subject' }} <span v-if="topic">· {{ topic.name }}</span>
          </p>
          <a href="#study-topics">Choose subject or topic</a>
        </div>
        <div v-if="topic" class="study-header-progress">
          <label for="topic-reading-progress"
            >{{ readingProgress.read }} / {{ readingProgress.total }} concepts read</label
          >
          <progress id="topic-reading-progress" :value="progressPercent" max="100" />
          <span class="study-note">Progress for this visit</span>
        </div>
      </header>

      <section v-if="loading" class="study-page-state study-panel" role="status">
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
            <h2 id="study-buddy-heading">{{ buddy?.pokemon?.name || 'Pokémon Buddy' }}</h2>
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
          <nav v-if="topic" class="study-mode-nav" aria-label="Learning modes">
            <button
              v-for="item in [
                { id: 'learn', label: 'Learn' },
                { id: 'flashcards', label: 'Flashcards' },
                { id: 'quiz', label: 'Quiz' },
              ]"
              :key="item.id"
              :aria-pressed="mode === item.id"
              @click="setMode(item.id)"
            >
              {{ item.label }}
            </button>
          </nav>
          <template v-if="topic && activeResource">
            <p class="study-eyebrow study-topic-label">{{ subject?.name }} · {{ topic.name }}</p>
            <KeepAlive>
              <component
                :is="modeComponent"
                :key="modeKey"
                :topic="topic"
                :resource="activeResource"
                :purpose="purpose"
                @progress="updateProgress"
                @mode="setMode"
                @retry="retryMode"
              />
            </KeepAlive>
          </template>
          <div v-else class="study-empty">
            <h2>
              {{
                route.query.topic ? 'This topic is unavailable' : 'No study content is available'
              }}
            </h2>
            <p v-if="!catalogue.subjects.length">
              No subjects are visible to your account. Content may not be published yet, or read
              access may not have been enabled.
            </p>
            <p v-else>
              {{
                route.query.topic
                  ? 'Choose a topic available for your registered school level.'
                  : `There are no available ${subject?.name || ''} topics for ${profile.school_level?.name || 'your school level'} yet.`
              }}
            </p>
            <p class="study-note">
              Content may also be unavailable if your account has not been granted read access.
            </p>
            <a href="#study-topics" class="study-button">Browse available topics</a>
          </div>
        </section>

        <aside class="study-utilities" aria-label="Study tools">
          <StudyTimerPanel :topic-id="topic?.id || null" />
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
                {{ item.name }}
              </option>
            </select>
            <ul v-if="availableTopics.length" class="study-topic-list">
              <li v-for="item in availableTopics" :key="item.id">
                <button
                  :aria-current="topic?.id === item.id ? 'true' : undefined"
                  @click="chooseTopic(item)"
                >
                  {{ item.name }}
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
                Reading progress and answer choices stay for this visit. They reset after leaving or
                refreshing.
              </p>
            </div>
          </section>
        </aside>
      </template>
    </div>
  </main>
</template>

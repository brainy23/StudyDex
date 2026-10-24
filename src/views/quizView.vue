<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BackToHome from '../components/common/BackToHome.vue'
import ArenaAssessment from '../components/study/StudyQuiz.vue'
import { getCurrentProfile } from '../services/profileService'
import { getStudyCatalogue, getStudyQuestions, studyErrorMessage } from '../services/studyService'
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
let alive = true
let generation = 0

const purpose = computed(() => route.query.battle === 'boss' ? 'boss_battle' : 'quiz')
const subject = computed(() => {
  const subjects = catalogue.value.subjects
  if (route.query.subject) return subjects.find((item) => item.id === route.query.subject) || null
  const requested = catalogue.value.topics.find((item) => item.id === route.query.topic)
  const firstSubject = requested?.subject_id || catalogue.value.topics[0]?.subject_id
  return subjects.find((item) => item.id === firstSubject) || subjects[0] || null
})
const availableTopics = computed(() => catalogue.value.topics.filter((item) => item.subject_id === subject.value?.id))
const topic = computed(() => route.query.topic
  ? availableTopics.value.find((item) => item.id === route.query.topic) || null
  : availableTopics.value[0] || null)
const resourceKey = computed(() => `${topic.value?.id}:${purpose.value}`)
const quizLocked = computed(() => purpose.value === 'quiz' && !topicCompletion.isComplete(topic.value?.id))
const activeResource = computed(() => quizLocked.value
  ? { loading: false, data: null, error: null }
  : resources[resourceKey.value])
const coveredTopics = computed(() => availableTopics.value.filter((item) => topicCompletion.isComplete(item.id)))
const revisionLocation = computed(() => ({
  name: 'study-decks',
  query: {
    ...(subject.value ? { subject: subject.value.id } : {}),
    ...(topic.value ? { topic: topic.value.id } : {}),
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
    ...(topicId ? { topic: topicId } : {}),
    ...(purpose.value === 'boss_battle' ? { battle: 'boss' } : {}),
  }
}
function chooseSubject(id) {
  const firstTopic = catalogue.value.topics.find((item) => item.subject_id === id)
  router.push({ name: 'quiz', query: assessmentQuery(id, firstTopic?.id) })
}
function chooseTopic(selected) {
  router.push({ name: 'quiz', query: assessmentQuery(selected.subject_id, selected.id) })
}
function setAssessmentMode(nextMode) {
  if (nextMode === 'study') {
    router.push({ ...revisionLocation.value, query: { ...revisionLocation.value.query, mode: 'learn' } })
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
  if (!quizLocked.value) loadAssessment(topic.value?.id, purpose.value, true)
}

watch(() => [topic.value?.id, purpose.value, quizLocked.value], ([id, nextPurpose, locked]) => {
  if (!locked) loadAssessment(id, nextPurpose)
})
onMounted(initialise)
onUnmounted(() => {
  alive = false
  generation++
})
</script>

<template>
  <main class="quiz-page study-page">
    <section class="quiz-panel" aria-labelledby="quiz-heading">
      <header class="arena-header">
        <div class="arena-links">
          <BackToHome />
          <RouterLink :to="revisionLocation" class="study-button study-button-secondary">Revise in Poké Lab</RouterLink>
        </div>
        <h1 id="quiz-heading">Poké Arena</h1>
        <p>Each topic you finish in Poké Lab unlocks its Topic Quiz. You can enter Boss Battles directly.</p>
        <p class="study-note">Topics covered are saved in this browser for your account. They do not sync between devices yet.</p>
        <p v-if="!savedInBrowser" class="study-note" role="status">Browser storage is unavailable. Topic unlocks will last for this app visit only.</p>
        <p v-if="profile" class="study-level">{{ profile.school_level?.name || 'School level not set' }}</p>
        <a v-if="profile?.school_level_id" href="#arena-topics">Choose subject or topic</a>
      </header>

      <p v-if="loading" role="status">Loading your Poké Arena…</p>
      <div v-else-if="error" class="study-message" role="alert">
        <h2>We could not open Poké Arena</h2>
        <p>{{ studyErrorMessage(error, 'Your Arena content') }}</p>
        <button class="study-button" @click="initialise">Try again</button>
      </div>
      <div v-else-if="!profile?.school_level_id" class="study-empty">
        <h2>Set your school level first</h2>
        <p>Add your Primary level in Account Settings to see available assessments.</p>
        <RouterLink to="/account" class="study-button">Open Account Settings</RouterLink>
      </div>
      <div v-else class="arena-layout">
        <section class="study-panel main-study" aria-label="Assessment content">
          <p v-if="topic" class="study-eyebrow">{{ subject?.name }} · {{ topic.name }}</p>
          <KeepAlive>
            <ArenaAssessment
              v-if="topic && activeResource"
              :key="resourceKey"
              :resource="activeResource"
              :purpose="purpose"
              :locked="quizLocked"
              @mode="setAssessmentMode"
              @retry="retryAssessment"
            />
          </KeepAlive>
          <div v-if="!topic" class="study-empty">
            <h2>{{ route.query.topic ? 'This topic is unavailable' : 'No assessment topics are available' }}</h2>
            <p v-if="!catalogue.subjects.length">No subjects are visible to your account. Content may not be published yet, or read access may not have been enabled.</p>
            <p v-else>Choose an available {{ subject?.name || '' }} topic for {{ profile.school_level?.name || 'your school level' }}.</p>
          </div>
        </section>

        <aside id="arena-topics" class="study-panel study-topic-browser" aria-labelledby="arena-topics-heading">
          <h2 id="arena-topics-heading">Assessment topics</h2>
          <p v-if="purpose === 'quiz'" class="study-note">{{ coveredTopics.length }} of {{ availableTopics.length }} topics covered in this subject. Covered topics unlock a quiz when questions are available.</p>
          <label for="arena-subject">Subject</label>
          <select id="arena-subject" :value="subject?.id || ''" @change="chooseSubject($event.target.value)">
            <option v-if="!subject" value="" disabled>Choose a subject</option>
            <option v-for="item in catalogue.subjects" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <ul v-if="availableTopics.length" class="study-topic-list">
            <li v-for="item in availableTopics" :key="item.id">
              <button :aria-current="topic?.id === item.id ? 'true' : undefined" @click="chooseTopic(item)">
                {{ item.name }}
                <span v-if="purpose === 'quiz'" class="study-note arena-topic-status">{{ topicCompletion.isComplete(item.id) ? 'Topic covered · Quiz unlocked' : 'Finish topic in Poké Lab' }}</span>
              </button>
            </li>
          </ul>
          <p v-else class="study-note">No topics are available for this subject at your level yet.</p>
        </aside>
      </div>
    </section>
  </main>
</template>

<style scoped>
.quiz-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: url('/backgrounds/morning_homepage.png') center / cover;
  color: #17324d;
}

.quiz-panel {
  width: min(100%, 1140px);
  min-width: 0;
  padding: clamp(18px, 3vw, 32px);
  border: 3px solid #ffd000;
  border-radius: 20px;
  background: #fffffff2;
  text-align: left;
}

.arena-header { margin-bottom: 24px; }
.arena-links { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.arena-layout { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 20px; align-items: start; }
.arena-topic-status { display: block; margin-top: 4px; }
@media (max-width: 53rem) {
  .arena-layout { grid-template-columns: minmax(0, 1fr); }
}
</style>

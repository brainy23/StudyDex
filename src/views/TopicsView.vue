<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getCurrentProfile } from '../services/profileService'
import { getStudentStudyCatalogue, studyErrorMessage } from '../services/studyService'
import { getStudentQuizCatalogue } from '../services/quizPreviewService'
import { useTopicCompletion } from '../composables/useTopicCompletion'
import { enterRoom } from '../composables/useRoomTransition'
import LoadingScreen from '../components/common/LoadingScreen.vue'
import '../assets/selection-pages.css'
const route = useRoute()
const router = useRouter()
const flow = computed(() => route.query.flow === 'quiz' ? 'quiz' : 'study')
const asset = name => `${import.meta.env.BASE_URL}selection/${name}`
const topicCompletion = useTopicCompletion()
const profile = ref(null)
const catalogue = ref({ subjects: [], topics: [] })
const loading = ref(true)
const error = ref('')
let active = true
let requestId = 0
async function load() {
  const request = ++requestId
  const requestedFlow = flow.value
  topicCompletion.bindStudent(null, null)
  loading.value = true
  error.value = ''
  try {
    const student = await getCurrentProfile()
    if (!active || request !== requestId) return
    profile.value = student
    topicCompletion.bindStudent(student.id, student.school_level_id, requestedFlow)
    catalogue.value = { subjects: [], topics: [] }
    if (student.school_level_id) {
      const data = await (requestedFlow === 'quiz' ? getStudentQuizCatalogue : getStudentStudyCatalogue)(student)
      if (active && request === requestId) catalogue.value = data
    }
  } catch (cause) { if (active && request === requestId) error.value = studyErrorMessage(cause, 'Your subjects') }
  finally { if (active && request === requestId) loading.value = false }
}
onMounted(load)
onUnmounted(() => { active = false; requestId++ })
watch(() => route.query.flow, load)

const search = ref('')
const selectedSubject = computed(() => {
  if (route.query.subject) return catalogue.value.subjects.find(s => s.id === route.query.subject) || null
  return catalogue.value.subjects[0] || null
})
const subjectTheme = computed(() => {
  if (loading.value || !selectedSubject.value) return 'white'

  const name = selectedSubject.value.name.trim().toLowerCase()

  if (['mathematics', 'maths', 'math'].includes(name)) return 'green'
  if (name === 'science') return 'purple'

  return 'white'
})
const pageArt = asset('subjects-white.png')
const topics = computed(() => catalogue.value.topics
  .filter(t => t.subject_id === selectedSubject.value?.id)
  .map(t => ({ ...t, theme:selectedSubject.value?.name })))
const shownTopics = computed(() => topics.value.filter(t => `${t.name} ${t.description || ''} ${t.theme || ''}`.toLowerCase().includes(search.value.trim().toLowerCase())))
function disabled(item) { return flow.value === 'quiz' && !item.quiz_question_count }
function actionText() { return flow.value === 'quiz' ? 'Start quiz →' : 'Choose Learn or Study →' }
const navigationError = ref('')
async function selectTopic(item) {
  if (disabled(item)) return
  const query = { subject:selectedSubject.value?.id, topic:item.id }
  navigationError.value = ''
  try {
    if (flow.value === 'quiz') await enterRoom(router, 'quiz-battle', query)
    else await router.push({ name:'study-mode', query })
  } catch (cause) {
    if (cause.name !== 'AbortError') navigationError.value = cause.message
  }
}
</script>
<template>
  <LoadingScreen :show="loading" message="Opening your Topics…" />
<main v-if="!loading" class="sd-picker sd-topics sd-colour-topics" :class="`sd-theme-${subjectTheme}`" :style="{ '--page-art': `url(${pageArt})` }">
  <nav class="sd-top-nav"><RouterLink to="/home">‹ Back to town</RouterLink><RouterLink :to="{ name:'selection-subjects', query:{ flow } }">← All subjects</RouterLink></nav>
  <header class="sd-picker-heading"><p class="sd-eyebrow">STUDYDEX · {{ selectedSubject?.name || 'STUDY' }}</p><h1>Your {{ selectedSubject?.name || 'study' }} adventure</h1><p>Pick a topic. Make your next discovery.</p></header>
  <p v-if="navigationError" class="sd-page-state" role="alert">{{ navigationError }}</p>
    <div v-if="error" class="sd-page-state" role="alert"><p>{{ error }}</p><button @click="load">Try again</button></div>
    <div v-else-if="!profile?.school_level_id" class="sd-page-state"><p>Set your school level to see the right topics.</p><RouterLink to="/account">Account settings</RouterLink></div>
  <section v-else class="sd-topic-panel" :aria-label="`${selectedSubject?.name || 'Study'} topics`">
    <div class="sd-topic-toolbar"><span class="sd-level">{{ selectedSubject?.name || 'STUDY' }} · {{ profile.school_level?.name }}</span><span class="sd-count">{{ topics.length }} topics</span></div>
    <label class="sd-search"><span>Find a topic</span><input v-model="search" type="search" :placeholder="`Search ${selectedSubject?.name || 'study'} topics…`" /></label>
    <div class="sd-topic-list">
      <button v-for="item in shownTopics" :key="item.id" class="sd-topic-card" :disabled="disabled(item)" @click="selectTopic(item)">
        <span class="sd-topic-copy"><small>{{ item.theme || selectedSubject?.name || 'Study' }}</small><strong>{{ item.name }}</strong><span>{{ item.description }}</span><em>{{ actionText(item) }}</em></span>
        <span class="sd-topic-art"><span class="sd-topic-ring" aria-hidden="true"><svg class="topic-pokeball" viewBox="0 0 100 100" focusable="false" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="white" />
          <path d="M4 50a46 46 0 0 1 92 0Z" fill="var(--topic-accent)" />
          <path d="M5 50h90" stroke="var(--topic-deep)" stroke-width="6" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--topic-deep)" stroke-width="5" />
          <circle cx="50" cy="50" r="22" fill="white" stroke="var(--topic-deep)" stroke-width="5" />
        </svg><b>{{ String(topics.findIndex(t => t.id === item.id) + 1).padStart(2,'0') }}</b></span><span v-if="topicCompletion.isComplete(item.id)" class="sd-done-badge"><span aria-hidden="true">✓</span> Done</span><span v-else class="sd-topic-chevron" aria-hidden="true">›</span></span>
      </button>
    </div>
    <p v-if="!shownTopics.length" class="sd-empty">{{ topics.length ? 'No matching topics. Try another search.' : `No ${selectedSubject?.name || 'study'} topics are available for your school level yet.` }}</p>
    <p v-if="flow === 'quiz'" class="sd-footnote">Three attempts per topic per Singapore day. Scores and XP are saved to Study History.</p>
    <p v-if="!topicCompletion.savedInBrowser.value" class="sd-footnote" role="status">Completion badges could not load. <button @click="topicCompletion.refresh">Retry</button></p>
  </section>
</main>
</template>

<style scoped>
.sd-colour-topics .sd-done-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 8px;
  padding: 6px 10px;
  border: 1px solid #ffe16b;
  border-radius: 999px;
  background: #203f2e;
  color: #ffe16b;
  font-size: 14px;
  font-weight: 850;
  line-height: 1.2;
  white-space: nowrap;
}
.sd-theme-purple .sd-done-badge { background: #412858; }

/* One white image, tinted by the selected subject's palette. */
.sd-picker.sd-topics.sd-colour-topics {
  --topic-accent: #ae77cf;
  --topic-deep: #664286;
  --topic-light: #f5eaff;
  --topic-page: #e9dcf5;
  --topic-ink: #303557;
  --topic-muted: #6b577e;
  --topic-line: #b49aca;
  --ink: var(--topic-ink);
  background-color: var(--topic-page);
  background-image: var(--page-art);
  background-blend-mode: multiply;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  color: var(--topic-ink);
}
.sd-picker.sd-topics.sd-colour-topics.sd-theme-green {
  --topic-accent: #80bd92;
  --topic-deep: #28633d;
  --topic-light: #eaf7ed;
  --topic-page: #dcefe1;
  --topic-ink: #203f2e;
  --topic-muted: #4d6d58;
  --topic-line: #94bea0;
}
/* Disable older decorative overlays: the white image provides the pattern. */
.sd-colour-topics::before,
.sd-colour-topics::after { content: none; }
.sd-colour-topics .sd-picker-heading h1 { color: var(--topic-ink); }
.sd-colour-topics .sd-eyebrow,
.sd-colour-topics .sd-level,
.sd-colour-topics .sd-course,
.sd-colour-topics .sd-topic-copy small,
.sd-colour-topics .sd-topic-copy em { color: var(--topic-deep); }
.sd-colour-topics .sd-count,
.sd-colour-topics .sd-picker-heading > p:last-child,
.sd-colour-topics .sd-topic-copy > span,
.sd-colour-topics .sd-footnote { color: var(--topic-muted); }
.sd-colour-topics .sd-topic-panel {
  background: none; border: 0; box-shadow: none;
}
.sd-colour-topics .sd-top-nav a,
.sd-colour-topics .sd-search input,
.sd-colour-topics .sd-course select,
.sd-colour-topics .sd-page-state {
  background: white;
  color: var(--topic-ink);
  border-color: var(--topic-line);
}
.sd-colour-topics .sd-page-state button {
  background: var(--topic-light);
  border-color: var(--topic-line);
  color: var(--topic-deep);
}
.sd-colour-topics .sd-topic-card {
  background: linear-gradient(
    105deg, #fff 0%, var(--topic-light) 69%,
    var(--topic-accent) 69.5%, var(--topic-deep) 100%
  );
  color: var(--topic-ink);
  box-shadow: 0 5px 0 var(--topic-line);
}
.sd-colour-topics .sd-topic-card:not(:disabled):hover {
  border-color: var(--topic-accent);
}
.sd-colour-topics .sd-notice {
  background: var(--topic-light); color: var(--topic-deep);
}
.sd-colour-topics .sd-topic-ring {
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
  color: var(--topic-deep);
}
.sd-colour-topics .sd-topic-ring::before,
.sd-colour-topics .sd-topic-ring::after { content: none; }
.sd-colour-topics .topic-pokeball {
  position: absolute; inset: 0; display: block; width: 100%; height: 100%;
}
.sd-colour-topics .sd-topic-ring b {
  position: relative; inset: auto; transform: none;
  z-index: 1; font-size: 15px; line-height: 1; color: var(--topic-deep);
}
.sd-picker.sd-topics.sd-colour-topics.sd-theme-white {
  --topic-page: #fff;
  background-color: #fff;
  background-blend-mode: normal;
}
</style>

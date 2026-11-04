<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getCurrentProfile } from '../services/profileService'
import { getStudentStudyCatalogue, studyErrorMessage } from '../services/studyService'
import { getSubjectTheme } from '../data/subjectThemes'
import { getStudentQuizCatalogue } from '../services/quizPreviewService'
import '../assets/selection-pages.css'
const route = useRoute()
const router = useRouter()
const flow = computed(() => route.query.flow === 'quiz' ? 'quiz' : 'study')
const asset = name => `${import.meta.env.BASE_URL}selection/${name}`
const profile = ref(null)
const catalogue = ref({ subjects: [], topics: [] })
const loading = ref(true)
const error = ref('')
let active = true
let requestId = 0
async function load() {
  const request = ++requestId
  loading.value = true
  error.value = ''
  try {
    const student = await getCurrentProfile()
    if (!active || request !== requestId) return
    profile.value = student
    catalogue.value = { subjects: [], topics: [] }
    if (student.school_level_id) {
      const data = await (flow.value === 'quiz' ? getStudentQuizCatalogue : getStudentStudyCatalogue)(student)
      if (active && request === requestId) catalogue.value = data
    }
  } catch (cause) { if (active && request === requestId) error.value = studyErrorMessage(cause, 'Your subjects') }
  finally { if (active && request === requestId) loading.value = false }
}
onMounted(load)
onUnmounted(() => { active = false; requestId++ })
watch(() => route.query.flow, load)

const search = ref('')
const selectedSubject = computed(() => route.query.subject
  ? catalogue.value.subjects.find(subject => subject.id === route.query.subject) || null
  : catalogue.value.subjects[0] || null)
const subjectTheme = computed(() => getSubjectTheme(selectedSubject.value?.name))
const pageArt = computed(() => asset(subjectTheme.value === 'purple' ? 'science-purple.png' : 'subjects-white.png'))
const topics = computed(() => catalogue.value.topics
  .filter(topic => topic.subject_id === selectedSubject.value?.id)
  .map(topic => ({ ...topic, theme:selectedSubject.value?.name })))
const shownTopics = computed(() => topics.value.filter(t => `${t.name} ${t.description || ''} ${t.theme || ''}`.toLowerCase().includes(search.value.trim().toLowerCase())))
function disabled(item) { return flow.value === 'quiz' && !item.quiz_question_count }
function actionText() { return flow.value === 'quiz' ? 'Preview questions →' : 'Choose Learn or Study →' }
function selectTopic(item) {
  if (disabled(item)) return
  const query = { subject:selectedSubject.value?.id, topic:item.id }
  router.push(flow.value === 'quiz'
    ? { name:'quiz-battle', query }
    : { name:'study-mode', query })
}
</script>
<template>
<main class="sd-picker sd-topics" :class="`sd-theme-${subjectTheme}`" :style="{ '--page-art': `url(${pageArt})` }">
  <nav class="sd-top-nav"><RouterLink to="/home">‹ Back to town</RouterLink><RouterLink :to="{ name:'selection-subjects', query:{ flow } }">← All subjects</RouterLink></nav>
  <header class="sd-picker-heading"><p class="sd-eyebrow">STUDYDEX · {{ selectedSubject?.name || 'STUDY' }}</p><h1>Your {{ selectedSubject?.name || 'study' }} adventure</h1><p>Pick a topic. Make your next discovery.</p></header>
  <p v-if="loading" class="sd-page-state" role="status">Loading your subjects…</p>
    <div v-else-if="error" class="sd-page-state" role="alert"><p>{{ error }}</p><button @click="load">Try again</button></div>
    <div v-else-if="!profile?.school_level_id" class="sd-page-state"><p>Set your school level to see the right topics.</p><RouterLink to="/account">Account settings</RouterLink></div>
  <section v-else class="sd-topic-panel" :aria-label="`${selectedSubject?.name || 'Study'} topics`">
    <div class="sd-topic-toolbar"><span class="sd-level">{{ selectedSubject?.name || 'STUDY' }} · {{ profile.school_level?.name }}</span><span class="sd-count">{{ topics.length }} topics</span></div>
    <label class="sd-search"><span>Find a topic</span><input v-model="search" type="search" :placeholder="`Search ${selectedSubject?.name || 'study'} topics…`" /></label>
    <div class="sd-topic-list">
      <button v-for="item in shownTopics" :key="item.id" class="sd-topic-card" :disabled="disabled(item)" @click="selectTopic(item)">
        <span class="sd-topic-copy"><small>{{ item.theme || 'Study' }}</small><strong>{{ item.name }}</strong><span>{{ item.description }}</span><em>{{ actionText(item) }}</em></span>
        <span class="sd-topic-art" aria-hidden="true"><span class="sd-topic-ring"><img :src="asset('pokeball-purple.svg')" alt="" draggable="false" /><b>{{ String(topics.findIndex(t => t.id === item.id) + 1).padStart(2,'0') }}</b></span><span class="sd-topic-chevron">›</span></span>
      </button>
    </div>
    <p v-if="!shownTopics.length" class="sd-empty">{{ topics.length ? 'No matching topics. Try another search.' : `No ${selectedSubject?.name || 'study'} topics are available for your school level yet.` }}</p>
    <p v-if="flow === 'quiz'" class="sd-footnote">Question previews are not graded. Answers, scores and EXP are not saved.</p>
  </section>
</main>
</template>

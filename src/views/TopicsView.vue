<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getCurrentProfile } from '../services/profileService'
import { getStudyCatalogue, studyErrorMessage } from '../services/studyService'
import '../assets/selection-pages.css'
const route = useRoute()
const router = useRouter()
const flow = computed(() => route.query.flow === 'quiz' ? 'quiz' : 'study')
const asset = name => `${import.meta.env.BASE_URL}selection/${name}`
import { scienceTopics, demoBank } from '../data/scienceQuizData'
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
      try {
        const data = await getStudyCatalogue(student.school_level_id)
        if (active && request === requestId) catalogue.value = data
      } catch (cause) { if (flow.value !== 'quiz') throw cause }
    }
  } catch (cause) { if (active && request === requestId) error.value = studyErrorMessage(cause, 'Your subjects') }
  finally { if (active && request === requestId) loading.value = false }
}
onMounted(load)
onUnmounted(() => { active = false; requestId++ })
watch(() => route.query.flow, load)

const search = ref('')
const scienceCourse = ref(route.query.course === 'foundation' ? 'foundation' : 'standard')
const now = ref(new Date())
let clock
onMounted(() => { clock = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(clock))
const quizzesOpen = computed(() => true)
const science = computed(() => catalogue.value.subjects.find(s => /^science$/i.test(s.name.trim())))
const level = computed(() => {
  const match = String(profile.value?.school_level?.name || '').match(/^(?:primary\s*|p\s*)?([3-6])(?:\b|$)/i)
  return match ? Number(match[1]) : null
})
const topics = computed(() => flow.value === 'quiz'
  ? scienceTopics.filter(t => t.level === level.value && !(scienceCourse.value === 'foundation' && t.standardOnly)).map(t => ({ ...t, id:t.key, description:t.official, ready:!!demoBank[t.key]?.length }))
  : catalogue.value.topics.filter(t => t.subject_id === science.value?.id))
const shownTopics = computed(() => topics.value.filter(t => `${t.name} ${t.description || ''} ${t.theme || ''}`.toLowerCase().includes(search.value.trim().toLowerCase())))
function disabled(item) { return flow.value === 'quiz' && (!item.ready || !quizzesOpen.value) }
function actionText(item) { return flow.value !== 'quiz' ? 'Choose Learn or Study →' : !item.ready ? 'Coming soon' : !quizzesOpen.value ? 'Available from 7am' : 'Enter battle →' }
function selectTopic(item) {
  if (disabled(item)) return
  const query = { subject:science.value?.id || 'moe-science-preview', topic:item.id }
  router.push(flow.value === 'quiz'
    ? { name:'quiz-battle', query:{ ...query, course:scienceCourse.value } }
    : { name:'study-mode', query })
}
</script>
<template>
<main class="sd-picker sd-topics" :style="{ '--page-art': `url(${asset('science-purple.png')})` }">
  <nav class="sd-top-nav"><RouterLink to="/home">‹ Back to town</RouterLink><RouterLink :to="{ name:'selection-subjects', query:{ flow } }">← All subjects</RouterLink></nav>
  <header class="sd-picker-heading"><p class="sd-eyebrow">STUDYDEX · SCIENCE</p><h1>Your Science adventure</h1><p>Pick a topic. Make your next discovery.</p></header>
  <p v-if="loading" class="sd-page-state" role="status">Loading your subjects…</p>
    <div v-else-if="error" class="sd-page-state" role="alert"><p>{{ error }}</p><button @click="load">Try again</button></div>
    <div v-else-if="!profile?.school_level_id" class="sd-page-state"><p>Set your school level to see the right topics.</p><RouterLink to="/account">Account settings</RouterLink></div>
  <section v-else class="sd-topic-panel" aria-label="Science topics">
    <div class="sd-topic-toolbar"><span class="sd-level">SCIENCE · {{ profile.school_level?.name }}</span><span class="sd-count">{{ topics.length }} topics</span></div>
    <label v-if="flow === 'quiz' && level >= 5" class="sd-course">Syllabus view<select v-model="scienceCourse"><option value="standard">Standard Science</option><option value="foundation">Foundation Science</option></select></label>
    <label class="sd-search"><span>Find a topic</span><input v-model="search" type="search" placeholder="Search Science topics…" /></label>
    <p v-if="flow === 'quiz' && !quizzesOpen" class="sd-notice">Quizzes open at 7am. You can browse your topics now.</p>
    <div class="sd-topic-list">
      <button v-for="(item,index) in shownTopics" :key="item.id" class="sd-topic-card" :disabled="disabled(item)" @click="selectTopic(item)">
        <span class="sd-topic-copy"><small>{{ item.theme || 'Science' }}</small><strong>{{ item.name }}</strong><span>{{ item.description }}</span><em>{{ actionText(item) }}</em></span>
        <span class="sd-topic-art" aria-hidden="true"><span class="sd-topic-ring"><img :src="asset('pokeball-purple.svg')" alt="" draggable="false" /><b>{{ String(topics.findIndex(t => t.id === item.id) + 1).padStart(2,'0') }}</b></span><span class="sd-topic-chevron">›</span></span>
      </button>
    </div>
    <p v-if="!shownTopics.length" class="sd-empty">{{ topics.length ? 'No matching topics. Try another search.' : 'No Science topics are available for your school level yet.' }}</p>
    <p v-if="flow === 'quiz'" class="sd-footnote">Demo questions are for practice. Scores and EXP are not saved.</p>
  </section>
</main>
</template>

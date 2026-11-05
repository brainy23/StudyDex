<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getCurrentProfile } from '../services/profileService'
import { getStudentStudyCatalogue, studyErrorMessage } from '../services/studyService'
import { getSubjectTheme, isScienceSubject } from '../data/subjectThemes'
import { getStudentQuizCatalogue } from '../services/quizPreviewService'
import { usePokemonTransition } from '../composables/usePokemonTransition'
import '../assets/selection-pages.css'
import StudydexBubbleNav from '@/components/common/StudydexBubbleNav.vue'
import LoadingScreen from '../components/common/LoadingScreen.vue'
const route = useRoute()
const router = useRouter()
const pokemonTransition = usePokemonTransition()
let transitionSequence = 0
let transitionKey = ''
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
  transitionSequence = pokemonTransition.state.sequence
  const sequence = transitionSequence
  const requestedFlow = flow.value
  const key = `${requestedFlow}-subjects`
  transitionKey = key
  loading.value = true
  error.value = ''
  try {
    const student = await getCurrentProfile()
    if (!active || request !== requestId) return
    profile.value = student
    catalogue.value = { subjects: [], topics: [] }
    if (student.school_level_id) {
      const data = await (requestedFlow === 'quiz' ? getStudentQuizCatalogue : getStudentStudyCatalogue)(student)
      if (active && request === requestId) catalogue.value = data
    }
  } catch (cause) { if (active && request === requestId) error.value = studyErrorMessage(cause, 'Your subjects') }
  finally {
    if (active && request === requestId) {
      loading.value = false
      await nextTick()
      if (active && request === requestId) pokemonTransition.pageReady(key, sequence)
    }
  }
}
onMounted(load)
onUnmounted(() => {
  active = false
  requestId++
  pokemonTransition.pageLeft(transitionKey, transitionSequence)
})
watch(() => route.query.flow, () => {
  pokemonTransition.pageLeft(transitionKey, transitionSequence)
  load()
})
watch(() => pokemonTransition.state.outcome, outcome => {
  if (outcome !== 'failed' || !loading.value ||
      pokemonTransition.state.sequence !== transitionSequence) return
  // Invalidate a stalled read so it cannot overwrite the retry/error state later.
  requestId++
  loading.value = false
  error.value = pokemonTransition.state.error || 'Your subjects could not be loaded. Please try again.'
})

const lanes = computed(() => {
  const subjects = catalogue.value.subjects
  return subjects.map(subject => {
    const topicCount = catalogue.value.topics.filter(topic => topic.subject_id === subject.id).length
    return {
      ...subject,
      topicCount,
      enabled: topicCount > 0,
      theme: getSubjectTheme(subject.name),
      icon: isScienceSubject(subject.name) ? 'science' : /math/i.test(subject.name) ? 'mathematics' : /^english$/i.test(subject.name) ? 'english' : 'study',
    }
  })
})
function selectSubject(item) {
  if (!item.enabled) return
  router.push({ name:'selection-topics', query:{ flow:flow.value, subject:item.id } })
}
</script>
<template>
<LoadingScreen :show="loading" message="Opening your adventure…" />
<main class="sd-picker" :style="{ '--page-art': `url(${asset('subjects-white.png')})` }">
  <nav class="sd-top-nav"><RouterLink to="/home">‹ Back to town</RouterLink></nav>
  <header class="sd-picker-heading"><p class="sd-eyebrow">STUDYDEX · {{ flow === 'quiz' ? 'POKÉ ARENA' : 'POKÉ LAB' }}</p><h1>Choose your next adventure</h1><p>What will you master today?</p></header>
  <p v-if="loading" class="sd-page-state" role="status">Loading your subjects…</p>
    <div v-else-if="error" class="sd-page-state" role="alert"><p>{{ error }}</p><button @click="load">Try again</button></div>
    <div v-else-if="!profile?.school_level_id" class="sd-page-state"><p>Set your school level to see the right topics.</p><RouterLink to="/account">Account settings</RouterLink></div>
  <div v-else-if="lanes.length" class="sd-paths">
    <button v-for="item in lanes" :key="item.id" class="sd-path" :class="`sd-path-${item.theme}`" :disabled="!item.enabled" @click="selectSubject(item)">
      <span class="sd-orbit" aria-hidden="true"><span class="sd-icon-disc"><img :src="asset(`${item.icon}.svg`)" alt="" draggable="false" /></span></span>
      <span class="sd-path-copy"><strong>{{ item.name }}</strong><small>{{ item.enabled ? item.topicCount ? `${item.topicCount} topics available` : 'Explore topics' : 'No topics for your level yet' }}</small></span>
      <span class="sd-path-arrow" aria-hidden="true">{{ item.enabled ? '›' : '⌑' }}</span>
    </button>
  </div>
  <p v-else class="sd-empty">No subjects are available for your school level yet.</p>
  <StudydexBubbleNav :current="flow"/>
</main>
</template>

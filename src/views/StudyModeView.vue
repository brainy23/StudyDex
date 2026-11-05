<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getCurrentProfile } from '../services/profileService'
import { getStudentStudyCatalogue, studyErrorMessage } from '../services/studyService'
import { enterRoom } from '../composables/useRoomTransition'
import LoadingScreen from '../components/common/LoadingScreen.vue'
import GoBackBtn from '../components/common/goBackbtn.vue'
import '../assets/selection-pages.css'
const route = useRoute()
const router = useRouter()
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
      const data = await getStudentStudyCatalogue(student)
      if (active && request === requestId) catalogue.value = data
    }
  } catch (cause) { if (active && request === requestId) error.value = studyErrorMessage(cause, 'Your subjects') }
  finally { if (active && request === requestId) loading.value = false }
}
onMounted(load)
onUnmounted(() => { active = false; requestId++ })
watch(() => route.query.flow, load)

const topic = computed(() => catalogue.value.topics.find(t =>
  String(t.id) === String(route.query.topic) &&
  (!route.query.subject || String(t.subject_id) === String(route.query.subject))
))
const choices = [{ mode:'learn', name:'Learn', icon:'learn', theme:'purple', detail:'Explore the lesson with Professor Mewtwo' }, { mode:'flashcards', name:'Study', icon:'study', theme:'green', detail:'Practise flashcards and start your focus timer' }]
const navigationError = ref('')
async function selectMode(mode) {
  if (!topic.value) return
  navigationError.value = ''
  try {
    await enterRoom(router, mode === 'learn' ? 'learn' : 'study-decks', { subject:topic.value.subject_id, topic:topic.value.id })
  } catch (cause) {
    if (cause.name !== 'AbortError') navigationError.value = cause.message
  }
}
</script>
<template>
  <LoadingScreen :show="loading" message="Opening your Modes…" />
<main v-if="!loading" class="sd-picker" :style="{ '--page-art': `url(${asset('subjects-white.png')})` }">
  <nav class="sd-top-nav"><GoBackBtn /></nav>
  <header class="sd-picker-heading"><p class="sd-eyebrow">Poké Lab</p><h1>How would you like to begin?</h1><p>{{ topic?.name || 'Choose your learning adventure' }}</p></header>
  <p v-if="navigationError" class="sd-page-state" role="alert">{{ navigationError }}</p>
    <div v-if="error" class="sd-page-state" role="alert"><p>{{ error }}</p><button @click="load">Try again</button></div>
    <div v-else-if="!profile?.school_level_id" class="sd-page-state"><p>Set your school level to see the right topics.</p><RouterLink to="/account">Account settings</RouterLink></div>
  <p v-else-if="!topic" class="sd-page-state">This topic is unavailable for your school level. Choose another topic.</p>
  <div v-else class="sd-paths">
    <button v-for="item in choices" :key="item.mode" class="sd-path" :class="`sd-path-${item.theme}`" @click="selectMode(item.mode)">
      <span class="sd-orbit" aria-hidden="true"><span class="sd-icon-disc"><img :src="asset(`${item.icon}.svg`)" alt="" draggable="false" /></span></span>
      <span class="sd-path-copy"><strong>{{ item.name }}</strong><small>{{ item.detail }}</small></span><span class="sd-path-arrow" aria-hidden="true">›</span>
    </button>
  </div>
</main>
</template>

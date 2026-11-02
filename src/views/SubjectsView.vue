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

const science = computed(() => catalogue.value.subjects.find(s => /^science$/i.test(s.name.trim())) || (flow.value === 'quiz' ? { id:'moe-science-preview', name:'Science' } : null))
const lanes = computed(() => {
  const extras = catalogue.value.subjects.filter(s => !/^science$/i.test(s.name.trim()))
  if (!extras.some(s => /^(math|maths|mathematics)$/i.test(s.name))) extras.push({ id:'maths', name:'Mathematics' })
  if (!extras.some(s => /^english$/i.test(s.name))) extras.push({ id:'english', name:'English' })
  return [{ id:science.value?.id || 'science', name:'Science', enabled:!!science.value, theme:'purple', icon:'science' }, ...extras.map((s,i) => ({ ...s, enabled:false, theme:i%2 ? 'gold' : 'green', icon:/math/i.test(s.name) ? 'mathematics' : 'english' }))]
})
function selectSubject(item) {
  if (!item.enabled) return
  router.push({ name:'selection-topics', query:{ flow:flow.value, subject:item.id } })
}
</script>
<template>
<main class="sd-picker" :style="{ '--page-art': `url(${asset('subjects-white.png')})` }">
  <nav class="sd-top-nav"><RouterLink to="/home">‹ Back to town</RouterLink></nav>
  <header class="sd-picker-heading"><p class="sd-eyebrow">STUDYDEX · {{ flow === 'quiz' ? 'POKÉ ARENA' : 'POKÉ LAB' }}</p><h1>Choose your next adventure</h1><p>What will you master today?</p></header>
  <p v-if="loading" class="sd-page-state" role="status">Loading your subjects…</p>
    <div v-else-if="error" class="sd-page-state" role="alert"><p>{{ error }}</p><button @click="load">Try again</button></div>
    <div v-else-if="!profile?.school_level_id" class="sd-page-state"><p>Set your school level to see the right topics.</p><RouterLink to="/account">Account settings</RouterLink></div>
  <div v-else class="sd-paths">
    <button v-for="item in lanes" :key="item.id" class="sd-path" :class="`sd-path-${item.theme}`" :disabled="!item.enabled" @click="selectSubject(item)">
      <span class="sd-orbit" aria-hidden="true"><span class="sd-icon-disc"><img :src="asset(`${item.icon}.svg`)" alt="" draggable="false" /></span></span>
      <span class="sd-path-copy"><strong>{{ item.name }}</strong><small>{{ item.enabled ? 'Explore topics' : item.name === 'Science' ? 'Not available for your level yet' : 'Coming soon' }}</small></span>
      <span class="sd-path-arrow" aria-hidden="true">{{ item.enabled ? '›' : '⌑' }}</span>
    </button>
  </div>
</main>
</template>

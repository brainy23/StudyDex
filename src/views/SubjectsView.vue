<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useStudySelection } from '../composables/useStudySelection'
import { displayTitle } from '../utils/displayText'
import '../assets/selection-pages.css'

const route = useRoute()
const router = useRouter()
const { profile, catalogue, loading, error, load } = useStudySelection()
const flow = computed(() => (route.query.flow === 'quiz' ? 'quiz' : 'study'))
const asset = (name) => `${import.meta.env.BASE_URL}selection/${name}`
const lanes = computed(() => {
  const subjects = [...catalogue.value.subjects]
  if (!subjects.some((s) => /^english$/i.test(s.name.trim()))) {
    subjects.push({ id: 'english-coming-soon', name: 'English' })
  }
  subjects.sort(
    (a, b) => Number(!/^science$/i.test(a.name.trim())) - Number(!/^science$/i.test(b.name.trim())),
  )
  return subjects.map((subject) => ({
    ...subject,
    name: displayTitle(subject.name),
    enabled: catalogue.value.topics.some((topic) => topic.subject_id === subject.id),
    theme: /^science$/i.test(subject.name.trim())
      ? 'purple'
      : /math/i.test(subject.name)
        ? 'green'
        : 'gold',
    icon: /^science$/i.test(subject.name.trim())
      ? 'science'
      : /math/i.test(subject.name)
        ? 'mathematics'
        : 'english',
  }))
})
function selectSubject(item) {
  if (!item.enabled) return
  router.push({ name: 'selection-topics', query: { flow: flow.value, subject: item.id } })
}
</script>
<template>
  <main class="sd-picker" :style="{ '--page-art': `url(${asset('subjects-white.png')})` }">
    <nav class="sd-top-nav"><RouterLink to="/home">‹ Back to town</RouterLink></nav>
    <header class="sd-picker-heading">
      <p class="sd-eyebrow">STUDYDEX · {{ flow === 'quiz' ? 'POKÉ ARENA' : 'POKÉ LAB' }}</p>
      <h1>Choose your next adventure</h1>
      <p>What will you master today?</p>
    </header>
    <p v-if="loading" class="sd-page-state" role="status">Loading your subjects…</p>
    <div v-else-if="error" class="sd-page-state" role="alert">
      <p>{{ error }}</p>
      <button @click="load">Try again</button>
    </div>
    <div v-else-if="!profile?.school_level_id" class="sd-page-state">
      <p>Set your school level to see the right topics.</p>
      <RouterLink to="/account">Account settings</RouterLink>
    </div>
    <div v-else class="sd-paths">
      <button
        v-for="item in lanes"
        :key="item.id"
        class="sd-path"
        :class="`sd-path-${item.theme}`"
        :disabled="!item.enabled"
        @click="selectSubject(item)"
      >
        <span class="sd-orbit" aria-hidden="true"
          ><span class="sd-icon-disc"
            ><img :src="asset(`${item.icon}.svg`)" alt="" draggable="false" /></span
        ></span>
        <span class="sd-path-copy"
          ><strong>{{ item.name }}</strong
          ><small>{{
            item.enabled
              ? 'Explore topics'
              : item.id === 'english-coming-soon'
                ? 'Coming soon'
                : 'Not available for your level yet'
          }}</small></span
        >
        <span class="sd-path-arrow" aria-hidden="true">{{ item.enabled ? '›' : '⌑' }}</span>
      </button>
    </div>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useStudySelection } from '../composables/useStudySelection'
import { displayTitle } from '../utils/displayText'
import '../assets/selection-pages.css'

const route = useRoute()
const router = useRouter()
const { profile, catalogue, loading, error, load } = useStudySelection()
const flow = computed(() => (route.query.flow === 'quiz' ? 'quiz' : 'study'))
const asset = (name) => `${import.meta.env.BASE_URL}selection/${name}`
const search = ref('')
const subject = computed(() =>
  route.query.subject
    ? catalogue.value.subjects.find((item) => item.id === route.query.subject) || null
    : catalogue.value.subjects.find((item) => /^science$/i.test(item.name.trim())) || null,
)
const subjectName = computed(() => displayTitle(subject.value?.name) || 'Subject')
const topics = computed(() =>
  catalogue.value.topics.filter((topic) => topic.subject_id === subject.value?.id),
)
const shownTopics = computed(() =>
  topics.value.filter((topic) =>
    `${topic.name} ${topic.description || ''}`
      .toLowerCase()
      .includes(search.value.trim().toLowerCase()),
  ),
)
function selectTopic(item) {
  router.push({
    name: flow.value === 'quiz' ? 'quiz-battle' : 'study-mode',
    query: { subject: item.subject_id, topic_id: item.id },
  })
}
</script>
<template>
  <main
    class="sd-picker sd-topics"
    :style="{ '--page-art': `url(${asset('science-purple.png')})` }"
  >
    <nav class="sd-top-nav">
      <RouterLink to="/home">‹ Back to town</RouterLink
      ><RouterLink :to="{ name: 'selection-subjects', query: { flow } }">← All subjects</RouterLink>
    </nav>
    <header class="sd-picker-heading">
      <p class="sd-eyebrow">STUDYDEX · {{ subjectName.toUpperCase() }}</p>
      <h1>Your {{ subjectName }} adventure</h1>
      <p>Pick a topic. Make your next discovery.</p>
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
    <section v-else class="sd-topic-panel" :aria-label="`${subjectName} topics`">
      <div class="sd-topic-toolbar">
        <span class="sd-level"
          >{{ subjectName.toUpperCase() }} · {{ profile.school_level?.name }}</span
        ><span class="sd-count">{{ topics.length }} topics</span>
      </div>
      <label class="sd-search"
        ><span>Find a topic</span
        ><input v-model="search" type="search" :placeholder="`Search ${subjectName} topics…`"
      /></label>
      <div class="sd-topic-list">
        <button
          v-for="item in shownTopics"
          :key="item.id"
          class="sd-topic-card"
          @click="selectTopic(item)"
        >
          <span class="sd-topic-copy"
            ><small>{{ subjectName }}</small
            ><strong>{{ displayTitle(item.name) }}</strong
            ><span>{{ item.description }}</span
            ><em>{{
              flow === 'quiz' ? 'Preview questions →' : 'Choose Learn or Study →'
            }}</em></span
          >
          <span class="sd-topic-art" aria-hidden="true"
            ><span class="sd-topic-ring"
              ><img :src="asset('pokeball-purple.svg')" alt="" draggable="false" /><b>{{
                String(topics.findIndex((t) => t.id === item.id) + 1).padStart(2, '0')
              }}</b></span
            ><span class="sd-topic-chevron">›</span></span
          >
        </button>
      </div>
      <p v-if="!shownTopics.length" class="sd-empty">
        {{
          topics.length
            ? 'No matching topics. Try another search.'
            : `No ${subjectName} topics are available for your school level yet.`
        }}
      </p>
      <p v-if="flow === 'quiz'" class="sd-footnote">
        Question previews are not graded or saved. Scores and rewards are not available yet.
      </p>
    </section>
  </main>
</template>

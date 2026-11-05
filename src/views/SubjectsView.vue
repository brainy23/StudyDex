<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getCurrentProfile } from '../services/profileService'
import {
  getStudentStudyCatalogue,
  studyErrorMessage,
} from '../services/studyService'
import { getStudentQuizCatalogue } from '../services/quizPreviewService'
import { getSubjectTheme, isScienceSubject } from '../data/subjectThemes'
import LoadingScreen from '../components/common/LoadingScreen.vue'
import '../assets/selection-pages.css'

const route = useRoute()
const router = useRouter()

const flow = computed(() =>
  route.query.flow === 'quiz' ? 'quiz' : 'study',
)

const asset = name =>
  `${import.meta.env.BASE_URL}selection/${name}`

const profile = ref(null)
const catalogue = ref({ subjects: [], topics: [] })
const loading = ref(true)
const error = ref('')

let active = true
let requestId = 0

async function load() {
  const request = ++requestId
  const requestedFlow = flow.value

  loading.value = true
  error.value = ''
  profile.value = null
  catalogue.value = { subjects: [], topics: [] }

  try {
    const student = await getCurrentProfile()

    if (!active || request !== requestId) return

    profile.value = student

    if (student?.school_level_id) {
      const getCatalogue = requestedFlow === 'quiz'
        ? getStudentQuizCatalogue
        : getStudentStudyCatalogue

      const data = await getCatalogue(student)

      if (!active || request !== requestId) return

      catalogue.value = {
        subjects: data?.subjects ?? [],
        topics: data?.topics ?? [],
      }
    }
  } catch (cause) {
    if (active && request === requestId) {
      error.value = studyErrorMessage(cause, 'Your subjects')
    }
  } finally {
    if (active && request === requestId) {
      loading.value = false
    }
  }
}

onMounted(load)

onUnmounted(() => {
  active = false
  requestId++
})

watch(flow, () => {
  void load()
})

const lanes = computed(() =>
  catalogue.value.subjects.map(subject => {
    const topicCount = catalogue.value.topics.filter(
      topic => topic.subject_id === subject.id,
    ).length

    return {
      ...subject,
      topicCount,
      enabled: topicCount > 0,
      theme: getSubjectTheme(subject.name),
      icon: isScienceSubject(subject.name)
        ? 'science'
        : /math/i.test(subject.name)
          ? 'mathematics'
          : /^english$/i.test(subject.name)
            ? 'english'
            : 'study',
    }
  }),
)

function selectSubject(item) {
  if (loading.value || !item.enabled) return

  router.push({
    name: 'selection-topics',
    query: {
      flow: flow.value,
      subject: item.id,
    },
  })
}
</script>

<template>
  <LoadingScreen
    :show="loading"
    message="Loading your subjects…"
  />

  <main
    v-if="!loading"
    class="sd-picker"
    :style="{
      '--page-art': `url(${asset('subjects-white.png')})`,
    }"
  >
    <nav class="sd-top-nav">
      <RouterLink to="/home">
        ‹ Back to town
      </RouterLink>
    </nav>

    <header class="sd-picker-heading">
      <p class="sd-eyebrow">
        STUDYDEX · {{ flow === 'quiz' ? 'POKÉ ARENA' : 'POKÉ LAB' }}
      </p>
      <h1>Choose your next adventure</h1>
      <p>What will you master today?</p>
    </header>

    <div
      v-if="error"
      class="sd-page-state"
      role="alert"
    >
      <p>{{ error }}</p>
      <button type="button" @click="load">
        Try again
      </button>
    </div>

    <div
      v-else-if="!profile?.school_level_id"
      class="sd-page-state"
    >
      <p>Set your school level to see the right topics.</p>
      <RouterLink to="/account">
        Account settings
      </RouterLink>
    </div>

    <div v-else-if="lanes.length" class="sd-paths">
      <button
        v-for="item in lanes"
        :key="item.id"
        type="button"
        class="sd-path"
        :class="`sd-path-${item.theme}`"
        :disabled="!item.enabled"
        @click="selectSubject(item)"
      >
        <span class="sd-orbit" aria-hidden="true">
          <span class="sd-icon-disc">
            <img
              :src="asset(`${item.icon}.svg`)"
              alt=""
              draggable="false"
            />
          </span>
        </span>

        <span class="sd-path-copy">
          <strong>{{ item.name }}</strong>
          <small>
            {{
              item.enabled
                ? `${item.topicCount} topics available`
                : 'No topics for your level yet'
            }}
          </small>
        </span>

        <span class="sd-path-arrow" aria-hidden="true">
          {{ item.enabled ? '›' : '⌑' }}
        </span>
      </button>
    </div>

    <p v-else class="sd-empty">
      No subjects are available for your school level yet.
    </p>

    
  </main>
</template>

<style scoped>
.sd-picker .sd-path {
  min-height: 160px;
  padding: 28px 36px 28px 180px;
  gap: 24px;
}

.sd-path-copy {
  gap: 12px;
}

@media (max-width: 700px) {
  .sd-picker .sd-path {
    min-height: 140px;
    padding: 24px 20px 24px 130px;
    gap: 14px;
  }
}
</style>
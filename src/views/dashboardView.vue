<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'
import BackToHome from '../components/common/BackToHome.vue'
import PokeSprite from '@/components/pokebuddy/PokeSprite.vue'
import { pokemonUrl } from '@/lib/pokeapi'
import { getDashboardData } from '@/services/dashboardService'
import QuizReviewModal from '@/components/common/QuizReviewModal.vue'
import { getQuizReview } from '@/services/quizReviewService'
import { studyErrorMessage, resolveStudyImage } from '@/services/studyService'
import { getSupabase } from '@/lib/supabase'

const loading = ref(true)
const errorMessage = ref('')
const dashboard = ref(null)
const selectedSubjectId = ref('')
const selectedPeriod = ref('7')
const expandedTopic = ref(null)
const showAllProgress = ref(false)
const now = ref(new Date())
const reviewAttemptId = ref(null)
const quizReview = ref(null)
const reviewLoading = ref(false)
const reviewError = ref('')
let reviewRequest = 0
function closeQuizReview() {
  reviewRequest++
  reviewAttemptId.value = null
  quizReview.value = null
  reviewError.value = ''
  reviewLoading.value = false
}
async function openQuizReview(attemptId) {
  const userId = profile.value?.id
  if (!userId) return
  const request = ++reviewRequest
  reviewAttemptId.value = attemptId
  quizReview.value = null
  reviewError.value = ''
  reviewLoading.value = true
  try {
    const result = await getQuizReview(attemptId, userId)
    if (disposed || request !== reviewRequest || profile.value?.id !== userId) return
    quizReview.value = result
  } catch (error) {
    if (!disposed && request === reviewRequest && profile.value?.id === userId) {
      reviewError.value = studyErrorMessage(error, 'Your quiz review')
    }
  } finally {
    if (!disposed && request === reviewRequest) reviewLoading.value = false
  }
}
let requestId = 0
let disposed = false
let subscription
let clockInterval

// No user ID comes from the UI. The service resolves the authenticated profile.
async function loadDashboard() {
  closeQuizReview()
  const request = ++requestId
  loading.value = true
  errorMessage.value = ''
  dashboard.value = null
  expandedTopic.value = null
  showAllProgress.value = false
  try {
    const result = await getDashboardData()
    if (disposed || request !== requestId) return
    dashboard.value = result
    const options = result.catalogue?.data?.subjects ?? []
    if (!options.some(subject => subject.id === selectedSubjectId.value)) {
      selectedSubjectId.value = options[0]?.id ?? ''
    }
  } catch (error) {
    if (!disposed && request === requestId) {
      errorMessage.value = studyErrorMessage(error, 'Your dashboard')
    }
  } finally {
    if (!disposed && request === requestId) loading.value = false
  }
}
const readable = section => ['ready', 'empty'].includes(section?.status)
const capitalizedName = name => {
  const text = String(name ?? '').trim()
  return text.charAt(0).toUpperCase() + text.slice(1)
}
const profile = computed(() => dashboard.value?.profile)
const catalogue = computed(() => dashboard.value?.catalogue)
const subjects = computed(() => (catalogue.value?.data?.subjects ?? [])
  .map(subject => ({ ...subject, name: capitalizedName(subject.name) })))
const topics = computed(() => (catalogue.value?.data?.topics ?? [])
  .map(topic => ({ ...topic, name: capitalizedName(topic.name) })))
const subject = computed(() => subjects.value.find(item => item.id === selectedSubjectId.value))
const quizSection = computed(() => dashboard.value?.quizAttempts)
const sessionSection = computed(() => dashboard.value?.studySessions)
const blockSection = computed(() => dashboard.value?.pomodoroBlocks)
const quizAvailable = computed(() => readable(quizSection.value))
const sessionsAvailable = computed(() => readable(sessionSection.value))
const blocksAvailable = computed(() => readable(blockSection.value) && sessionsAvailable.value)
const attempts = computed(() => quizAvailable.value ? quizSection.value.data ?? [] : [])
const sessions = computed(() => sessionsAvailable.value ? sessionSection.value.data ?? [] : [])
const completedSessions = computed(() => sessions.value.flatMap(row => {
  if (row.status === 'completed' && row.completed_at) return [row]
  const dates = blocks.value.filter(block => block.session_id === row.id && block.focus_completed_at).map(block => block.focus_completed_at).sort()
  return dates.length ? [{ ...row, completed_at: dates.at(-1) }] : []
}))
const blocks = computed(() => blocksAvailable.value ? blockSection.value.data ?? [] : [])
const buddySection = computed(() => dashboard.value?.buddy)
const buddy = computed(() => buddySection.value?.data)
const animatedBuddySprite = ref('')
const pokemonSpriteCache = new Map()
watch(
  () => buddy.value?.pokemon?.name,
  async (name, _, onCleanup) => {
    let cancelled = false
    const controller = new AbortController()
    onCleanup(() => {
      cancelled = true
      controller.abort()
    })

    animatedBuddySprite.value = ''
    if (!name) return

    const cachedSprite = pokemonSpriteCache.get(name)
    if (cachedSprite) {
      animatedBuddySprite.value = cachedSprite
      return
    }

    try {
      const response = await fetch(pokemonUrl(name), { signal: controller.signal })
      if (!response.ok) throw new Error('PokéAPI sprite request failed.')
      const data = await response.json()
      const sprite = data.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default
      if (cancelled || !sprite) return
      pokemonSpriteCache.set(name, sprite)
      animatedBuddySprite.value = sprite
    } catch (error) {
      if (!cancelled && error.name !== 'AbortError') {
        console.warn('Animated Pokémon sprite unavailable; using saved sprite.', error)
      }
    }
  },
  { immediate: true },
)
const activeBuddy = computed(() => {
  if (!buddy.value?.pokemon) return null
  const sprite = resolveStudyImage(buddy.value.pokemon.sprite_url)
  return {
    ownedId: buddy.value.id,
    name: buddy.value.pokemon.name,
    level: buddy.value.level,
    xp: buddy.value.xp,
    evolution_stage: 0,
    isDefeated: false,
    animated_img: animatedBuddySprite.value || sprite,
    static_img: sprite,
  }
})
watch(selectedSubjectId, () => { expandedTopic.value = null })

function percentage(attempt) {
  return attempt && attempt.total_questions > 0
    ? Math.round(attempt.score / attempt.total_questions * 100) : null
}
function formatDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  return new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value))
}
function dayKey(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value))
  const date = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${date.year}-${date.month}-${date.day}`
}
function shiftDay(day, offset) {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
const regularAttempts = computed(() => attempts.value.filter(row => row.attempt_type === 'quiz'))
const topicProgress = computed(() => topics.value
  .filter(topic => topic.subject_id === selectedSubjectId.value && topic.level_id === profile.value?.school_level_id)
  .map(topic => {
    const history = regularAttempts.value.filter(row => row.topic_id === topic.id)
      .sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at) || a.id.localeCompare(b.id))
    const score = percentage(history[0])
    return { ...topic, attempts: history, score,
      color: !quizAvailable.value || score === null ? 'grey' : score >= 80 ? 'green' : 'yellow',
      status: !quizAvailable.value ? 'Unavailable' : score === null ? 'Not started' : score >= 80 ? 'Completed' : 'In progress' }
  }))
const completedTopics = computed(() => topicProgress.value.filter(topic => topic.score !== null && topic.score >= 80).length)
const completionPercent = computed(() => topicProgress.value.length ? Math.round(completedTopics.value / topicProgress.value.length * 100) : 0)
const nextChallenge = computed(() => {
  if (!quizAvailable.value) return null
  const priority = topic => topic.score === null ? 1 : topic.score < 80 ? 0 : 2
  return [...topicProgress.value].sort((a, b) => priority(a) - priority(b) || (a.score ?? 0) - (b.score ?? 0))[0]
})
const studyLink = topic => ({ name: 'study-mode', query: { subject: topic.subject_id, topic: topic.id } })
const quizLink = topic => ({ name: 'quiz', query: { subject: topic.subject_id, topic: topic.id } })
const quizXP = computed(() => attempts.value.reduce((sum, row) => sum + row.xp_change, 0))
const studyXP = computed(() => sessions.value.reduce((sum, row) => sum + (row.xp_change || 0), 0) + blocks.value.filter(row => row.xp_awarded_at).reduce((sum, row) => sum + row.xp_earned, 0))
const average = computed(() => regularAttempts.value.length ? Math.round(regularAttempts.value.reduce((sum, row) => sum + percentage(row), 0) / regularAttempts.value.length) : null)
const stats = computed(() => [
  { title: 'Total earned XP', value: quizAvailable.value && blocksAvailable.value ? quizXP.value + studyXP.value : '—', description: 'Quiz XP and recorded study XP', color: 'yellow', icon: '⭐' },
  { title: 'Study sessions', value: sessionsAvailable.value ? completedSessions.value.length : '—', description: 'Completed sessions', color: 'blue', icon: '📚' },
  { title: 'Quiz average', value: quizAvailable.value && average.value !== null ? `${average.value}%` : '—', description: quizAvailable.value && !regularAttempts.value.length ? 'No quizzes completed yet' : 'Regular quizzes only', color: 'pink', icon: '🎯' },
])
const notices = computed(() => [quizSection.value, sessionSection.value, blockSection.value].filter(section => section && !readable(section)))
const chartDays = computed(() => Array.from({ length: Number(selectedPeriod.value) }, (_, index) => shiftDay(dayKey(now.value), index - Number(selectedPeriod.value) + 1)))
// Attribute recorded focus/break durations to their respective completion dates.
// Never infer active study time from elapsed session wall-clock time.
const chartSeries = computed(() => [
  { name: 'Focus', data: chartDays.value.map(day => blocks.value.filter(row => row.focus_completed_at && dayKey(row.focus_completed_at) === day).reduce((sum, row) => sum + row.focus_seconds, 0) / 60) },
  { name: 'Break', data: chartDays.value.map(day => blocks.value.filter(row => row.break_completed_at && dayKey(row.break_completed_at) === day).reduce((sum, row) => sum + row.break_seconds, 0) / 60) },
])
const minutesInPeriod = computed(() => Math.round(chartSeries.value.reduce((total, series) => total + series.data.reduce((sum, minutes) => sum + minutes, 0), 0)))
const chartOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Fredoka, sans-serif', stacked: true },
  colors: ['#78ba83', '#f1c85a'], dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 }, fill: { opacity: 0.25, type: 'solid' },
  xaxis: { categories: chartDays.value, labels: { style: { fontSize: '14px' }, formatter: value => value?.slice(5) } },
  yaxis: { min: 0, labels: { style: { fontSize: '14px' }, formatter: value => Math.round(value) }, title: { text: 'Minutes' } },
  legend: { fontSize: '14px' }, tooltip: { y: { formatter: value => `${Math.round(value)} min` } },
}))
const history = computed(() => {
  const topicName = id => topics.value.find(topic => topic.id === id)?.name ?? 'Topic unavailable'
  return [
    ...attempts.value.map(row => ({ id: `quiz-${row.id}`, attemptId: row.attempt_type === 'quiz' ? row.id : null, title: topicName(row.topic_id), type: row.attempt_type === 'boss_battle' ? 'Boss battle' : 'Quiz', badge: 'quiz', score: percentage(row), xp: row.xp_change, date: row.completed_at })),
    ...completedSessions.value.map(row => ({ id: `session-${row.id}`, title: row.topic_id ? topicName(row.topic_id) : 'General study', type: row.mode === 'learn' ? 'Learn' : 'Study', badge: 'study', score: null, xp: blocksAvailable.value ? (row.xp_change || 0) + blocks.value.filter(block => block.session_id === row.id && block.xp_awarded_at).reduce((sum, block) => sum + block.xp_earned, 0) : null, date: row.completed_at })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id))
})
const visibleHistory = computed(() => showAllProgress.value ? history.value : history.value.slice(0, 5))
const signed = value => value === null ? '—' : `${value >= 0 ? '+' : ''}${value}`
onMounted(() => {
  loadDashboard()
  window.addEventListener('focus', loadDashboard)
  window.addEventListener('studydex:activity', loadDashboard)
  clockInterval = setInterval(() => { now.value = new Date() }, 60000)
  try {
    // Defer service calls outside the Supabase auth callback.
    subscription = getSupabase().auth.onAuthStateChange(event => {
      if (['SIGNED_OUT', 'SIGNED_IN', 'USER_UPDATED'].includes(event)) {
        closeQuizReview()
        requestId++
        dashboard.value = null
        loading.value = true
        setTimeout(() => { if (!disposed) loadDashboard() }, 0)
      }
    }).data.subscription
  } catch { /* loadDashboard reports unavailable authentication. */ }
})
onUnmounted(() => {
  disposed = true
  closeQuizReview()
  requestId++
  subscription?.unsubscribe()
  clearInterval(clockInterval)
  window.removeEventListener('focus', loadDashboard)
  window.removeEventListener('studydex:activity', loadDashboard)
})
</script>

<template>
  <QuizReviewModal v-if="reviewAttemptId" :review="quizReview" :loading="reviewLoading" :error="reviewError"
    @close="closeQuizReview" @retry="openQuizReview(reviewAttemptId)" />
  <main class="trainer-dashboard student-dashboard">
    <div class="dashboard-shell">
      <div v-if="loading" class="dashboard-panel" role="status" aria-live="polite">Loading your dashboard…</div>
      <div v-else-if="errorMessage" class="dashboard-panel" role="alert">
        <p>{{ errorMessage }}</p>
        <button class="button button-primary" @click="loadDashboard">Try again</button>
        <RouterLink class="button button-secondary" to="/login">Log in</RouterLink>
      </div>
      <template v-else-if="dashboard">
        <header class="dashboard-header">
          <div class="header-main welcome-copy">
            <BackToHome variant="custom" class="back-button" />
            <span class="eyebrow">YOUR TRAINER JOURNEY</span>
            <div class="welcome-title-row"><h1>Hello, {{ profile.display_name }}!</h1><span v-if="profile.school_level" class="level-badge">{{ profile.school_level.name }}</span></div>
            <p class="welcome-message">Small steps today. Bigger wins tomorrow.</p>
            <button class="button button-secondary refresh-button" @click="loadDashboard">Refresh progress</button>
          </div>
          <div class="dashboard-buddy">
            <h3 class="town-buddy-heading">Your Town Buddy Progress</h3>
            <PokeSprite v-if="activeBuddy" :key="activeBuddy.ownedId" class="dashboard-pokemon-buddy"
              :active-pokemon="activeBuddy" :fallback-src="activeBuddy.static_img" embedded progress-position="right" />
            <p v-else :role="buddySection?.status === 'error' ? 'alert' : 'status'">{{ buddySection?.message }}</p>
          </div>
        </header>
        <div v-if="notices.length" class="data-notices" role="status">
          <p v-for="notice in notices" :key="notice.message">{{ notice.message }}</p>
          <small>Unavailable figures are shown as —, not zero.</small>
        </div>
        <section class="stats-grid" aria-label="Your learning statistics">
          <article v-for="stat in stats" :key="stat.title" class="stat-card" :class="`stat-${stat.color}`">
            <div class="stat-top"><span class="stat-label">{{ stat.title }}</span><span class="stat-icon" aria-hidden="true">{{ stat.icon }}</span></div>
            <strong class="stat-value">{{ stat.value }}</strong><p class="stat-description">{{ stat.description }}</p>
          </article>
        </section>
        <div class="main-grid">
          <section class="dashboard-panel topic-panel" aria-labelledby="subject-progress-title">
            <div class="panel-heading"><div class="topic-heading-main"><div class="topic-heading-copy"><span class="eyebrow">EXPLORE · PRACTISE · COMPLETE</span><h2 id="subject-progress-title">{{ subject?.name || 'Subject' }} Topic Progress</h2><p>Reach 80% in your latest quiz to complete a topic.</p></div><div v-if="readable(catalogue) && subjects.length" class="subject-picker">
              <label for="progress-subject">Subject</label>
              <select id="progress-subject" v-model="selectedSubjectId"><option v-for="option in subjects" :key="option.id" :value="option.id">{{ option.name }}</option></select>
            </div></div></div>
            <p v-if="!readable(catalogue)" role="status">{{ catalogue?.message }}</p>
            <template v-else>
              <div v-if="quizAvailable && topicProgress.length" class="completion-summary"><div class="completion-heading"><div><strong>{{ completedTopics }}</strong><span>of {{ topicProgress.length }} topics completed</span></div><span>{{ completionPercent }}%</span></div><div class="completion-track" role="progressbar" aria-label="Topics completed" :aria-valuenow="completedTopics" :aria-valuemax="topicProgress.length" aria-valuemin="0"><div class="completion-fill" :style="{ width: `${completionPercent}%` }"></div></div></div>
              <p v-else-if="!quizAvailable" class="section-notice">{{ quizSection?.message }}</p>
              <aside v-if="nextChallenge" class="next-challenge"><span class="challenge-icon" aria-hidden="true">💡</span><div class="challenge-copy"><span class="eyebrow">YOUR NEXT CHALLENGE</span><h3>{{ nextChallenge.name }}</h3><p>{{ nextChallenge.score === null ? 'Give this topic your first try!' : `Your latest score is ${nextChallenge.score}%. Keep practising!` }}</p></div><RouterLink :to="quizLink(nextChallenge)" class="button button-primary">Open Quiz Arena →</RouterLink></aside>
              <p v-if="!topicProgress.length" class="simple-empty">No topics are available{{ subject ? ` for ${subject.name}` : '' }} at your school level.</p>
              <div class="topic-list">
                <article v-for="topic in topicProgress" :key="topic.id" class="topic-item" :class="`topic-${topic.color}`">
                  <button class="topic-toggle" :aria-expanded="expandedTopic === topic.id" :aria-controls="`topic-${topic.id}`" @click="expandedTopic = expandedTopic === topic.id ? null : topic.id"><span class="topic-icon" aria-hidden="true">📖</span><span class="topic-name">{{ topic.name }}</span><span class="topic-status">{{ topic.status }}</span><span class="topic-score">{{ topic.score === null ? '—' : `${topic.score}%` }}</span><span class="topic-chevron">{{ expandedTopic === topic.id ? '−' : '+' }}</span></button>
                  <RouterLink :to="studyLink(topic)" class="button button-secondary topic-study-link" :aria-label="`Go to topic: ${topic.name}`">Go to topic →</RouterLink>
                  <div v-if="expandedTopic === topic.id" :id="`topic-${topic.id}`" class="topic-details"><div class="topic-detail-heading"><h3>Your quiz attempts</h3><RouterLink :to="quizLink(topic)" class="button button-secondary">Open Quiz Arena →</RouterLink></div><p v-if="!quizAvailable">{{ quizSection?.message }}</p><p v-else-if="!topic.attempts.length">No quiz attempts yet.</p><ul v-else class="attempt-list"><li v-for="attempt in topic.attempts" :key="attempt.id" class="attempt-row"><strong>{{ percentage(attempt) }}% · {{ attempt.score }}/{{ attempt.total_questions }}</strong><span class="attempt-date">{{ formatDate(attempt.completed_at) }}</span><span class="attempt-xp">{{ signed(attempt.xp_change) }} XP</span><button type="button" class="review-link" :aria-label="`Review ${topic.name} quiz completed ${formatDate(attempt.completed_at)}`" @click="openQuizReview(attempt.id)">Review answers</button></li></ul></div>
                </article>
              </div>
            </template>
          </section>
          <section class="dashboard-panel activity-panel" aria-labelledby="activity-title">
            <div class="panel-heading"><div><span class="eyebrow">BUILD YOUR STUDY HABIT</span><h2 id="activity-title">🎯 Learning Activity</h2><p>Recorded focus and break time.</p></div><select v-model="selectedPeriod" class="period-select" aria-label="Activity date range"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div>
            <p v-if="!blocksAvailable" role="status">{{ !sessionsAvailable ? sessionSection?.message : blockSection?.message }}</p>
            <template v-else-if="minutesInPeriod > 0"><div class="activity-total"><strong>{{ minutesInPeriod }}</strong><span>minutes in the last {{ selectedPeriod }} days</span></div><div class="activity-chart"><VueApexCharts type="area" height="260" width="100%" :options="chartOptions" :series="chartSeries" /></div><p class="chart-note">Completed focus and break intervals · Singapore time.</p></template>
            <div v-else class="activity-empty"><span class="empty-icon">🌱</span><h3>Ready for your next study session?</h3><p>No recorded completed intervals in this date range.</p><RouterLink to="/study-decks" class="button button-primary">Explore study decks →</RouterLink></div>
          </section>
        </div>
        <section class="dashboard-panel history-panel" aria-labelledby="history-title">
          <div class="panel-heading"><div><span class="eyebrow">EVERY STEP COUNTS</span><h2 id="history-title">📋 Recent Progress</h2><p>Your completed study sessions, quizzes and boss battles.</p></div><button v-if="history.length > 5" class="button button-secondary" :aria-expanded="showAllProgress" @click="showAllProgress = !showAllProgress">{{ showAllProgress ? 'Show recent 5' : 'View all activity' }}</button></div>
          <p v-if="!quizAvailable || !sessionsAvailable" class="section-notice">Some activity is unavailable. Only successfully loaded records are shown.</p>
          <div v-if="visibleHistory.length" class="history-table-wrap" tabindex="0" aria-label="Recent activity table, scrollable"><table class="progress-table"><thead><tr><th scope="col">Topic / Activity</th><th scope="col">Type</th><th scope="col">Score</th><th scope="col">XP</th><th scope="col">Completed · SGT</th></tr></thead><tbody><tr v-for="item in visibleHistory" :key="item.id"><td><button v-if="item.attemptId" type="button" class="review-link" :aria-label="`Review ${item.title} quiz completed ${formatDate(item.date)}`" @click="openQuizReview(item.attemptId)">{{ item.title }} · Review answers</button><template v-else>{{ item.title }}</template></td><td><span class="type-badge" :class="item.badge">{{ item.type }}</span></td><td>{{ item.score === null ? '—' : `${item.score}%` }}</td><td class="history-xp" :class="{ 'xp-negative': item.xp < 0 }">{{ signed(item.xp) }}</td><td class="history-date">{{ formatDate(item.date) }}</td></tr></tbody></table></div>
          <p v-else-if="quizAvailable && sessionsAvailable" class="simple-empty">No completed activity yet. Your first achievement will appear here.</p>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.review-link { border: 0; background: none; padding: 4px 0; color: #285d94; font: inherit; text-align: left; text-decoration: underline; cursor: pointer; }
/* BASE */
.trainer-dashboard,
.trainer-dashboard * {
  box-sizing: border-box;
}

.trainer-dashboard {
  min-height: 100dvh;
  width: 100%;
  padding: 24px;
  background: #fcfaf3;
  color: #172c50;
  font-family: 'Fredoka', sans-serif;
  font-size: 16px;
  line-height: 1.5;
}

.dashboard-shell {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

button,
select {
  font-family: inherit;
  font-size: 16px;
}

button,
a,
select,
summary {
  -webkit-tap-highlight-color: transparent;
}

button:focus-visible,
a:focus-visible,
select:focus-visible,
summary:focus-visible,
.history-table-wrap:focus-visible {
  outline: 3px solid #416d9d;
  outline-offset: 3px;
}

.eyebrow {
  display: block;
  margin-bottom: 7px;
  color: #7a806e;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
}

/* HEADER */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 20px 26px;
  border: 1px solid #e9edcf;
  border-radius: 22px;
  background: linear-gradient(
    110deg,
    #fff9e8 25%,
    #edf7e5 100%
  );
}

.header-main {
  min-width: 0;
}

.back-button {
  position: static;
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  margin-bottom: 14px;
  padding: 8px 12px;
  border: 1px solid #e4cf87;
  border-radius: 8px;
  background: #fff4c9;
  color: #715823;
  font-size: 16px;
  text-decoration: none;
}

.welcome-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.welcome-copy h1 {
  margin: 0;
  color: #142c55;
  font-size: clamp(28px, 2.5vw, 36px);
  font-weight: 750;
  line-height: 1.25;
}

.welcome-message {
  margin: 6px 0 0;
  color: #61718a;
  font-size: 16px;
}

.last-login {
  margin: 6px 0 0;
  color: #7b8492;
  font-size: 14px;
}

.study-note {
  margin: 8px 0 0;
  color: #7b8492;
  font-size: 14px;
  line-height: 1.5;
}

/* DEMO CONTROLS */
.demo-panel {
  margin: 10px 0 18px;
  color: #6c7685;
  font-size: 16px;
}

.demo-panel summary {
  display: list-item;
  width: fit-content;
  padding: 8px 2px;
  cursor: pointer;
}

.demo-label {
  margin-left: 10px;
  color: #9298a0;
  font-size: 14px;
}

.demo-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  padding: 12px 14px;
  border: 1px dashed #ddd7c3;
  border-radius: 12px;
  background: #fffdf6;
}

.demo-controls select {
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid #ddd6bb;
  border-radius: 8px;
  background: white;
  color: #263955;
  font-size: 16px;
}

.demo-controls small {
  color: #7c8591;
  font-size: 14px;
}

.demo-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* STATISTICS */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 22px;
}

.stat-card {
  min-width: 0;
  padding: 18px;
  border: 1px solid #ffffff;
  border-radius: 17px;
  box-shadow: 0 3px 12px #23335406;
}

.stat-yellow {
  background: #fff5d8;
}

.stat-blue {
  background: #eaf5fc;
}

.stat-pink {
  background: #fff0ef;
}

.stat-purple {
  background: #f1edfc;
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.stat-label {
  color: #526078;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
}

.stat-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #ffffff80;
  font-size: 22px;
}

.stat-value {
  display: block;
  color: #172c50;
  font-size: 36px;
  font-weight: 750;
  line-height: 1.2;
}

.stat-description {
  margin: 7px 0 0;
  color: #6e7888;
  font-size: 14px;
  line-height: 1.5;
}

/* MAIN PANELS */
.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 22px;
  margin-bottom: 22px;
}

/* Keep the two desktop panels the same height. */
@media (min-width: 1200px) {
  .main-grid {
    align-items: stretch;
  }

  .topic-panel {
    contain: size;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #ddd7c7 transparent;
  }

  .topic-panel > * {
    flex-shrink: 0;
  }
}

.dashboard-panel {
  min-width: 0;
  padding: 24px;
  border: 1px solid #eae7db;
  border-radius: 20px;
  background: white;
  box-shadow: 0 4px 20px #23335404;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 20px;
}

.panel-heading > div {
  min-width: 0;
  flex: 1 1 220px;
}

.panel-heading h2 {
  margin: 0;
  color: #172c50;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
}

.panel-heading p {
  margin: 7px 0 0;
  color: #7b8494;
  font-size: 16px;
  line-height: 1.5;
}

.level-badge {
  flex-shrink: 0;
  padding: 6px 9px;
  border-radius: 8px;
  background: #f2f5ed;
  color: #63734c;
  font-size: 14px;
  white-space: nowrap;
}

/* SUBJECT TOGGLE */
.subject-toggle {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 18px;
  padding: 5px;
  border-radius: 14px;
  background: #f0f2ed;
}

.subject-toggle button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 120px;
  gap: 8px;
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: #526070;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.subject-toggle button:hover {
  background: #fff8df;
}

.subject-toggle button.is-active {
  background: #ffde59;
  border-color: #dfbf45;
  color: #172c50;
}

.subject-toggle button:focus-visible {
  outline: 3px solid #6489ed;
  outline-offset: 2px;
}

/* TOPIC COMPLETION SUMMARY */
.completion-summary {
  margin-bottom: 18px;
  padding: 14px 16px;
  border: 1px solid #edf0e4;
  border-radius: 12px;
  background: #f8faf3;
}

.completion-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.completion-heading > div {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
}

.completion-heading strong {
  font-size: 28px;
  font-weight: 700;
  color: #315e42;
}

.completion-heading span {
  color: #697760;
  font-size: 16px;
}

.completion-percentage {
  flex-shrink: 0;
  font-weight: 600;
}

.completion-track {
  height: 9px;
  border-radius: 10px;
  background: #e5e9df;
  overflow: hidden;
}

.completion-fill {
  height: 100%;
  border-radius: inherit;
  background: #78ba83;
}

/* EXPANDABLE TOPICS */
.topic-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.topic-item {
  border: 1px solid #e5e8ee;
  border-radius: 12px;
  background: #f6f7fa;
}

.topic-green {
  border-color: #dcecdf;
  background: #f4faf4;
}

.topic-yellow {
  border-color: #eee5cb;
  background: #fffbf1;
}

.topic-item > .topic-study-link {
  display: flex;
  width: fit-content;
  margin: 0 12px 12px auto;
}

.topic-toggle {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto 52px 18px;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 76px;
  padding: 14px 12px;
  border: 0;
  border-radius: inherit;
  background: transparent;
  color: #263955;
  text-align: left;
  cursor: pointer;
}

.topic-toggle:hover {
  background: #ffffff70;
}

.topic-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #ffffffa6;
  font-size: 23px;
}

.topic-name {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.topic-status {
  padding: 4px 7px;
  border-radius: 6px;
  background: #e9ecf1;
  color: #747e8c;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.topic-green .topic-status {
  background: #e2f1e5;
  color: #4b7b55;
}

.topic-yellow .topic-status {
  background: #fff0c5;
  color: #8b712b;
}

.topic-score {
  font-size: 18px;
  font-weight: 650;
  text-align: right;
}

.topic-grey .topic-score {
  color: #929aa6;
}

.topic-chevron {
  color: #8c96a6;
  font-size: 22px;
  text-align: center;
}

.topic-details {
  padding: 0 14px 14px;
}

.topic-detail-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid #dfe5de;
}

.topic-detail-heading h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.topic-detail-heading p {
  margin: 5px 0 0;
  color: #747e8b;
  font-size: 14px;
  line-height: 1.5;
}

.attempt-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.attempt-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-top: 1px solid #e1e6df;
  font-size: 14px;
}

.attempt-result {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.attempt-result strong {
  font-size: 16px;
}

.attempt-result > span,
.attempt-date {
  color: #788290;
}

.attempt-xp {
  color: #536a51;
  font-weight: 500;
  white-space: nowrap;
}

/* NEXT CHALLENGE */
.next-challenge {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 5px;
  margin-bottom: 15px;
  padding: 16px;
  border: 1px solid #f0dfa5;
  border-radius: 13px;
  background: #fff8df;
}

.challenge-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: #ffedaf;
  font-size: 24px;
}

.challenge-copy {
  flex: 1 1 170px;
  min-width: 0;
}

.challenge-copy .eyebrow {
  margin-bottom: 5px;
  color: #9a8247;
  font-size: 14px;
}

.challenge-copy h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  line-height: 1.35;
}

.challenge-copy p {
  margin: 5px 0 0;
  color: #847650;
  font-size: 16px;
  line-height: 1.5;
}

/* ACTIVITY CHART / EMPTY STATE */
.period-select {
  flex-shrink: 0;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid #e1e5ed;
  border-radius: 8px;
  background: white;
  color: #45546d;
  font-size: 16px;
}

.activity-total {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}

.activity-total strong {
  color: #263955;
  font-size: 36px;
  font-weight: 650;
}

.activity-total span {
  color: #8590a0;
  font-size: 16px;
}

.activity-chart {
  min-width: 0;
  width: 100%;
  height: 260px;
}

.chart-note {
  margin: 8px 0 0;
  color: #9299a5;
  font-size: 14px;
}

.activity-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 16px 24px;
  text-align: center;
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 70px;
  height: 70px;
  margin-bottom: 18px;
  border-radius: 23px;
  background: #f0f6e9;
  font-size: 36px;
}

.activity-empty h3 {
  max-width: 320px;
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
}

.activity-empty p {
  max-width: 320px;
  margin: 11px 0 20px;
  color: #7e8998;
  font-size: 16px;
  line-height: 1.7;
}

.activity-empty small {
  margin-top: 13px;
  color: #90998a;
  font-size: 14px;
}

/* BUTTONS */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid transparent;
  border-radius: 9px;
  font-family: inherit;
  font-size: 16px;
  font-weight: 550;
  line-height: 1.4;
  text-decoration: none;
  text-align: center;
  cursor: pointer;
}

.button-primary {
  border-color: #e6c653;
  background: #ffdf73;
  color: #634f1f;
}

.button-primary:hover {
  background: #ffd550;
  color: #634f1f;
}

.button-secondary {
  border-color: #dde3ec;
  background: white;
  color: #54657f;
}

.button-secondary:hover {
  background: #f5f7fa;
  color: #314b70;
}

/* RECENT PROGRESS */
.history-panel {
  margin-bottom: 12px;
}

.history-table-wrap {
  max-height: 420px;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #ddd7c7 transparent;
}

.progress-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 16px;
}

.progress-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px 14px;
  background: #f6f7f9;
  color: #8590a0;
  font-size: 14px;
  font-weight: 550;
  text-align: left;
  white-space: nowrap;
}

.progress-table td {
  padding: 15px 14px;
  border-bottom: 1px solid #eef0f4;
  vertical-align: middle;
  white-space: nowrap;
}

.progress-table tbody tr:last-child td {
  border-bottom: 0;
}

.progress-table tbody tr:hover {
  background: #fffdf5;
}

.history-topic {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.history-topic > span {
  font-size: 22px;
}

.type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.type-badge.study {
  background: #fff1c2;
  color: #8a742d;
}

.type-badge.quiz {
  background: #f2eafb;
  color: #8965a7;
}

.history-xp {
  color: #5e8d63;
  font-weight: 550;
}

.history-xp.xp-negative {
  color: #ad6a62;
}

.history-date {
  color: #87909c;
  font-size: 14px;
}

.history-empty {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 8px;
}

.history-empty > span {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: #fff7dd;
  font-size: 27px;
}

.history-empty h3 {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
}

.history-empty p,
.simple-empty {
  margin: 0;
  color: #87909c;
  font-size: 16px;
  line-height: 1.6;
}

/* TOWN BUDDY */
.dashboard-buddy {
  flex: 0 1 340px;
  width: 340px;
  min-width: 0;
  color: #26365b;
}

.town-buddy-heading {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #ffde59;
  font-family: 'Luckiest Guy', cursive;
  font-size: 22px;
  line-height: 1.4;
  text-align: center;
}

.dashboard-pokemon-buddy {
  height: auto;
  padding: 0;
  gap: 6px;
}

.dashboard-pokemon-buddy :deep(.buddy-stage) {
  height: 110px;
  min-height: 0;
  flex: none;
}

.dashboard-pokemon-buddy :deep(.buddy-sprite) {
  width: auto;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

.dashboard-pokemon-buddy :deep(h3) {
  display: none;
}

/* RESPONSIVE LAYOUT */
@media (max-width: 1199px) {
  .trainer-dashboard {
    padding: 18px;
  }

  .main-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .activity-empty {
    padding: 24px 16px;
  }
}

@media (max-width: 800px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .dashboard-panel {
    padding: 20px;
  }
}

@media (max-width: 700px) {
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard-buddy {
    flex: none;
    width: 100%;
    max-width: 340px;
    align-self: center;
  }
}

@media (max-width: 600px) {
  .trainer-dashboard {
    padding: 12px;
  }

  .dashboard-header {
    padding: 18px;
    border-radius: 17px;
  }

  .welcome-copy .eyebrow {
    font-size: 14px;
  }

  .stat-card {
    padding: 14px;
  }

  .stat-value {
    font-size: 32px;
  }

  .stat-description {
    font-size: 14px;
  }

  .dashboard-panel {
    padding: 16px;
    border-radius: 16px;
  }

  .panel-heading {
    gap: 10px;
  }

  .panel-heading h2 {
    font-size: 22px;
  }

  .panel-heading p {
    font-size: 16px;
  }

  .level-badge {
    font-size: 14px;
  }

  .topic-toggle {
    grid-template-columns: 30px minmax(0, 1fr) 50px 16px;
    gap: 8px;
    padding: 12px 10px;
  }

  .topic-icon {
    grid-column: 1;
    grid-row: 1 / 3;
    width: 30px;
    height: 30px;
    font-size: 22px;
  }

  .topic-name {
    grid-column: 2;
    grid-row: 1;
    font-size: 16px;
  }

  .topic-status {
    grid-column: 2;
    grid-row: 2;
    justify-self: start;
    max-width: 100%;
    font-size: 14px;
    white-space: normal;
  }

  .topic-score {
    grid-column: 3;
    grid-row: 1 / 3;
    font-size: 17px;
  }

  .topic-chevron {
    grid-column: 4;
    grid-row: 1 / 3;
  }

  .attempt-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 5px 10px;
  }

  .attempt-row .review-link {
    grid-column: 1 / -1;
    grid-row: 3;
  }

  .attempt-date {
    grid-column: 1;
    grid-row: 2;
    font-size: 14px;
  }

  .attempt-xp {
    grid-column: 2;
    grid-row: 1 / 3;
  }

  .next-challenge {
    padding: 14px;
  }

  .next-challenge > .button {
    width: 100%;
  }

  .history-empty {
    align-items: flex-start;
    gap: 12px;
  }

  .history-empty h3 {
    font-size: 20px;
  }

  .history-empty p {
    font-size: 16px;
  }
}

.dashboard-header { margin-bottom: 22px; }
.refresh-button { margin-top: 14px; }
.topic-heading-main { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; }
.topic-heading-copy { flex: 1 1 250px; min-width: 0; }
.subject-picker { display: flex; flex: 0 1 250px; flex-wrap: wrap; align-items: center; gap: 12px; margin: 0; }
.subject-picker label { font-size: 16px; font-weight: 600; }
.subject-picker select { flex: 1; min-width: 0; min-height: 44px; padding: 8px 12px; border: 1px solid #dde3ec; border-radius: 10px; background: white; color: #172c50; font: inherit; }
.data-notices, .section-notice { padding: 14px 16px; border-radius: 12px; background: #fff8df; color: #715823; margin-bottom: 18px; }
.data-notices p { margin: 0 0 6px; }

</style>

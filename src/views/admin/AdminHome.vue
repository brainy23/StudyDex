<script setup>
import '@/assets/admincommon.css'
import AdminNav from '@/components/common/adminNav.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

// =========================================
// DATE HELPERS — SINGAPORE TIME
// =========================================

const TIME_ZONE = 'Asia/Singapore'
const DAY_MS = 24 * 60 * 60 * 1000
const SESSION_XP = 15

const currentTime = ref(new Date())
let clockInterval

function dayKey(value) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(value))

  const get = type => parts.find(part => part.type === type).value

  return `${get('year')}-${get('month')}-${get('day')}`
}

// Sample dates are relative to the day the page opens.
const sampleToday = dayKey(new Date())
const sampleMidnight = new Date(`${sampleToday}T00:00:00+08:00`)

function daysAgoKey(daysAgo) {
  return dayKey(new Date(sampleMidnight.getTime() - daysAgo * DAY_MS))
}

function sampleTime(daysAgo, time = '10:00:00') {
  return new Date(`${daysAgoKey(daysAgo)}T${time}+08:00`).toISOString()
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-SG', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const today = computed(() => formatDate(currentTime.value))

const currentClock = computed(() =>
  currentTime.value.toLocaleTimeString('en-SG', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
)

onMounted(() => {
  clockInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

onUnmounted(() => clearInterval(clockInterval))

// Valid UUID-shaped local IDs.
// Separate groups prevent IDs colliding across sample tables.
function sampleId(group, number) {
  return `${String(group).padStart(8, '0')}-0000-4000-8000-${String(number).padStart(12, '0')}`
}

// =========================================
// SAMPLE DATABASE TABLES
// =========================================

const levels = ref([
  { id: sampleId(1, 3), level_number: 3, name: 'Primary 3' },
  { id: sampleId(1, 4), level_number: 4, name: 'Primary 4' }
])

const subjects = ref([
  { id: sampleId(2, 1), name: 'Science' }
])

// This demo assumes all profiles below belong to learners.
// Your schema does not currently contain a role column.
const profiles = ref(
  [
    ['Emma Tan', 3, 30, 'female'],
    ['Jayden Lim', 4, 24, 'male'],
    ['Alyssa Wong', 3, 18, 'female'],
    ['Ryan Ng', 4, 12, 'male'],
    ['Chloe Lee', 3, 5, 'prefer_not_to_say'],
    ['Ethan Goh', 4, 2, 'male']
  ].map(([name, level, joinedDaysAgo, avatar], index) => ({
    id: sampleId(3, index + 1),
    display_name: name,
    school_level_id: sampleId(1, level),
    created_at: sampleTime(joinedDaysAgo),
    avatar_choice: avatar
  }))
)

// Illustrative topic assignments; adjust to your syllabus.
const topics = ref(
  [
    ['Plants and Their Parts', 3, 'Identify plant parts and their functions.'],
    ['Living Things', 3, 'Compare living and non-living things.'],
    ['Materials', 3, 'Explore common material properties.'],
    ['Light and Shadows', 4, 'Explore light sources and shadow formation.'],
    ['Matter', 4, 'Compare solids, liquids and gases.'],
    ['Magnets', 4, 'Explore magnetic materials and magnetic forces.']
  ].map(([name, level, description], index) => ({
    id: sampleId(4, index + 1),
    level_id: sampleId(1, level),
    subject_id: sampleId(2, 1),
    name,
    description,
    created_at: sampleTime(40),
    topic_order: (index % 3) + 1
  }))
)

const flashcards = ref(
  [
    [1, 'What do roots absorb?', 'Water and mineral salts.'],
    [1, 'What is one function of leaves?', 'Leaves make food for the plant.'],
    [2, 'Do living things grow?', 'Yes, living things grow.'],
    [3, 'What does waterproof mean?', 'It does not allow water to pass through.'],
    [4, 'When does a shadow form?', 'When an object blocks light.'],
    [5, 'Does a solid have a definite shape?', 'Yes.']
  ].map(([topicNumber, front, back], index, rows) => ({
    id: sampleId(5, index + 1),
    topic_id: sampleId(4, topicNumber),
    front_text: front,
    back_text: back,
    front_image_path: null,
    back_image_path: null,
    card_order: rows
      .slice(0, index + 1)
      .filter(row => row[0] === topicNumber).length,
    created_at: sampleTime(35),
    concept_id: null
  }))
)

// [user, topic, days ago, status, elapsed minutes]
// Dates avoid future completed activity.
// Includes abandoned and ongoing sessions to test filtering.
const study_sessions = ref(
  [
    [1, 1, 12, 'completed', 25],
    [2, 4, 10, 'completed', 30],
    [3, 2, 8, 'completed', 25],
    [1, 1, 6, 'completed', 30],
    [2, 4, 6, 'completed', 25],
    [3, 2, 5, 'completed', 25],
    [1, 2, 4, 'completed', 30],
    [4, 5, 4, 'abandoned', 10],
    [2, 4, 3, 'completed', 25],
    [4, 5, 3, 'completed', 30],
    [5, 1, 2, 'completed', 25],
    [1, 3, 2, 'completed', 30],
    [3, 1, 1, 'completed', 25],
    [4, 4, 1, 'completed', 30],
    [5, 2, 1, 'in_progress', 0]
  ].map(([user, topic, ago, status, minutes], index) => {
    const startedAt = sampleTime(ago, '09:00:00')

    return {
      id: sampleId(6, index + 1),
      user_id: sampleId(3, user),
      topic_id: sampleId(4, topic),
      started_at: startedAt,
      completed_at: status === 'completed'
        ? new Date(
            new Date(startedAt).getTime() + minutes * 60_000
          ).toISOString()
        : null,
      status,
      created_at: startedAt
    }
  })
)

// score = number correct, not percentage.
// [user, topic, days ago, type, correct, questions, XP]
const quiz_attempts = ref(
  [
    [1, 1, 12, 'quiz', 5, 10, 25],
    [2, 4, 10, 'quiz', 4, 10, 20],
    [3, 2, 8, 'quiz', 6, 10, 30],
    [1, 1, 6, 'quiz', 7, 10, 35],
    [2, 4, 6, 'quiz', 5, 10, 25],
    [3, 2, 5, 'quiz', 8, 10, 40],
    [1, 2, 4, 'quiz', 8, 10, 40],
    [2, 4, 3, 'quiz', 6, 10, 30],
    [4, 5, 3, 'quiz', 3, 5, 15],
    [5, 1, 2, 'quiz', 6, 10, 30],
    [1, 3, 2, 'quiz', 9, 10, 45],
    [3, 1, 1, 'quiz', 9, 10, 45],
    [4, 4, 1, 'quiz', 5, 10, 25],
    [1, 1, 1, 'boss_battle', 8, 10, 60],
    [2, 4, 1, 'boss_battle', 3, 10, -10]
  ].map(([user, topic, ago, type, score, total, xp], index) => ({
    id: sampleId(7, index + 1),
    user_id: sampleId(3, user),
    topic_id: sampleId(4, topic),
    attempt_type: type,
    score,
    total_questions: total,
    xp_change: xp,
    completed_at: sampleTime(ago, '11:00:00'),
    created_at: sampleTime(ago, '10:50:00')
  }))
)

// =========================================
// REPORTING PERIOD
// Last 7 Singapore calendar days, including today.
// =========================================

const reportDays = computed(() => {
  const midnight = new Date(
    `${dayKey(currentTime.value)}T00:00:00+08:00`
  )

  return Array.from({ length: 7 }, (_, index) =>
    dayKey(new Date(midnight.getTime() - (6 - index) * DAY_MS))
  )
})

const reportDaySet = computed(() => new Set(reportDays.value))

function isInPeriod(value) {
  return Boolean(value) && reportDaySet.value.has(dayKey(value))
}

const completedSessions = computed(() =>
  study_sessions.value.filter(
    session => session.status === 'completed' && session.completed_at
  )
)

const periodSessions = computed(() =>
  completedSessions.value.filter(session => isInPeriod(session.completed_at))
)

const periodAttempts = computed(() =>
  quiz_attempts.value.filter(attempt => isInPeriod(attempt.completed_at))
)

const periodQuizzes = computed(() =>
  periodAttempts.value.filter(attempt => attempt.attempt_type === 'quiz')
)

// Equal weight per attempt, even when quiz lengths differ.
function averageScore(attempts) {
  if (!attempts.length) return null

  return attempts.reduce(
    (sum, attempt) => sum + (attempt.score / attempt.total_questions) * 100,
    0
  ) / attempts.length
}

function scoreLabel(value) {
  return value === null ? '—' : `${Math.round(value)}%`
}

const activeUserIds = computed(() => new Set([
  ...periodSessions.value.map(session => session.user_id),
  ...periodAttempts.value.map(attempt => attempt.user_id)
]))

const newUsers = computed(() =>
  profiles.value.filter(profile => isInPeriod(profile.created_at)).length
)

const topicsWithCards = computed(() =>
  topics.value.filter(topic =>
    flashcards.value.some(card => card.topic_id === topic.id)
  ).length
)

const xpSummary = computed(() => {
  const quizXp = periodAttempts.value.reduce(
    (sum, attempt) => sum + attempt.xp_change,
    0
  )

  const studyXp = periodSessions.value.length * SESSION_XP

  return {
    quizXp,
    studyXp,
    total: quizXp + studyXp
  }
})

// =========================================
// STAT CARDS
// =========================================

const stats = computed(() => [
  {
    title: 'Registered Users',
    value: profiles.value.length,
    icon: '👥',
    theme: 'yellow',
    note: `${newUsers.value} joined in the last 7 days`
  },
  {
    title: 'Active Users',
    value: activeUserIds.value.size,
    icon: '📊',
    theme: 'blue',
    note: 'Completed a session or quiz · Last 7 days'
  },
  {
    title: 'Sessions Completed',
    value: periodSessions.value.length,
    icon: '📚',
    theme: 'pink',
    note: 'Last 7 days · Abandoned sessions excluded'
  },
  {
    title: 'Quiz Average',
    value: scoreLabel(averageScore(periodQuizzes.value)),
    icon: '🎯',
    theme: 'purple',
    note: `${periodQuizzes.value.length} regular attempts · Last 7 days`
  }
])

// =========================================
// DAILY ACTIVE USERS CHART
// A user is counted once per day.
// =========================================

const chartSeries = computed(() => [{
  name: 'Active Users',
  data: reportDays.value.map(day => {
    const users = new Set([
      ...periodSessions.value
        .filter(session => dayKey(session.completed_at) === day)
        .map(session => session.user_id),
      ...periodAttempts.value
        .filter(attempt => dayKey(attempt.completed_at) === day)
        .map(attempt => attempt.user_id)
    ])

    return users.size
  })
}])

const chartOptions = computed(() => ({
  chart: {
    type: 'area',
    toolbar: { show: false }
  },
  colors: ['#F8B900'],
  stroke: { curve: 'straight', width: 3 },
  fill: {
    type: 'gradient',
    gradient: {
      opacityFrom: 0.3,
      opacityTo: 0.03
    }
  },
  markers: { size: 4 },
  dataLabels: { enabled: false },
  xaxis: {
    categories: reportDays.value.map(day =>
      new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-SG', {
        timeZone: TIME_ZONE,
        day: 'numeric',
        month: 'short'
      })
    )
  },
  yaxis: {
    min: 0,
    max: Math.max(1, ...chartSeries.value[0].data),
    decimalsInFloat: 0
  },
  grid: { borderColor: '#E8E8ED' },
  tooltip: {
    y: { formatter: value => `${value} users` }
  }
}))

// =========================================
// TOP STUDIED TOPICS
// =========================================

function levelLabel(levelId) {
  const level = levels.value.find(item => item.id === levelId)
  return level ? `P${level.level_number}` : '—'
}

// Retains the topDecks variable to minimise template changes.
// "accesses" now represents completed study sessions.
const topDecks = computed(() =>
  topics.value.map(topic => ({
    id: topic.id,
    name: topic.name,
    subject: subjects.value.find(
      subject => subject.id === topic.subject_id
    )?.name ?? '—',
    level: levelLabel(topic.level_id),
    accesses: periodSessions.value.filter(
      session => session.topic_id === topic.id
    ).length
  }))
    .filter(topic => topic.accesses > 0)
    .sort((a, b) => b.accesses - a.accesses || a.name.localeCompare(b.name))
    .slice(0, 5)
)

// =========================================
// RECENT REGISTRATIONS
// =========================================

const recentStudents = computed(() =>
  [...profiles.value]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)
    .map(profile => ({
      id: profile.id,
      name: profile.display_name,
      level: levelLabel(profile.school_level_id),
      joined: formatDate(profile.created_at)
    }))
)

// =========================================
// TOPIC PERFORMANCE
// Uses each user's latest regular quiz in this period.
// Repeated attempts do not give one user extra weight.
// =========================================

const topicPerformance = computed(() =>
  topics.value.map(topic => {
    const attempts = periodQuizzes.value
      .filter(attempt => attempt.topic_id === topic.id)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))

    const latestByUser = new Map()

    for (const attempt of attempts) {
      if (!latestByUser.has(attempt.user_id)) {
        latestByUser.set(attempt.user_id, attempt)
      }
    }

    const latestAttempts = [...latestByUser.values()]
    const average = averageScore(latestAttempts)

    // Prototype review thresholds, not a diagnosis of mastery.
    const status = average === null
      ? 'Not attempted'
      : average < 60
        ? 'Review topic'
        : average < 80
          ? 'Developing'
          : 'Doing well'

    return {
      id: topic.id,
      name: topic.name,
      level: levelLabel(topic.level_id),
      learners: latestAttempts.length,
      average,
      status,
      tone: average === null
        ? 'neutral'
        : average < 60
          ? 'review'
          : average < 80
            ? 'developing'
            : 'good'
    }
  }).sort((a, b) =>
    (a.average ?? Infinity) - (b.average ?? Infinity) ||
    a.name.localeCompare(b.name)
  )
)

// =========================================
// TOPIC DETAILS MODAL
// =========================================

// Selected topic for the Bootstrap modal
const selectedTopicId = ref(null)

const selectedTopic = computed(() =>
  topicPerformance.value.find(topic => topic.id === selectedTopicId.value)
)

// Regular quiz attempts within the dashboard's reporting period
const selectedTopicAttempts = computed(() =>
  periodQuizzes.value
    .filter(attempt => attempt.topic_id === selectedTopicId.value)
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
)

// Each learner's latest score and their attempts
const topicLearners = computed(() => {
  const learners = new Map()

  for (const attempt of selectedTopicAttempts.value) {
    if (!learners.has(attempt.user_id)) {
      const profile = profiles.value.find(
        profile => profile.id === attempt.user_id
      )

      learners.set(attempt.user_id, {
        id: attempt.user_id,
        name: profile?.display_name ?? 'Unknown learner',
        avatar_choice: profile?.avatar_choice ?? 'prefer_not_to_say',
        latest: attempt,
        percentage: attempt.score / attempt.total_questions * 100,
        attempts: []
      })
    }

    learners.get(attempt.user_id).attempts.push(attempt)
  }

  return [...learners.values()].sort(
    (a, b) => a.percentage - b.percentage || a.name.localeCompare(b.name)
  )
})

function formatQuizDate(value) {
  return new Date(value).toLocaleString('en-SG', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}


</script>

<template>
  <div class="admin-layout">
    <AdminNav />
    <main class="admin-content">
      <header class="dashboard-header d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1>Hello Admin!</h1>
          <p>Here's an overview of StudyDex.</p>
        </div>
        <div class="header-details d-flex align-items-center gap-3">
          <span>📅 {{ today }}</span>

          <span class="header-divider"></span>

          <span>🕒 {{ currentClock }}</span>

          <span class="header-divider"></span>

          <span>👤 Admin</span>
        </div>
      </header>

      <div class="container-fluid px-0">
        <!-- Four statistic cards -->
        <div class="row g-3 mb-4">
          <div v-for="stat in stats" :key="stat.title" class="col-12 col-sm-6 col-xl-3">
            <div class="stat-card" :class="stat.theme">
              <div class="d-flex align-items-center gap-3 mb-3">
                <span class="stat-icon">{{ stat.icon }}</span>
                <span class="stat-title">{{ stat.title }}</span>
              </div>

              <span class="stat-number">{{ stat.value }}</span>
              <p class="stat-note">{{ stat.note }}</p>
            </div>
          </div>
        </div>
        <div class="overview-strip mb-4">
          <span class="sample-badge">Local sample data</span>

          <span>
            <strong>{{ topics.length }}</strong> Science topics
          </span>

          <span>
            <strong>{{ topicsWithCards }}</strong> topics with flashcards
          </span>

          <span>
            <strong>{{ flashcards.length }}</strong> flashcards
          </span>

          <span>
            <strong>{{ xpSummary.total.toLocaleString() }} net XP</strong>
            in the last 7 days
          </span>

          <small>
            {{ xpSummary.quizXp }} quiz/boss XP +
            {{ xpSummary.studyXp }} session XP
          </small>
        </div>

        <!-- Student Activity + Top Study Decks -->
        <div class="row g-3 mb-4">
          <div class="col-12 col-xl-7">
            <section class="dashboard-panel">
              <div class="panel-header d-flex justify-content-between align-items-center gap-2">
                <div>
                  <h4>📊 Student Activity</h4>
                  <p>Active students over the past 7 days</p>
                </div>
                <span class="period-label">Last 7 Days</span>
              </div>
              <div class="chart-container">
                <!-- ApexCharts -->
                <VueApexCharts
                type="area"
                height="280"
                width="100%"
                :options="chartOptions"
                :series="chartSeries"
                />
              </div>
            </section>
          </div>
          <div class="col-12 col-xl-5">
            <section class="dashboard-panel">
              <div class="panel-header">
                <h4>📚 Top Study Decks</h4>
                <p>Most accessed study decks this week</p>
              </div>
              <div class="table-responsive">
                <table class="table dashboard-table align-middle">
                  <thead><tr><th>#</th><th>Deck Name</th><th>Subject</th><th>Level</th><th>Accesses</th></tr></thead>
                  <tbody>
                    <tr v-for="(deck, index) in topDecks" :key="deck.id">
                      <td>{{ index + 1 }}</td><td>{{ deck.name }}</td>
                      <td><span class="tag" :class="deck.subject === 'Science' ? 'tag-science' : 'tag-math'">{{ deck.subject }}</span></td>
                      <td><span class="tag tag-level">{{ deck.level }}</span></td><td>{{ deck.accesses }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        <!-- Recent Students + Recent Reports -->
        <div class="row g-3">
          <div class="col-12 col-xl-6">
            <section class="dashboard-panel">
              <div class="panel-header d-flex justify-content-between align-items-center">
                <div>
                  <h4>👥 Recent Students</h4>
                  <p>Latest registered students</p>
                </div>
                <span class="view-all-label">View All →</span>
              </div>
              <div class="table-responsive">
                <table class="table dashboard-table align-middle">
                  <thead><tr><th>Name</th><th>Level</th><th>Date Joined</th></tr></thead>
                  <tbody>
                    <tr v-for="student in recentStudents" :key="student.id">
                      <!-- <td><span class="student-avatar">👤</span> {{ student.name }}</td> -->
                      <td>
                        <div class="student-info">
                          <img
                            :src="'/assets/' + student.avatar_choice + '.png'"
                            alt=""
                            class="student-avatar"
                          />
                          <span class="student-name">{{ student.name }}</span>
                        </div>
                      </td>
                      <td><span class="tag tag-level">{{ student.level }}</span></td><td>{{ student.joined }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <div class="col-12 col-xl-6">
            <section class="dashboard-panel">
              <div class="panel-header">
                <h4>🎯 Science Topic Performance</h4>
                <p>
                  Each learner’s latest regular quiz in the last 7 days.
                  Click a topic to view learner scores.
                </p>
              </div>

              <div class="performance-scroll">
                <table class="table dashboard-table align-middle">
                  <thead>
                    <tr>
                      <th>Topic</th>
                      <th>Learners</th>
                      <th>Average</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="topic in topicPerformance" :key="topic.id">
                      <td>
                        <button
                          type="button"
                          class="topic-link"
                          data-bs-toggle="modal"
                          data-bs-target="#scienceTopicModal"
                          @click="selectedTopicId = topic.id"
                        >
                          {{ topic.name }} ↗
                        </button>

                        <small class="topic-level">{{ topic.level }}</small>
                      </td>

                      <td>{{ topic.learners }}</td>

                      <td>{{ scoreLabel(topic.average) }}</td>

                      <td>
                        <span class="tag" :class="`status-${topic.tone}`">
                          {{ topic.status }}
                        </span>
                      </td>
                    </tr>

                    <tr v-if="!topicPerformance.length">
                      <td colspan="4">No Science topics available yet.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p class="performance-note">
                Review: below 60% · Developing: 60–79% · Doing well: 80%+
                <br />
                Boss battles excluded.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>
    <!-- Bootstrap modal -->
  <div
    id="scienceTopicModal"
    class="modal fade"
    tabindex="-1"
    aria-labelledby="scienceTopicModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content quiz-modal">
        <div class="modal-header">
          <div>
            <h2 id="scienceTopicModalLabel" class="modal-title fs-5">
              🎯 {{ selectedTopic?.name ?? 'Topic Performance' }}
            </h2>

            <p class="quiz-modal-subtitle">
              Regular quizzes · Last 7 days · Singapore time
            </p>
          </div>

          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>

        <div class="modal-body">
          <!-- Summary -->
          <div class="row g-3 mb-4">
            <div class="col-12 col-sm-4">
              <div class="quiz-summary">
                <span>Learners</span>
                <strong>{{ topicLearners.length }}</strong>
              </div>
            </div>

            <div class="col-12 col-sm-4">
              <div class="quiz-summary">
                <span>Total attempts</span>
                <strong>{{ selectedTopicAttempts.length }}</strong>
              </div>
            </div>

            <div class="col-12 col-sm-4">
              <div class="quiz-summary">
                <span>Latest-score average</span>
                <strong>
                  {{ scoreLabel(selectedTopic?.average ?? null) }}
                </strong>
              </div>
            </div>
          </div>

          <p class="quiz-modal-note">
            Each learner’s latest score is shown below, with lower scores
            first. Expand “View attempts” to see their quiz history within
            this period.
          </p>

          <!-- Learner results -->
          <div v-if="topicLearners.length" class="table-responsive">
            <table class="table dashboard-table align-middle">
              <thead>
                <tr>
                  <th scope="col">Learner</th>
                  <th scope="col">Latest score</th>
                  <th scope="col">Attempts</th>
                  <th scope="col">Last completed</th>
                  <th scope="col">History</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="learner in topicLearners"
                  :key="selectedTopicId + '-' + learner.id"
                >
                  <td>
                    <div class="student-info">
                      <img
                        :src="'/assets/' + learner.avatar_choice + '.png'"
                        alt=""
                        class="student-avatar"
                      />
                      <span class="student-name">
                        {{ learner.name }}
                      </span>
                    </div>
                  </td>

                  <td>
                    <span
                      class="tag"
                      :class="{
                        'status-review': learner.percentage < 60,
                        'status-developing':
                          learner.percentage >= 60 && learner.percentage < 80,
                        'status-good': learner.percentage >= 80
                      }"
                    >
                      {{ scoreLabel(learner.percentage) }}
                    </span>

                    <small class="topic-level">
                      {{ learner.latest.score }}/{{ learner.latest.total_questions }}
                      correct
                    </small>
                  </td>

                  <td>{{ learner.attempts.length }}</td>

                  <td>
                    {{ formatQuizDate(learner.latest.completed_at) }}
                  </td>

                  <td>
                    <details class="quiz-history">
                      <summary>View attempts</summary>

                      <div
                        v-for="attempt in learner.attempts"
                        :key="attempt.id"
                        class="quiz-history-item"
                      >
                        <strong>
                          {{
                            scoreLabel(
                              attempt.score / attempt.total_questions * 100
                            )
                          }}
                        </strong>

                        <span>
                          · {{ attempt.score }}/{{ attempt.total_questions }}
                          correct
                        </span>

                        <small>
                          {{ formatQuizDate(attempt.completed_at) }}
                        </small>

                        <small>
                          {{ attempt.xp_change > 0 ? '+' : '' }}{{ attempt.xp_change }}
                          XP
                        </small>
                      </div>
                    </details>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty topic -->
          <div v-else class="quiz-empty">
            <div class="fs-2 mb-2">📋</div>
            <h3 class="fs-6">No quiz attempts yet</h3>
            <p>
              No regular quizzes were completed for this topic
              during the last 7 days.
            </p>
          </div>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-outline-secondary"
            data-bs-dismiss="modal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>

</template>

<style scoped>
/* =========================================
   HEADER
   ========================================= */

.dashboard-header {
  margin-bottom: 24px;
}

.dashboard-header h1 {
  font-size: 25px;
}

.dashboard-header p, .panel-header p {
  color: #7b8095;
  margin: 0;
}

.header-details {
  font-size: 13px;
}

.header-divider {
  height: 24px;
  width: 1px;
  background: #d9d9df;
}

/* =========================================
   STATISTIC CARDS
   ========================================= */

.stat-card {
  padding: 16px;
}

.stat-card.yellow {
  background: #fffaf0;
}

.stat-card.blue {
  background: #f0f8ff;
}

.stat-card.pink {
  background: #fff5f4;
}

.stat-card.purple {
  background: #f8f5ff;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fff0be;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 23px;
  flex-shrink: 0;
}

.blue .stat-icon {
  background: #d8eaff;
}

.pink .stat-icon {
  background: #ffe1e1;
}

.purple .stat-icon {
  background: #eae0ff;
}

.stat-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
}

.stat-number {
  font-size: 25px;
  font-weight: 750;
  line-height: 1;
}

.stat-change {
  display: flex;
  flex-direction: column;
  font-size: 12px;
}

.stat-change > span {
  color: #239b63;
  font-weight: 600;
}

.stat-change > span.negative-change {
  color: #e04c58;
}

.stat-change small {
  color: #7b8095;
}

/* =========================================
   DASHBOARD PANELS & CHART
   ========================================= */

.dashboard-panel {
  padding: 15px;
}

.panel-header {
  margin-bottom: 18px;
}

.panel-header h4 {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 4px;
}

.panel-header p {
  font-size: 13px;
}

.period-label, .view-all-label {
  background: white;
  border: 1px solid #e3e3e8;
  border-radius: 9px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

/* =========================================
   TABLES & TAGS
   ========================================= */

.dashboard-table {
  font-size: 12px;
  margin-bottom: 0;
}

.dashboard-table thead th {
  background: #f6f6f8;
  font-weight: 600;
  padding: 11px 9px;
  white-space: nowrap;
}

.dashboard-table tbody td {
  padding: 11px 9px;
  vertical-align: middle;
}

.dashboard-table tbody tr:last-child td {
  border-bottom: none;
}

.tag {
  display: inline-block;
  padding: 4px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.tag-science {
  background: #d5f4e3;
  color: #216947;
}

.tag-math {
  background: #d9eaff;
  color: #285ba2;
}

.tag-level {
  background: #ffe7a0;
  color: #30304b;
}

.tag-quiz {
  background: #ffdce0;
  color: #bc3445;
}

.tag-behaviour {
  background: #ffe7a0;
  color: #745500;
}

.tag-feedback {
  background: #d9eaff;
  color: #285ba2;
}

.student-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.student-avatar {
  display: block;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  margin: 0;
  padding: 4px;
  object-fit: contain;
  border-radius: 50%;
  background: #fff4d6;
  border: 1px solid #f0e3bc;
}

.student-name {
  font-size: 13px;
  font-weight: 600;
  color: #30304b;
}

/* =========================================
   RESPONSIVE DASHBOARD LAYOUT
   ========================================= */

@media (max-width: 767px) {
  .admin-content {
    padding: 16px;
  }

  .dashboard-header h1 {
    font-size: 25px;
  }

  .dashboard-panel {
    padding: 15px;
  }

  .stat-card {
    padding: 16px;
  }
}

.stat-note {
  margin: 12px 0 0;
  color: #697386;
  font-size: 12px;
  line-height: 1.5;
}

.overview-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding: 16px 20px;
  border: 1px solid #e8e8ed;
  border-radius: 14px;
  background: #fff;
  color: #566176;
  font-size: 13px;
}

.overview-strip small {
  color: #697386;
}

.sample-badge {
  padding: 5px 10px;
  border-radius: 7px;
  background: #fff2cc;
  color: #765b10;
  font-size: 12px;
  font-weight: 600;
}

.performance-scroll {
  max-height: 340px;
  overflow: auto;
}

.performance-scroll thead th {
  position: sticky;
  top: 0;
  z-index: 1;
}

.topic-level {
  display: block;
  margin-top: 4px;
  color: #697386;
}

.status-neutral {
  background: #eef0f4;
  color: #5d6575;
}

.status-review {
  background: #ffe5e5;
  color: #9c303b;
}

.status-developing {
  background: #fff0c7;
  color: #785b0c;
}

.status-good {
  background: #dff5e9;
  color: #246b49;
}

.performance-note {
  margin: 14px 0 0;
  color: #697386;
  font-size: 12px;
  line-height: 1.6;
}

.topic-link {
  padding: 0;
  border: 0;
  background: none;
  color: #315b91;
  font: inherit;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.topic-link:hover {
  text-decoration: underline;
}

.topic-link:focus-visible {
  outline: 3px solid #f0c34d;
  outline-offset: 4px;
  border-radius: 3px;
}

.quiz-modal {
  border: 1px solid #e8e8ed;
  border-radius: 16px;
  overflow: hidden;
  color: #30304b;
}

.quiz-modal .modal-header {
  background: #fffaf0;
  padding: 20px 24px;
}

.quiz-modal .modal-body {
  padding: 24px;
}

.quiz-modal-subtitle {
  margin: 6px 0 0;
  color: #697386;
  font-size: 12px;
}

.quiz-summary {
  height: 100%;
  padding: 16px;
  border: 1px solid #e8e8ed;
  border-radius: 12px;
  background: #f8f9fc;
}

.quiz-summary span {
  display: block;
  margin-bottom: 8px;
  color: #697386;
  font-size: 12px;
}

.quiz-summary strong {
  font-size: 26px;
}

.quiz-modal-note {
  color: #697386;
  font-size: 13px;
  line-height: 1.6;
}

.quiz-history {
  min-width: 170px;
}

.quiz-history summary {
  color: #315b91;
  font-weight: 600;
  cursor: pointer;
}

.quiz-history-item {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e8e8ed;
}

.quiz-history-item small {
  display: block;
  margin-top: 4px;
  color: #697386;
}

.quiz-empty {
  padding: 32px 16px;
  text-align: center;
  color: #697386;
}

@media (max-width: 575px) {
  .quiz-modal .modal-header,
  .quiz-modal .modal-body {
    padding: 16px;
  }
}
</style>

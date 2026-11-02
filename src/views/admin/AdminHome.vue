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

// Local demo data only. These status fields illustrate dashboard filtering;
// map them to your actual Supabase schema when connecting live data.
const profiles = ref([
  ['Emma Tan', 30], ['Jayden Lim', 24], ['Alyssa Wong', 18],
  ['Ryan Ng', 12], ['Chloe Lee', 5], ['Ethan Goh', 2]
].map(([name, joinedDaysAgo], index) => ({
  id: sampleId(3, index + 1),
  display_name: name,
  created_at: sampleTime(joinedDaysAgo)
})))

const decks = ref([
  { id: sampleId(4, 1), name: 'Plant Parts', status: 'active' },
  { id: sampleId(4, 2), name: 'Living Things', status: 'active' },
  { id: sampleId(4, 3), name: 'Materials', status: 'active' },
  { id: sampleId(4, 4), name: 'Light and Shadows', status: 'active' },
  { id: sampleId(4, 5), name: 'Matter', status: 'draft' },
  { id: sampleId(4, 6), name: 'Magnets', status: 'archived' }
])

const quizzes = ref([
  { id: sampleId(5, 1), name: 'Plant Parts Quiz', status: 'active' },
  { id: sampleId(5, 2), name: 'Living Things Quiz', status: 'active' },
  { id: sampleId(5, 3), name: 'Materials Quiz', status: 'active' },
  { id: sampleId(5, 4), name: 'Light and Shadows Quiz', status: 'draft' },
  { id: sampleId(5, 5), name: 'Magnets Quiz', status: 'archived' }
])

// Minimal activity records: [user number, days ago, completion status].
// All sample activity is in the past and after the user's registration.
const studySessions = ref([
  [1, 6, 'completed'], [2, 6, 'completed'],
  [3, 5, 'completed'], [1, 4, 'completed'],
  [4, 4, 'abandoned'], [2, 3, 'completed'],
  [4, 3, 'completed'], [5, 2, 'completed'],
  [1, 2, 'completed'], [3, 1, 'completed'],
  [4, 1, 'completed'], [5, 1, 'in_progress']
].map(([user, ago, status], index) => ({
  id: sampleId(6, index + 1),
  user_id: sampleId(3, user),
  status,
  completed_at: status === 'completed' ? sampleTime(ago, '09:30:00') : null
})))

const quizAttempts = ref([
  [1, 6], [2, 6], [3, 5], [1, 4], [2, 3],
  [4, 3], [5, 2], [1, 2], [3, 1], [4, 1],
  [1, 1], [2, 1], [6, 1]
].map(([user, ago], index) => ({
  id: sampleId(7, index + 1),
  user_id: sampleId(3, user),
  completed_at: sampleTime(ago, '11:00:00')
})))

const stats = computed(() => [
  { title: 'Registered Users', value: profiles.value.length, icon: '👥', theme: 'yellow', note: 'Total registered accounts' },
  { title: 'Active Decks', value: decks.value.filter(deck => deck.status === 'active').length, icon: '📚', theme: 'blue', note: 'Available for users to study' },
  { title: 'Active Quizzes', value: quizzes.value.filter(quiz => quiz.status === 'active').length, icon: '🎯', theme: 'purple', note: 'Available for users to attempt' }
])

// Last seven Singapore calendar days, including today.
const reportDays = computed(() => {
  const midnight = new Date(`${dayKey(currentTime.value)}T00:00:00+08:00`)
  return Array.from({ length: 7 }, (_, index) =>
    dayKey(new Date(midnight.getTime() - (6 - index) * DAY_MS))
  )
})

// Count each registered user once per day across both activity types.
const chartSeries = computed(() => {
  const registeredIds = new Set(profiles.value.map(profile => profile.id))
  const activity = [
    ...studySessions.value.filter(session => session.status === 'completed'),
    ...quizAttempts.value
  ].filter(item => item.completed_at && registeredIds.has(item.user_id))

  return [{
    name: 'Active Users',
    data: reportDays.value.map(day => new Set(
      activity.filter(item => dayKey(item.completed_at) === day)
        .map(item => item.user_id)
    ).size)
  }]
})

const recentUsers = computed(() => [...profiles.value]
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  .slice(0, 5)
)

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

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

</script>

<template>
  <div class="admin-layout">
    <AdminNav />
    <main class="admin-content">
      <header class="dashboard-header">
        <div>
          <h1>Hello Admin!</h1>
          <p>Here's an overview of StudyDex.</p>
        </div>
        <div class="header-details">
          <span class="sample-badge">Local sample data</span>
          <span>📅 {{ today }}</span>
          <span>🕒 {{ currentClock }}</span>
        </div>
      </header>

      <section class="stats-grid" aria-label="Dashboard totals">
        <article v-for="stat in stats" :key="stat.title" class="stat-card" :class="stat.theme">
          <div class="stat-heading">
            <span class="stat-icon" aria-hidden="true">{{ stat.icon }}</span>
            <h2>{{ stat.title }}</h2>
          </div>
          <strong class="stat-number">{{ stat.value.toLocaleString() }}</strong>
          <p class="stat-note">{{ stat.note }}</p>
        </article>
      </section>

      <div class="dashboard-grid">
        <section class="dashboard-panel" aria-labelledby="activity-title">
          <div class="panel-header chart-header">
            <div>
              <h2 id="activity-title">User Activity</h2>
              <p>Daily active users over the past 7 days</p>
            </div>
            <span class="period-label">Last 7 days</span>
          </div>
          <div class="chart-container">
            <VueApexCharts type="area" height="280" width="100%" :options="chartOptions" :series="chartSeries" />
          </div>
          <p class="chart-note">Users who completed a study session or quiz, counted once per day.</p>
        </section>

        <section class="dashboard-panel" aria-labelledby="registration-title">
          <div class="panel-header">
            <h2 id="registration-title">Recent User Registrations</h2>
            <p>The 5 most recent registrations</p>
          </div>
          <ul v-if="recentUsers.length" class="registration-list">
            <li v-for="user in recentUsers" :key="user.id" class="registration-item">
              <span class="user-avatar" aria-hidden="true">{{ initials(user.display_name) }}</span>
              <div class="user-details">
                <strong>{{ user.display_name }}</strong>
                <span>Registered {{ formatDate(user.created_at) }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty-state">No users have registered yet.</p>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard-header {
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 16px; margin-bottom: 24px;
}
.dashboard-header h1 { margin: 0 0 6px; font-size: 25px; }
.dashboard-header p, .panel-header p { color: #697386; margin: 0; }
.header-details { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 13px; }
.sample-badge { padding: 5px 10px; border-radius: 7px; background: #fff2cc; color: #765b10; font-size: 12px; }
.stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-bottom: 24px; }
.stat-card { padding: 22px; border: 1px solid #e8e8ed; border-radius: 16px; }
.stat-card.yellow { background: #fffaf0; }
.stat-card.blue { background: #f0f8ff; }
.stat-card.purple { background: #f8f5ff; }
.stat-heading { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.stat-heading h2 { margin: 0; font-size: 15px; font-weight: 650; color: #30304b; }
.stat-icon { display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px; background: #fff0be; font-size: 23px; }
.blue .stat-icon { background: #d8eaff; }
.purple .stat-icon { background: #eae0ff; }
.stat-number { display: block; font-size: 32px; line-height: 1; color: #30304b; }
.stat-note { margin: 12px 0 0; color: #697386; font-size: 12px; }
.dashboard-grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(280px, 1fr); gap: 20px; align-items: stretch; }
.dashboard-panel { min-width: 0; padding: 22px; border: 1px solid #e8e8ed; border-radius: 16px; background: #fff; }
.panel-header { margin-bottom: 18px; }
.panel-header h2 { margin: 0 0 6px; font-size: 17px; font-weight: 700; color: #30304b; }
.panel-header p { font-size: 13px; }
.chart-header { display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 12px; }
.period-label { padding: 7px 10px; border: 1px solid #e3e3e8; border-radius: 9px; font-size: 12px; white-space: nowrap; }
.chart-container { min-width: 0; }
.chart-note { margin: 8px 0 0; color: #697386; font-size: 12px; line-height: 1.5; }
.registration-list { list-style: none; margin: 0; padding: 0; }
.registration-item { display: flex; align-items: center; gap: 12px; padding: 15px 0; border-bottom: 1px solid #eef0f4; }
.registration-item:last-child { border-bottom: 0; }
.user-avatar { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%; background: #fff4d6; color: #745500; font-size: 12px; font-weight: 700; }
.user-details { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.user-details strong { font-size: 13px; color: #30304b; overflow-wrap: anywhere; }
.user-details span, .empty-state { font-size: 12px; color: #697386; }
@media (max-width: 1100px) { .dashboard-grid { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 767px) {
  .admin-content { padding: 16px; }
  .stats-grid { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .dashboard-panel, .stat-card { padding: 18px; }
}
</style>

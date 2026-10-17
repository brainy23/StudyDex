
<script setup>
import { ref,computed } from 'vue';
import AdminNav from '../common/adminNav.vue';

// pnpm install apexcharts vue3-apexcharts
import VueApexCharts from 'vue3-apexcharts'

const chartSeries = ref([
  {
    name: 'Active Students',
    data: [10, 19, 16, 24, 19, 23, 30]
  }
])

const chartOptions = ref({
  chart: {
    type: 'area',
    toolbar: {
      show: false
    },
    animations: {
      enabled: true,
      speed: 800
    }
  },

  colors: ['#F8B900'],

  stroke: {
    curve: 'smooth',
    width: 3
  },

  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.35,
      opacityTo: 0.05,
      stops: [0, 100]
    }
  },

  markers: {
    size: 5,
    hover: {
      size: 8
    }
  },

  dataLabels: {
    enabled: false
  },

  xaxis: {
    categories: [
      '11 Oct', '12 Oct', '13 Oct',
      '14 Oct', '15 Oct', '16 Oct', '17 Oct'
    ]
  },

  yaxis: {
    min: 0,
    max: 40,
    tickAmount: 4
  },

  grid: {
    borderColor: '#E8E8ED'
  },

  tooltip: {
    theme: 'light',
    y: {
      formatter: (value) => `${value} students`
    }
  }
})

// Demo data — replace with your API responses later.
const stats = ref([
  { title: 'Total Number of Students', value: 22, change: '+12%', icon: '👥', theme: 'yellow', note: 'from last week' },
  { title: 'Active Students This Week', value: 22, change: '+8%', icon: '📊', theme: 'blue', note: 'from last week' },
  { title: 'Total Number of Active Decks', value: 22, change: '+5%', icon: '📚', theme: 'pink', note: 'from last week' },
  { title: 'Number of Pending Reports', value: 22, change: '+3', icon: '📋', theme: 'purple', note: 'new this week' }
])

const activity = ref([
  { day: '11 Oct', count: 10 }, { day: '12 Oct', count: 19 },
  { day: '13 Oct', count: 16 }, { day: '14 Oct', count: 24 },
  { day: '15 Oct', count: 19 }, { day: '16 Oct', count: 23 },
  { day: '17 Oct', count: 30 }
])
const chartPoints = computed(() => activity.value.map((point, index) => ({
  ...point,
  x: 40 + index * (520 / Math.max(activity.value.length - 1, 1)),
  y: 200 - point.count / 40 * 170
})))
const chartLine = computed(() => chartPoints.value.map(p => `${p.x},${p.y}`).join(' '))
const chartArea = computed(() => `40,200 ${chartLine.value} 560,200`)

const topDecks = ref([
  { id: 1, name: 'Plants', subject: 'Science', level: 'P3', accesses: 28 },
  { id: 2, name: 'Fractions', subject: 'Mathematics', level: 'P4', accesses: 24 },
  { id: 3, name: 'Human Body', subject: 'Science', level: 'P5', accesses: 21 },
  { id: 4, name: 'Area and Perimeter', subject: 'Mathematics', level: 'P5', accesses: 18 },
  { id: 5, name: 'Forces', subject: 'Science', level: 'P6', accesses: 16 }
])
const recentStudents = ref([
  { id: 1, name: 'Emma Tan', level: 'P3', joined: '17 Oct 2026' },
  { id: 2, name: 'Jayden Lim', level: 'P4', joined: '16 Oct 2026' },
  { id: 3, name: 'Alyssa Wong', level: 'P3', joined: '16 Oct 2026' },
  { id: 4, name: 'Ryan Ng', level: 'P5', joined: '15 Oct 2026' }
])
const recentReports = ref([
  { id: 1, type: 'Quiz', description: 'Inappropriate answer content', date: '17 Oct 2026' },
  { id: 2, type: 'Behaviour', description: 'Multiple failed quiz attempts', date: '16 Oct 2026' },
  { id: 3, type: 'Feedback', description: 'Student requested new topic', date: '15 Oct 2026' },
  { id: 4, type: 'Behaviour', description: 'Suspicious activity detected', date: '14 Oct 2026' }
])

const levels = ref([
  {
    id: 1,
    level_number: 'P1',
    name: 'Primary 1'
  },
  {
    id: 2,
    level_number: 'P2',
    name: 'Primary 2'
  },
  {
    id: 3,
    level_number: 'P3',
    name: 'Primary 3'
  },
  {
    id: 4,
    level_number: 'P4',
    name: 'Primary 4'
  },
  {
    id: 5,
    level_number: 'P5',
    name: 'Primary 5'
  },
  {
    id: 6,
    level_number: 'P6',
    name: 'Primary 6'
  }
])

const subjects = ref([
  {
    id:1,
    name: 'Science'
  },
  {
    id:2,
    name: 'Mathematics'
  }
])

const topics = [
  // ==================== PRIMARY 3 ====================
  {
    id: 1,
    level_id: 'P3',
    subject_id: 1,
    name: 'Living and Non-Living Things',
    description: 'Characteristics of living and non-living things.',
    createdAt: 'today'
  },
  {
    id: 2,
    level_id: 'P3',
    subject_id: 1,
    name: 'Plants',
    description: 'Different types of plants and their characteristics.',
    createdAt: 'today'
  },
  {
    id: 3,
    level_id: 'P3',
    subject_id: 1,
    name: 'Animals',
    description: 'Classification and characteristics of animals.',
    createdAt: 'today'
  },
  {
    id: 4,
    level_id: 'P3',
    subject_id: 1,
    name: 'Fungi and Bacteria',
    description: 'Characteristics of fungi and bacteria.',
    createdAt: 'today'
  },
  {
    id: 5,
    level_id: 'P3',
    subject_id: 1,
    name: 'Materials',
    description: 'Properties and uses of different materials.',
    createdAt: 'today'
  },
  {
    id: 6,
    level_id: 'P3',
    subject_id: 1,
    name: 'Life Cycles of Plants',
    description: 'Stages in the life cycles of plants.',
    createdAt: 'today'
  },
  {
    id: 7,
    level_id: 'P3',
    subject_id: 1,
    name: 'Life Cycles of Animals',
    description: 'Stages in the life cycles of different animals.',
    createdAt: 'today'
  },
  {
    id: 8,
    level_id: 'P3',
    subject_id: 1,
    name: 'Magnets',
    description: 'Properties, interactions and uses of magnets.',
    createdAt: 'today'
  },

  // ==================== PRIMARY 4 ====================
  {
    id: 9,
    level_id: 'P4',
    subject_id: 1,
    name: 'Matter',
    description: 'States and properties of matter.',
    createdAt: 'today'
  },
  {
    id: 10,
    level_id: 'P4',
    subject_id: 1,
    name: 'Plant Systems',
    description: 'Functions of different plant parts.',
    createdAt: 'today'
  },
  {
    id: 11,
    level_id: 'P4',
    subject_id: 1,
    name: 'Digestive System',
    description: 'Human digestive organs and their functions.',
    createdAt: 'today'
  },
  {
    id: 12,
    level_id: 'P4',
    subject_id: 1,
    name: 'Light and Shadows',
    description: 'Properties of light and formation of shadows.',
    createdAt: 'today'
  },
  {
    id: 13,
    level_id: 'P4',
    subject_id: 1,
    name: 'Heat and Temperature',
    description: 'Heat transfer and effects of heat.',
    createdAt: 'today'
  },

  // ==================== PRIMARY 5 ====================
  {
    id: 14,
    level_id: 'P5',
    subject_id: 1,
    name: 'Reproduction in Plants',
    description: 'Pollination, fertilisation and seed dispersal.',
    createdAt: 'today'
  },
  {
    id: 15,
    level_id: 'P5',
    subject_id: 1,
    name: 'Reproduction in Humans',
    description: 'Human reproduction and development.',
    createdAt: 'today'
  },
  {
    id: 16,
    level_id: 'P5',
    subject_id: 1,
    name: 'Water and Changes of State',
    description: 'Evaporation, condensation, melting and freezing.',
    createdAt: 'today'
  },
  {
    id: 17,
    level_id: 'P5',
    subject_id: 1,
    name: 'Water Cycle',
    description: 'The water cycle and its importance.',
    createdAt: 'today'
  },
  {
    id: 18,
    level_id: 'P5',
    subject_id: 1,
    name: 'Plant Transport System',
    description: 'Transport of water and food in plants.',
    createdAt: 'today'
  },
  {
    id: 19,
    level_id: 'P5',
    subject_id: 1,
    name: 'Respiratory System',
    description: 'Human breathing and gas exchange.',
    createdAt: 'today'
  },
  {
    id: 20,
    level_id: 'P5',
    subject_id: 1,
    name: 'Circulatory System',
    description: 'The heart, blood vessels and blood circulation.',
    createdAt: 'today'
  },
  {
    id: 21,
    level_id: 'P5',
    subject_id: 1,
    name: 'Electrical System',
    description: 'Electric circuits, conductors and insulators.',
    createdAt: 'today'
  },

  // ==================== PRIMARY 6 ====================
  {
    id: 22,
    level_id: 'P6',
    subject_id: 1,
    name: 'Photosynthesis',
    description: 'How green plants make food using light.',
    createdAt: 'today'
  },
  {
    id: 23,
    level_id: 'P6',
    subject_id: 1,
    name: 'Forms of Energy',
    description: 'Different forms and sources of energy.',
    createdAt: 'today'
  },
  {
    id: 24,
    level_id: 'P6',
    subject_id: 1,
    name: 'Energy Conversion',
    description: 'How energy changes from one form to another.',
    createdAt: 'today'
  },
  {
    id: 25,
    level_id: 'P6',
    subject_id: 1,
    name: 'Forces',
    description: 'Friction, gravity and elastic spring forces.',
    createdAt: 'today'
  },
  {
    id: 26,
    level_id: 'P6',
    subject_id: 1,
    name: 'Food Chains and Food Webs',
    description: 'Feeding relationships between organisms.',
    createdAt: 'today'
  },
  {
    id: 27,
    level_id: 'P6',
    subject_id: 1,
    name: 'Adaptations',
    description: 'How organisms survive in their environments.',
    createdAt: 'today'
  },
  {
    id: 28,
    level_id: 'P6',
    subject_id: 1,
    name: 'Interactions Within the Environment',
    description: 'Interactions between organisms and their surroundings.',
    createdAt: 'today'
  },
  {
    id: 29,
    level_id: 'P6',
    subject_id: 1,
    name: 'Human Impact on the Environment',
    description: 'How human activities affect the environment.',
    createdAt: 'today'
  }
]
</script>

<template>
  <div class="admin-layout">
    <AdminNav />
    <main class="admin-content">
      <header class="dashboard-header d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div><h1>Hello Admin!</h1><p>Here's an overview of StudyDex.</p></div>
        <div class="header-details d-flex align-items-center gap-3">
          <span>📅 17 Oct 2026</span><span class="header-divider"></span><span>👤 Admin</span>
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
              <div class="d-flex align-items-end gap-3">
                <span class="stat-number">{{ stat.value }}</span>
                <div class="stat-change">
                  <span :class="{ 'negative-change': stat.theme === 'purple' }">▲ {{ stat.change }}</span>
                  <small>{{ stat.note }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Student Activity + Top Study Decks -->
        <div class="row g-3 mb-4">
          <div class="col-12 col-xl-7">
            <section class="dashboard-panel">
              <div class="panel-header d-flex justify-content-between align-items-center gap-2">
                <div><h4>📊 Student Activity</h4><p>Active students over the past 7 days</p></div>
                <span class="period-label">Last 7 Days</span>
              </div>
              <div class="chart-container">
                <!-- APEX CHARTS -->
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
              <div class="panel-header"><h4>📚 Top Study Decks</h4><p>Most accessed study decks this week</p></div>
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
                <div><h4>👥 Recent Students</h4><p>Latest registered students</p></div>
                <span class="view-all-label">View All →</span>
              </div>
              <div class="table-responsive">
                <table class="table dashboard-table align-middle">
                  <thead><tr><th>Name</th><th>Level</th><th>Date Joined</th></tr></thead>
                  <tbody>
                    <tr v-for="student in recentStudents" :key="student.id">
                      <td><span class="student-avatar">👤</span> {{ student.name }}</td>
                      <td><span class="tag tag-level">{{ student.level }}</span></td><td>{{ student.joined }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <div class="col-12 col-xl-6">
            <section class="dashboard-panel">
              <div class="panel-header d-flex justify-content-between align-items-center">
                <div><h4>📋 Recent Reports and Feedback</h4><p>Latest student reports and feedback</p></div>
                <span class="view-all-label">View All →</span>
              </div>
              <div class="table-responsive">
                <table class="table dashboard-table align-middle">
                  <thead><tr><th>Type</th><th>Description</th><th>Date</th></tr></thead>
                  <tbody>
                    <tr v-for="report in recentReports" :key="report.id">
                      <td><span class="tag" :class="'tag-' + report.type.toLowerCase()">{{ report.type }}</span></td>
                      <td>{{ report.description }}</td><td>{{ report.date }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; width: 100%; }
.admin-content { flex: 1; min-width: 0; padding: 28px; background: #faf9f6; color: #30304b; }
.dashboard-header { margin-bottom: 24px; }
.dashboard-header h1 { font-size: 30px; font-weight: 750; margin-bottom: 4px; }
.dashboard-header p, .panel-header p { color: #7b8095; margin: 0; }
.header-details { font-size: 13px; }
.header-divider { height: 24px; width: 1px; background: #d9d9df; }
.stat-card { border-radius: 15px; padding: 20px; border: 1px solid #eee; height: 100%; box-shadow: 0 3px 12px rgba(48,48,75,.05); }
.stat-card.yellow { background: #fffaf0; }
.stat-card.blue { background: #f0f8ff; }
.stat-card.pink { background: #fff5f4; }
.stat-card.purple { background: #f8f5ff; }
.stat-icon { width: 48px; height: 48px; border-radius: 50%; background: #fff0be; display: flex; justify-content: center; align-items: center; font-size: 23px; flex-shrink: 0; }
.blue .stat-icon { background: #d8eaff; }
.pink .stat-icon { background: #ffe1e1; }
.purple .stat-icon { background: #eae0ff; }
.stat-title { font-size: 14px; font-weight: 600; line-height: 1.45; }
.stat-number { font-size: clamp(30px, 3vw, 42px); font-weight: 750; line-height: 1; }
.stat-change { display: flex; flex-direction: column; font-size: 12px; }
.stat-change > span { color: #239b63; font-weight: 600; }
.stat-change > span.negative-change { color: #e04c58; }
.stat-change small { color: #7b8095; }
.dashboard-panel { background: #fff; border-radius: 16px; border: 1px solid #eee; padding: 20px; height: 100%; box-shadow: 0 3px 12px rgba(48,48,75,.05); }
.panel-header { margin-bottom: 18px; }
.panel-header h4 { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
.panel-header p { font-size: 13px; }
.period-label, .view-all-label { background: white; border: 1px solid #e3e3e8; border-radius: 9px; padding: 8px 12px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.activity-chart { width: 100%; height: auto; display: block; }
.chart-label { fill: #777d92; font-size: 12px; }
.dashboard-table { font-size: 12px; margin-bottom: 0; }
.dashboard-table thead th { background: #f6f6f8; font-weight: 600; padding: 11px 9px; white-space: nowrap; }
.dashboard-table tbody td { padding: 11px 9px; vertical-align: middle; }
.dashboard-table tbody tr:last-child td { border-bottom: none; }
.tag { display: inline-block; padding: 4px 9px; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.tag-science { background: #d5f4e3; color: #216947; }
.tag-math { background: #d9eaff; color: #285ba2; }
.tag-level { background: #ffe7a0; color: #30304b; }
.tag-quiz { background: #ffdce0; color: #bc3445; }
.tag-behaviour { background: #ffe7a0; color: #745500; }
.tag-feedback { background: #d9eaff; color: #285ba2; }
.student-avatar { display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; border-radius: 50%; background: #fff0c1; margin-right: 6px; }
@media (max-width: 767px) { .admin-content { padding: 16px; } .dashboard-header h1 { font-size: 25px; } .dashboard-panel { padding: 15px; } .stat-card { padding: 16px; } }
</style>

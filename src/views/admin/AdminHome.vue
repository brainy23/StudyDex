<script setup>
import '@/assets/admincommon.css'
import AdminNav from '@/components/common/adminNav.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import VueApexCharts from 'vue3-apexcharts'


// =========================================
// LIVE DATE & CLOCK
// =========================================

const currentTime = ref(new Date())
let clockInterval

const today = computed(() =>
  currentTime.value.toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
)

const currentClock = computed(() =>
  currentTime.value.toLocaleTimeString('en-SG', {
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

onUnmounted(() => {
  clearInterval(clockInterval)
})

let date = new Date()

// =========================================
// 1. STUDENT ACTIVITY CHART (APEXCHARTS)
// =========================================
// npm install apexcharts vue3-apexcharts
const chartSeries = [
  {
    name: 'Active Students',
    data: [10, 19, 16, 24, 19, 23, 30]
  }
]

const chartOptions = {
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
}

// =========================================
// 2. DASHBOARD DEMO DATA
// =========================================
// Replace these arrays with API data when the backend is ready.
const stats = [
  { title: 'Total Number of Students', value: 22, change: '+12%', icon: '👥', theme: 'yellow', note: 'from last week' },
  { title: 'Active Students This Week', value: 22, change: '+8%', icon: '📊', theme: 'blue', note: 'from last week' },
  { title: 'Total Number of Active Decks', value: 22, change: '+5%', icon: '📚', theme: 'pink', note: 'from last week' },
  { title: 'Number of Pending Reports', value: 22, change: '+3', icon: '📋', theme: 'purple', note: 'new this week' }
]

const topDecks = [
  { id: 1, name: 'Plants', subject: 'Science', level: 'P3', accesses: 28 },
  { id: 2, name: 'Fractions', subject: 'Mathematics', level: 'P4', accesses: 24 },
  { id: 3, name: 'Human Body', subject: 'Science', level: 'P5', accesses: 21 },
  { id: 4, name: 'Area and Perimeter', subject: 'Mathematics', level: 'P5', accesses: 18 },
  { id: 5, name: 'Forces', subject: 'Science', level: 'P6', accesses: 16 }
]
const recentStudents = [
  { id: 1, name: 'Emma Tan', level: 'P3', joined: '17 Oct 2026' },
  { id: 2, name: 'Jayden Lim', level: 'P4', joined: '16 Oct 2026' },
  { id: 3, name: 'Alyssa Wong', level: 'P3', joined: '16 Oct 2026' },
  { id: 4, name: 'Ryan Ng', level: 'P5', joined: '15 Oct 2026' }
]
const recentReports = [
  { id: 1, type: 'Quiz', description: 'Inappropriate answer content', date: '17 Oct 2026' },
  { id: 2, type: 'Behaviour', description: 'Multiple failed quiz attempts', date: '16 Oct 2026' },
  { id: 3, type: 'Feedback', description: 'Student requested new topic', date: '15 Oct 2026' },
  { id: 4, type: 'Behaviour', description: 'Suspicious activity detected', date: '14 Oct 2026' }
]
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
                <div>
                  <h4>📋 Recent Reports and Feedback</h4>
                  <p>Latest student reports and feedback</p>
                </div>
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
  font-size: clamp(30px, 3vw, 42px);
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

.student-avatar {
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff0c1;
  margin-right: 6px;
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
</style>
